from fastapi import FastAPI, UploadFile, File, HTTPException, Body, Depends, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordRequestForm
from pydantic import BaseModel, EmailStr, ConfigDict
from typing import Optional, List, Dict, Any
from sqlalchemy.orm import Session
from datetime import timedelta
import uvicorn
import os
import uuid

from ml_service import MLService
from chat_service import ChatService
from database import get_db, engine, Base
from models import User, Dataset, Workflow, PipelineResult
from auth import (
    get_password_hash, 
    verify_password, 
    create_access_token, 
    get_current_user,
    ACCESS_TOKEN_EXPIRE_MINUTES
)

# Create database tables
Base.metadata.create_all(bind=engine)

app = FastAPI(title="NeuroFlow API", description="ML Pipeline Builder with Authentication")

# Allow CORS
# Configure Logging
import logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Allow CORS
# Read allowed origins from env
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
from supabase import create_client, Client

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY) if SUPABASE_URL and SUPABASE_KEY else None

# ==================== Pydantic Schemas ====================

class UserCreate(BaseModel):
    email: EmailStr
    username: str
    password: str

class UserResponse(BaseModel):
    id: int
    email: str
    username: Optional[str] = None
    
    model_config = ConfigDict(from_attributes=True)

class Token(BaseModel):
    access_token: str
    token_type: str

class PipelineRequest(BaseModel):
    file_id: str
    target_column: str
    scaler_type: str
    imputer_strategy: Optional[str] = 'mean'
    encoder_strategy: Optional[str] = 'onehot'
    test_size: float
    model_type: str
    workflow_id: Optional[int] = None
    workflow_snapshot: Optional[Dict[str, Any]] = None

class ChatRequest(BaseModel):
    workflow: Dict[str, Any]
    question: str
    sample_data: Optional[List[Dict[str, Any]]] = None

class WorkflowCreate(BaseModel):
    name: str
    nodes_json: List[Dict[str, Any]]
    edges_json: List[Dict[str, Any]]

class WorkflowResponse(BaseModel):
    id: int
    name: str
    nodes_json: List[Dict[str, Any]]
    edges_json: List[Dict[str, Any]]
    
    model_config = ConfigDict(from_attributes=True)


# ==================== Auth Endpoints ====================

@app.post("/auth/register", response_model=UserResponse)
def register(user: UserCreate, db: Session = Depends(get_db)):
    """Register a new user."""
    # Check if email exists
    db_user_email = db.query(User).filter(User.email == user.email).first()
    if db_user_email:
        raise HTTPException(status_code=400, detail="Email already registered")

    # Check if username exists
    db_user_username = db.query(User).filter(User.username == user.username).first()
    if db_user_username:
        raise HTTPException(status_code=400, detail="Username already taken")
    
    # Create new user
    hashed_password = get_password_hash(user.password)
    new_user = User(email=user.email, username=user.username, hashed_password=hashed_password)
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user


