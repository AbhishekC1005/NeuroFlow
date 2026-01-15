"""
NeuroFlow API - FastAPI Backend
Updated for MongoDB + Cloudinary
"""
from fastapi import FastAPI, UploadFile, File, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordRequestForm
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime, timedelta
from bson import ObjectId
import uvicorn
import os
import logging
import requests

import cloudinary
import cloudinary.uploader

from ml_service import MLService
from chat_service import ChatService
from database import users_collection, datasets_collection, workflows_collection, results_collection
from models import (
    UserCreate, UserResponse, Token, 
    PipelineRequest, ChatRequest, AnalyzeRequest,
    WorkflowCreate, WorkflowResponse
)
from auth import (
    get_password_hash, 
    verify_password, 
    create_access_token, 
    get_current_user,
    ACCESS_TOKEN_EXPIRE_MINUTES
)

# Configure Logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Configure Cloudinary
cloudinary.config(
    cloud_name=os.getenv("CLOUDINARY_CLOUD_NAME"),
    api_key=os.getenv("CLOUDINARY_API_KEY"),
    api_secret=os.getenv("CLOUDINARY_API_SECRET")
)

app = FastAPI(title="NeuroFlow API", description="ML Pipeline Builder with MongoDB + Cloudinary")

# Allow CORS
ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "http://localhost:5173,http://localhost:3000,http://localhost:5175").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global service instances
ml_service = MLService()
chat_service = ChatService()


# ==================== Helper Functions ====================

def serialize_doc(doc: dict) -> dict:
    """Convert MongoDB document to JSON-serializable dict."""
    if doc is None:
        return None
    doc["id"] = str(doc.pop("_id", ""))
    return doc


# ==================== Auth Endpoints ====================

@app.post("/auth/register", response_model=UserResponse)
def register(user: UserCreate):
    """Register a new user."""
    # Check if email exists
    if users_collection.find_one({"email": user.email}):
        raise HTTPException(status_code=400, detail="Email already registered")

    # Check if username exists
    if users_collection.find_one({"username": user.username}):
        raise HTTPException(status_code=400, detail="Username already taken")
    
    # Create new user
    hashed_password = get_password_hash(user.password)
    new_user = {
        "email": user.email,
        "username": user.username,
        "hashed_password": hashed_password,
        "created_at": datetime.utcnow()
    }
    result = users_collection.insert_one(new_user)
    new_user["id"] = str(result.inserted_id)
    
    return UserResponse(id=new_user["id"], email=new_user["email"], username=new_user["username"])


