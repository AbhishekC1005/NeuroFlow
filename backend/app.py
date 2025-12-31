from fastapi import FastAPI, UploadFile, File, HTTPException, Body, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordRequestForm
from pydantic import BaseModel, EmailStr
from typing import Optional, List, Dict, Any
from sqlalchemy.orm import Session
from datetime import timedelta
import uvicorn

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
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global service instances
ml_service = MLService()
chat_service = ChatService()


# ==================== Pydantic Schemas ====================

class UserCreate(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    id: int
    email: str
    
    class Config:
        from_attributes = True

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
    
    class Config:
        from_attributes = True


# ==================== Auth Endpoints ====================

@app.post("/auth/register", response_model=UserResponse)
def register(user: UserCreate, db: Session = Depends(get_db)):
    """Register a new user."""
    # Check if user exists
    db_user = db.query(User).filter(User.email == user.email).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Create new user
    hashed_password = get_password_hash(user.password)
    new_user = User(email=user.email, hashed_password=hashed_password)
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
    """Upload a dataset file (protected - requires authentication)."""
    try:
        content = await file.read()
        
        # Process with ML service to get preview
        data = ml_service.load_data(content, file.filename)
        
        # Save to database
        dataset = Dataset(
            user_id=current_user.id,
            filename=file.filename,
            file_data=content,
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
    
    db.delete(dataset)
    db.commit()
    return {"message": "Dataset deleted"}


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
        # 1. Load & Split
        ml_service.load_and_split(
            filename=request.file_id,
            target_column=request.target_column,
            test_size=request.test_size
        )
        
        # 2. Preprocess
        ml_service.apply_preprocessing(
            imputer_strategy=request.imputer_strategy,
            encoder_strategy=request.encoder_strategy,
            scaler_type=request.scaler_type
        )
        
        # 3. Train
        ml_service.train_model(request.model_type)
        
        # 4. Evaluate
        results = ml_service.evaluate()
        
        # Save results to database
        pipeline_result = PipelineResult(
            user_id=current_user.id,
            results_json=results
        )
        db.add(pipeline_result)
        db.commit()
        
        return results
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/run_pipeline_batch")
async def run_pipeline_batch(
    requests: Dict[str, PipelineRequest],
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Run batch ML pipeline (protected)."""
    batch_results = {}
    
    for result_node_id, request in requests.items():
        try:
            service = MLService()
            
            service.load_and_split(
                filename=request.file_id,
                target_column=request.target_column,
                test_size=request.test_size
            )
            
            service.apply_preprocessing(
                imputer_strategy=request.imputer_strategy,
                encoder_strategy=request.encoder_strategy,
                scaler_type=request.scaler_type
            )
            
            service.train_model(request.model_type)
            
            results = service.evaluate()
            batch_results[result_node_id] = results
            
            # Save each result
            pipeline_result = PipelineResult(
                user_id=current_user.id,
                results_json=results
            )
            db.add(pipeline_result)
            
        except Exception as e:
            print(f"Error processing node {result_node_id}: {e}")
            batch_results[result_node_id] = {"error": str(e)}
    
    db.commit()
    return batch_results


@app.post("/chat")
async def chat_endpoint(
    request: ChatRequest,
    current_user: User = Depends(get_current_user)
):
    """Chat with AI about workflow (protected)."""
    try:
        response = chat_service.get_response(request.workflow, request.question, request.sample_data)
        return {"response": response}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    uvicorn.run("app:app", host="0.0.0.0", port=8000, reload=True)
