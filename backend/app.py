"""
NeuroFlow API - FastAPI Backend
Updated for MongoDB + Cloudinary
"""
from fastapi import FastAPI, UploadFile, File, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordRequestForm
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime, timedelta, timezone
from bson import ObjectId
import uvicorn
import os
import logging
import requests
import numpy as np
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

import cloudinary
import cloudinary.uploader

from ml_service import MLService
from chat_service import ChatService
from database import users_collection, datasets_collection, workflows_collection, workspaces_collection
from pymongo.errors import DuplicateKeyError
from models import (
    UserCreate, UserResponse, Token,
    PipelineRequest, ChatRequest, AnalyzeRequest,
    WorkflowCreate, WorkflowResponse,
    WorkspaceCreate, WorkspaceUpdate, WorkspaceResponse, WorkspaceDetailResponse,
    PreviewUntilRequest,
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

# Allow CORS - Load from .env only
ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "http://localhost:5173").split(",")
# Clean up whitespace
ALLOWED_ORIGINS = [o.strip() for o in ALLOWED_ORIGINS if o.strip()]

logger.info(f"CORS Allowed Origins: {ALLOWED_ORIGINS}")

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global service instances
# ml_service = MLService() # REMOVED: Global instance causes race conditions
chat_service = ChatService()


# ==================== Helper Functions ====================

def serialize_doc(doc: dict) -> dict:
    """Convert MongoDB document to JSON-serializable dict."""
    if doc is None:
        return None
    doc["id"] = str(doc.pop("_id", ""))
    return doc


def convert_numpy_types(obj):
    """Recursively convert numpy types to native Python types for JSON serialization."""
    if isinstance(obj, dict):
        return {k: convert_numpy_types(v) for k, v in obj.items()}
    elif isinstance(obj, (list, tuple)):
        return [convert_numpy_types(item) for item in obj]
    elif isinstance(obj, (np.integer,)):
        return int(obj)
    elif isinstance(obj, (np.floating,)):
        return float(obj)
    elif isinstance(obj, (np.bool_,)):
        return bool(obj)
    elif isinstance(obj, np.ndarray):
        return obj.tolist()
    return obj


# ==================== Auth Endpoints ====================