@app.post("/auth/login", response_model=Token)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    """Login and get access token."""
    user = db.query(User).filter(User.email == form_data.username).first()
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=401,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token = create_access_token(
        data={"sub": user.email},
        expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    return {"access_token": access_token, "token_type": "bearer"}


@app.get("/auth/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    """Get current user info."""
    return current_user


# ==================== Public Endpoints ====================

@app.get("/")
def read_root():
    return {"message": "Welcome to NeuroFlow API", "status": "running"}


# ==================== Protected Dataset Endpoints ====================

@app.post("/upload")
async def upload_file(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Upload a dataset file to Supabase Storage and save metadata."""
    if not supabase:
        raise HTTPException(status_code=500, detail="Supabase not configured")
        
    try:
        content = await file.read()
        
        # 1. Process with ML service to get preview (in memory)
        data = ml_service.load_data(content, file.filename)
        
        # 2. Upload to Supabase Storage
        file_path = f"{current_user.id}/{file.filename}"
        supabase.storage.from_("datasets").upload(
            file=content,
            path=file_path,
            file_options={"upsert": "true"}
        )
        
        # 3. Save to database
        dataset = Dataset(
            user_id=current_user.id,
            filename=file.filename,
            storage_path=file_path,
            columns=data.get("columns", []),
            shape={"rows": data.get("shape", [0, 0])[0], "cols": data.get("shape", [0, 0])[1]}
        )
        db.add(dataset)
        db.commit()
        db.refresh(dataset)
        
        # Return preview with dataset ID
        data["dataset_id"] = dataset.id
        return data
    except Exception as e:
        logger.error(f"Upload Error: {e}")
        raise HTTPException(status_code=400, detail=str(e))


@app.get("/datasets")
def get_datasets(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all datasets for the current user."""
    datasets = db.query(Dataset).filter(Dataset.user_id == current_user.id).all()
    return [
        {
            "id": d.id,
            "filename": d.filename,
            "columns": d.columns,
            "shape": d.shape,
            "created_at": d.created_at.isoformat() if d.created_at else None
        }
        for d in datasets
    ]


@app.delete("/datasets/{dataset_id}")
def delete_dataset(
    dataset_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a dataset."""
    dataset = db.query(Dataset).filter(
        Dataset.id == dataset_id, 
        Dataset.user_id == current_user.id
    ).first()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")
    
    # Delete from Supabase Storage
    if supabase:
        try:
            supabase.storage.from_("datasets").remove([dataset.storage_path])
        except Exception as e:
            logger.error(f"Storage Delete Error: {e}")

    db.delete(dataset)
    db.commit()
    db.delete(dataset)
    db.commit()
    return {"message": "Dataset deleted"}


# ==================== Analysis Endpoints ====================

class AnalyzeRequest(BaseModel):
    file_id: str

@app.post("/analyze")
async def analyze_dataset(
    request: AnalyzeRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Analyze dataset for histograms and correlations (protected)."""
    try:
        if not supabase:
             raise HTTPException(status_code=500, detail="Supabase not configured")

        # Fetch Dataset
        dataset = None
        try:
             dataset_id = int(request.file_id.strip())
             dataset = db.query(Dataset).filter(Dataset.id == dataset_id).first()
        except ValueError:
             pass
        
        if not dataset:
             dataset = db.query(Dataset).filter(Dataset.filename == request.file_id).first()

        if not dataset:
             raise HTTPException(status_code=404, detail="Dataset not found")

        # Download content
        try:
             res = supabase.storage.from_("datasets").download(dataset.storage_path)
             file_content = res
        except Exception:
             raise HTTPException(status_code=404, detail="File not found in storage")

        # Analyze
        analysis = ml_service.analyze_dataset(file_content, dataset.filename)
        return analysis

    except ValueError as e:
         raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
         logger.error(f"Analysis Error: {e}")
         raise HTTPException(status_code=500, detail=str(e))


# ==================== Protected Workflow Endpoints ====================

@app.get("/workflows", response_model=List[WorkflowResponse])
def get_workflows(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all workflows for the current user."""
    return db.query(Workflow).filter(Workflow.user_id == current_user.id).all()


@app.post("/workflows", response_model=WorkflowResponse)
def create_workflow(
    workflow: WorkflowCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Save a new workflow."""
    new_workflow = Workflow(
        user_id=current_user.id,
        name=workflow.name,
        nodes_json=workflow.nodes_json,
        edges_json=workflow.edges_json
    )
    db.add(new_workflow)
    db.commit()
    db.refresh(new_workflow)
    return new_workflow


@app.delete("/workflows/{workflow_id}")
def delete_workflow(
    workflow_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a workflow."""
    workflow = db.query(Workflow).filter(
        Workflow.id == workflow_id,
        Workflow.user_id == current_user.id
    ).first()
    if not workflow:
        raise HTTPException(status_code=404, detail="Workflow not found")
    
    db.delete(workflow)
    db.commit()
    return {"message": "Workflow deleted"}


# ==================== Protected Pipeline Endpoints ====================

@app.post("/run_pipeline")
async def run_pipeline(
    request: PipelineRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Run ML pipeline (protected)."""
    try:
        if not supabase:
            raise HTTPException(status_code=500, detail="Supabase not configured")

        # Delegate to MLService
        results = ml_service.run_pipeline(db, supabase, request, current_user.id)
        return results

    except ValueError as e:
         raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Pipeline Execution Error: {e}")
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/run_pipeline_batch")
async def run_pipeline_batch(
    requests: Dict[str, PipelineRequest],
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Run batch ML pipeline (protected)."""
    if not supabase:
        raise HTTPException(status_code=500, detail="Supabase not configured")

    batch_results = {}
    
    for result_node_id, request in requests.items():
        try:
            # Create fresh service instance for each node in batch to avoid state collision
            # OR refactor MLService to be stateless/per-request.
            # For now, using new instance is safer.
            service = MLService()
            
            results = service.run_pipeline(
                db=db, 
                supabase=supabase, 
                request=request, 
                user_id=current_user.id
            )
            batch_results[result_node_id] = results
            
        except Exception as e:
            logger.error(f"Error processing node {result_node_id}: {e}")
            batch_results[result_node_id] = {"error": str(e)}
    
    db.commit() # Commit all results at once after the loop
    return batch_results


@app.get("/history")
def get_history(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get pipeline execution history for the current user."""
    results = db.query(PipelineResult).filter(
        PipelineResult.user_id == current_user.id
    ).order_by(PipelineResult.created_at.desc()).all()
    
    return [
        {
            "id": r.id,
            "created_at": r.created_at.isoformat() if r.created_at else None,
            "workflow_id": r.workflow_id,
            "results_summary": r.results_json,  # We might want to summarize this if it's huge, but full JSON is fine for now
            "workflow_snapshot": r.workflow_snapshot
        }
        for r in results
    ]


@app.post("/chat")
async def chat_endpoint(
    request: ChatRequest,
    current_user: User = Depends(get_current_user)
):
    """Chat with AI about workflow (protected)."""
    try:
        response_data = chat_service.get_response(request.workflow, request.question, request.sample_data)
        return response_data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    uvicorn.run("app:app", host="0.0.0.0", port=8000, reload=True)