@app.post("/auth/login", response_model=Token)
def login(form_data: OAuth2PasswordRequestForm = Depends()):
    """Login and get access token."""
    user = users_collection.find_one({"email": form_data.username})
    if not user or not verify_password(form_data.password, user["hashed_password"]):
        raise HTTPException(
            status_code=401,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token = create_access_token(
        data={"sub": user["email"]},
        expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    return {"access_token": access_token, "token_type": "bearer"}


@app.get("/auth/me", response_model=UserResponse)
def get_me(current_user: dict = Depends(get_current_user)):
    """Get current user info."""
    return UserResponse(
        id=current_user["id"],
        email=current_user["email"],
        username=current_user.get("username")
    )


# ==================== Public Endpoints ====================

@app.get("/")
def read_root():
    return {"message": "Welcome to NeuroFlow API", "status": "running", "database": "MongoDB", "storage": "Cloudinary"}


# ==================== Protected Dataset Endpoints ====================

@app.post("/upload")
async def upload_file(
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user)
):
    """Upload a dataset file to Cloudinary and save metadata to MongoDB."""
    try:
        content = await file.read()
        
        # 1. Process with ML service to get preview (in memory)
        data = ml_service.load_data(content, file.filename)
        
        # 2. Upload to Cloudinary
        upload_result = cloudinary.uploader.upload(
            content,
            resource_type="raw",
            folder=f"neuroflow/{current_user['id']}",
            public_id=file.filename.rsplit('.', 1)[0],  # filename without extension
            overwrite=True
        )
        
        # 3. Save to MongoDB
        dataset = {
            "user_id": current_user["id"],
            "filename": file.filename,
            "cloudinary_url": upload_result["secure_url"],
            "cloudinary_public_id": upload_result["public_id"],
            "columns": data.get("columns", []),
            "shape": {"rows": data.get("shape", [0, 0])[0], "cols": data.get("shape", [0, 0])[1]},
            "created_at": datetime.utcnow()
        }
        result = datasets_collection.insert_one(dataset)
        
        # Return preview with dataset ID
        data["dataset_id"] = str(result.inserted_id)
        return data
        
    except Exception as e:
        logger.error(f"Upload Error: {e}")
        raise HTTPException(status_code=400, detail=str(e))


@app.get("/datasets")
def get_datasets(current_user: dict = Depends(get_current_user)):
    """Get all datasets for the current user."""
    datasets = datasets_collection.find({"user_id": current_user["id"]})
    return [
        {
            "id": str(d["_id"]),
            "filename": d["filename"],
            "columns": d.get("columns", []),
            "shape": d.get("shape", {}),
            "created_at": d["created_at"].isoformat() if d.get("created_at") else None
        }
        for d in datasets
    ]


@app.delete("/datasets/{dataset_id}")
def delete_dataset(
    dataset_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Delete a dataset from MongoDB and Cloudinary."""
    # Find dataset
    try:
        dataset = datasets_collection.find_one({
            "_id": ObjectId(dataset_id),
            "user_id": current_user["id"]
        })
    except:
        raise HTTPException(status_code=404, detail="Dataset not found")
    
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")
    
    # Delete from Cloudinary
    try:
        cloudinary.uploader.destroy(dataset["cloudinary_public_id"], resource_type="raw")
    except Exception as e:
        logger.error(f"Cloudinary Delete Error: {e}")

    # Delete from MongoDB
    datasets_collection.delete_one({"_id": ObjectId(dataset_id)})
    return {"message": "Dataset deleted"}


# ==================== Analysis Endpoints ====================

@app.post("/analyze")
async def analyze_dataset(
    request: AnalyzeRequest,
    current_user: dict = Depends(get_current_user)
):
    """Analyze dataset for histograms and correlations."""
    try:
        # Fetch Dataset from MongoDB
        dataset = None
        try:
            dataset = datasets_collection.find_one({"_id": ObjectId(request.file_id)})
        except:
            pass
        
        if not dataset:
            dataset = datasets_collection.find_one({"filename": request.file_id})

        if not dataset:
            raise HTTPException(status_code=404, detail="Dataset not found")

        # Download from Cloudinary
        try:
            response = requests.get(dataset["cloudinary_url"])
            file_content = response.content
        except Exception:
            raise HTTPException(status_code=404, detail="File not found in storage")

        # Analyze
        analysis = ml_service.analyze_dataset(file_content, dataset["filename"])
        return analysis

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Analysis Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ==================== Protected Workflow Endpoints ====================

@app.get("/workflows")
def get_workflows(current_user: dict = Depends(get_current_user)):
    """Get all workflows for the current user."""
    workflows = workflows_collection.find({"user_id": current_user["id"]})
    return [
        WorkflowResponse(
            id=str(w["_id"]),
            name=w["name"],
            nodes_json=w.get("nodes_json", []),
            edges_json=w.get("edges_json", [])
        )
        for w in workflows
    ]


@app.post("/workflows", response_model=WorkflowResponse)
def create_workflow(
    workflow: WorkflowCreate,
    current_user: dict = Depends(get_current_user)
):
    """Save a new workflow."""
    new_workflow = {
        "user_id": current_user["id"],
        "name": workflow.name,
        "nodes_json": workflow.nodes_json,
        "edges_json": workflow.edges_json,
        "created_at": datetime.utcnow()
    }
    result = workflows_collection.insert_one(new_workflow)
    
    return WorkflowResponse(
        id=str(result.inserted_id),
        name=workflow.name,
        nodes_json=workflow.nodes_json,
        edges_json=workflow.edges_json
    )


@app.delete("/workflows/{workflow_id}")
def delete_workflow(
    workflow_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Delete a workflow."""
    try:
        result = workflows_collection.delete_one({
            "_id": ObjectId(workflow_id),
            "user_id": current_user["id"]
        })
    except:
        raise HTTPException(status_code=404, detail="Workflow not found")
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Workflow not found")
    
    return {"message": "Workflow deleted"}


# ==================== Protected Pipeline Endpoints ====================

@app.post("/run_pipeline")
async def run_pipeline(
    request: PipelineRequest,
    current_user: dict = Depends(get_current_user)
):
    """Run ML pipeline."""
    try:
        results = ml_service.run_pipeline(request, current_user["id"])
        return results
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Pipeline Execution Error: {e}")
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/run_pipeline_batch")
async def run_pipeline_batch(
    requests: Dict[str, PipelineRequest],
    current_user: dict = Depends(get_current_user)
):
    """Run batch ML pipeline."""
    batch_results = {}
    
    for result_node_id, request in requests.items():
        try:
            service = MLService()
            results = service.run_pipeline(request, current_user["id"])
            batch_results[result_node_id] = results
        except Exception as e:
            logger.error(f"Error processing node {result_node_id}: {e}")
            batch_results[result_node_id] = {"error": str(e)}
    
    return batch_results


@app.get("/history")
def get_history(current_user: dict = Depends(get_current_user)):
    """Get pipeline execution history for the current user."""
    results = results_collection.find(
        {"user_id": current_user["id"]}
    ).sort("created_at", -1)
    
    return [
        {
            "id": str(r["_id"]),
            "created_at": r["created_at"].isoformat() if r.get("created_at") else None,
            "workflow_id": r.get("workflow_id"),
            "results_summary": r.get("results_json", {}),
            "workflow_snapshot": r.get("workflow_snapshot")
        }
        for r in results
    ]


@app.post("/chat")
async def chat_endpoint(
    request: ChatRequest,
    current_user: dict = Depends(get_current_user)
):
    """Chat with AI about workflow."""
    try:
        response_data = chat_service.get_response(request.workflow, request.question, request.sample_data)
        return response_data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    uvicorn.run("app:app", host="0.0.0.0", port=8000, reload=True)