@app.post("/auth/register", response_model=UserResponse)
def register(user: UserCreate):
    """Register a new user."""
    hashed_password = get_password_hash(user.password)
    new_user = {
        "email": user.email,
        "username": user.username,
        "hashed_password": hashed_password,
        "created_at": datetime.now(timezone.utc)
    }
    try:
        result = users_collection.insert_one(new_user)
    except DuplicateKeyError as e:
        key = str(e).lower()
        if "email" in key:
            raise HTTPException(status_code=400, detail="Email already registered")
        raise HTTPException(status_code=400, detail="Username already taken")
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
    return {"message": "Welcome to NeuroFlow API", "status": "running", "database": "MongoDB", "storage": "Cloudinary", "version": "1.0.1"}


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
        ml_service = MLService() # [FIX] New instance per request
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
            "created_at": datetime.now(timezone.utc)
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
    """Get all datasets for the current user including samples."""
    # Sort by filename (case-insensitive) for a unified list
    datasets = datasets_collection.find({
        "$or": [
            {"user_id": current_user["id"]},
            {"is_sample": True},
            {"user_id": "system"}
        ]
    }).sort("filename", 1)  # 1 = Ascending
    
    return [
        {
            "id": str(d["_id"]),
            "filename": d["filename"],
            "columns": d.get("columns", []),
            "shape": d.get("shape", {}),
            "created_at": d["created_at"].isoformat() if d.get("created_at") else None,
            "is_sample": d.get("is_sample", False) or d.get("user_id") == "system"
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
    except Exception as e:
        logger.error(f"Error finding dataset: {e}")
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
            dataset = datasets_collection.find_one({
                "_id": ObjectId(request.file_id),
                "$or": [
                    {"user_id": current_user["id"]},
                    {"is_sample": True},
                    {"user_id": "system"}
                ]
            })
        except Exception:
            pass
        
        if not dataset:
            # Fallback: Try by filename + user_id or system
            dataset = datasets_collection.find_one({
                "filename": request.file_id,
                "$or": [
                    {"user_id": current_user["id"]},
                    {"is_sample": True},
                    {"user_id": "system"}
                ]
            })
            
        if not dataset:
            raise HTTPException(status_code=404, detail="Dataset not found or unauthorized")

        # Download from Cloudinary
        try:
            response = requests.get(dataset["cloudinary_url"])
            file_content = response.content
        except Exception:
            raise HTTPException(status_code=404, detail="File not found in storage")

        # Analyze
        ml_service = MLService() # [FIX] New instance per request
        analysis = ml_service.analyze_dataset(file_content, dataset["filename"])
        return analysis

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Analysis Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ==================== Protected Workspace Endpoints ====================

@app.post("/workspaces", response_model=WorkspaceDetailResponse)
def create_workspace(
    workspace: WorkspaceCreate,
    current_user: dict = Depends(get_current_user)
):
    """Create a new workspace."""
    new_workspace = {
        "user_id": current_user["id"],
        "name": workspace.name,
        "nodes_json": [],
        "edges_json": [],
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc),
    }
    result = workspaces_collection.insert_one(new_workspace)
    return WorkspaceDetailResponse(
        id=str(result.inserted_id),
        name=workspace.name,
        nodes_json=[],
        edges_json=[],
        updated_at=new_workspace["updated_at"].isoformat(),
    )


@app.get("/workspaces")
def list_workspaces(current_user: dict = Depends(get_current_user)):
    """List all workspaces for current user (summary only)."""
    cursor = workspaces_collection.find(
        {"user_id": current_user["id"]}
    ).sort("updated_at", -1)
    return [
        WorkspaceResponse(
            id=str(w["_id"]),
            name=w.get("name", "Untitled"),
            node_count=len(w.get("nodes_json", [])),
            created_at=w["created_at"].isoformat() if w.get("created_at") else None,
            updated_at=w["updated_at"].isoformat() if w.get("updated_at") else None,
        )
        for w in cursor
    ]


@app.get("/workspaces/{workspace_id}", response_model=WorkspaceDetailResponse)
def get_workspace(
    workspace_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get full workspace by ID (owner only)."""
    try:
        ws = workspaces_collection.find_one({
            "_id": ObjectId(workspace_id),
            "user_id": current_user["id"]
        })
    except Exception:
        raise HTTPException(status_code=404, detail="Workspace not found")
    if not ws:
        raise HTTPException(status_code=404, detail="Workspace not found")
    return WorkspaceDetailResponse(
        id=str(ws["_id"]),
        name=ws.get("name", "Untitled"),
        nodes_json=ws.get("nodes_json", []),
        edges_json=ws.get("edges_json", []),
        updated_at=ws["updated_at"].isoformat() if ws.get("updated_at") else None,
    )


@app.put("/workspaces/{workspace_id}")
def update_workspace(
    workspace_id: str,
    update: WorkspaceUpdate,
    current_user: dict = Depends(get_current_user)
):
    """Auto-save workspace (debounced from frontend)."""
    update_fields: dict = {"updated_at": datetime.now(timezone.utc)}
    if update.name is not None:
        update_fields["name"] = update.name
    if update.nodes_json is not None:
        update_fields["nodes_json"] = update.nodes_json
    if update.edges_json is not None:
        update_fields["edges_json"] = update.edges_json

    try:
        result = workspaces_collection.update_one(
            {"_id": ObjectId(workspace_id), "user_id": current_user["id"]},
            {"$set": update_fields}
        )
    except Exception:
        raise HTTPException(status_code=404, detail="Workspace not found")
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Workspace not found")
    return {"message": "Workspace saved"}


@app.delete("/workspaces/{workspace_id}")
def delete_workspace(
    workspace_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Delete a workspace (owner only)."""
    try:
        result = workspaces_collection.delete_one({
            "_id": ObjectId(workspace_id),
            "user_id": current_user["id"]
        })
    except Exception:
        raise HTTPException(status_code=404, detail="Workspace not found")
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Workspace not found")
    return {"message": "Workspace deleted"}


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
        "created_at": datetime.now(timezone.utc)
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
    except Exception as e:
        logger.error(f"Error deleting workflow: {e}")
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
        ml_service = MLService() # [FIX] New instance per request
        results = ml_service.run_pipeline(request, current_user["id"])
        return convert_numpy_types(results)
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
            # Ownership check handled inside ml_service.run_pipeline now
            service = MLService()
            results = service.run_pipeline(request, current_user["id"])
            batch_results[result_node_id] = convert_numpy_types(results)
        except Exception as e:
            logger.error(f"Error processing node {result_node_id}: {e}")
            batch_results[result_node_id] = {"error": str(e)}
    
    return batch_results





# ==================== ViewDataset: Preview Until Endpoint ====================

@app.post("/preview_until")
async def preview_until(
    request: PreviewUntilRequest,
    current_user: dict = Depends(get_current_user)
):
    """Run pipeline steps up to a ViewDataset node and return the full data snapshot."""
    try:
        # Fetch dataset
        dataset = None
        try:
            dataset = datasets_collection.find_one({
                "_id": ObjectId(request.file_id),
                "$or": [
                    {"user_id": current_user["id"]},
                    {"is_sample": True},
                    {"user_id": "system"}
                ]
            })
        except Exception:
            pass

        if not dataset:
            dataset = datasets_collection.find_one({
                "filename": request.file_id,
                "$or": [
                    {"user_id": current_user["id"]},
                    {"is_sample": True},
                    {"user_id": "system"}
                ]
            })

        if not dataset:
            raise HTTPException(status_code=404, detail="Dataset not found")

        # Download file
        try:
            response = requests.get(dataset["cloudinary_url"])
            file_content = response.content
        except Exception:
            raise HTTPException(status_code=404, detail="File not found in storage")

        ml_service = MLService()
        result = ml_service.preview_until(
            file_content=file_content,
            filename=dataset["filename"],
            active_steps=request.active_steps or [],
            duplicate_handling=request.duplicate_handling or 'none',
            outlier_method=request.outlier_method or 'none',
            outlier_action=request.outlier_action or 'clip',
            imputer_strategy=request.imputer_strategy or 'none',
            encoder_strategy=request.encoder_strategy or 'none',
            scaler_type=request.scaler_type or 'None',
            feature_selection_method=request.feature_selection_method or 'none',
            variance_threshold=request.variance_threshold or 0.01,
            correlation_threshold=request.correlation_threshold or 0.95,
            max_rows=request.max_rows or 500,
        )
        return convert_numpy_types(result)

    except HTTPException:
        raise
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Preview Until Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


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


@app.post("/chat/stream")
async def chat_stream_endpoint(
    request: ChatRequest,
    current_user: dict = Depends(get_current_user)
):
    """Stream chat response as NDJSON."""
    return StreamingResponse(
        chat_service.get_response_stream(request.workflow, request.question, request.sample_data),
        media_type="application/x-ndjson"
    )


if __name__ == "__main__":
    uvicorn.run("app:app", host="0.0.0.0", port=8000, reload=True)
