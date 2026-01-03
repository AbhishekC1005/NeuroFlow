from fastapi import FastAPI, UploadFile, File, HTTPException, Body, Depends, WebSocket, WebSocketDisconnect, Form
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
from models import User, Dataset, Workflow, PipelineResult, ChatMessage, ChatGroup, ChatParticipant
from encryption import encrypt_message, decrypt_message
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
    allow_origins=["*"],
    allow_credentials=False,
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
            "results_summary": r.results_json  # We might want to summarize this if it's huge, but full JSON is fine for now
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
        response = chat_service.get_response(request.workflow, request.question, request.sample_data)
        return {"response": response}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ==================== Chat Endpoints ====================
from chat_socket import ConnectionManager
from models import ChatGroup, ChatParticipant, ChatMessage

manager = ConnectionManager()

@app.websocket("/ws/chat/{user_id}")
async def websocket_endpoint(websocket: WebSocket, user_id: int, db: Session = Depends(get_db)):
    await manager.connect(websocket, user_id)
    try:
        while True:
            data = await websocket.receive_json()
            # Handle incoming messages (e.g., save to DB, broadcast)
            # Structure: { "type": "message", "group_id": int, "content": str, "recipient_id": int (optional for DM) }
            
            if data.get("type") == "message":
                group_id = data.get("group_id")
                content = data.get("content")
                
                # Get sender info
                sender = db.query(User).filter(User.id == user_id).first()
                sender_name = sender.username if sender else "Unknown"

                # Save to DB
                new_msg = ChatMessage(
                    group_id=group_id,
                    sender_id=user_id,
                    content=encrypt_message(content)
                )
                db.add(new_msg)
                db.commit()
                db.refresh(new_msg)
                
                # Broadcast
                message_payload = {
                    "type": "new_message",
                    "id": new_msg.id,
                    "group_id": group_id,
                    "sender_id": user_id,
                    "sender_name": sender_name,
                    "content": content,
                    "created_at": new_msg.created_at.isoformat()
                }
                
                # Logic to find recipients
                # For optimal performance, we should cache participants. 
                # For now, query DB.
                participants = db.query(ChatParticipant).filter(ChatParticipant.group_id == group_id).all()
                print(f"WS Broadcast msg {new_msg.id} to group {group_id}. P: {[p.user_id for p in participants]}")
                for p in participants:
                    if p.user_id != user_id:
                        print(f"WS Sending to {p.user_id}. Active? {p.user_id in manager.active_connections}")
                        await manager.send_personal_message(message_payload, p.user_id)
                
                # Echo back to sender (or handle optimistically in frontend)
                await manager.send_personal_message(message_payload, user_id)

    except WebSocketDisconnect:
        manager.disconnect(websocket, user_id)
    except Exception as e:
        logger.error(f"WebSocket Error: {e}")
        manager.disconnect(websocket, user_id)


class ChatCreate(BaseModel):
    recipient_username: str # For Direct Message

@app.post("/chat/create")
def create_chat(chat_data: ChatCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Create a new Direct Message chat."""
    recipient = db.query(User).filter(User.username == chat_data.recipient_username).first()
    if not recipient:
        raise HTTPException(status_code=404, detail="User not found")
    
    if recipient.id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot chat with yourself")

    # Check if DM already exists
    # Complex query: find group where both are participants and is_group=0
    # Simplified approach: Check strictly 2-person groups
    
    # Create new group
    new_group = ChatGroup(name=None, is_group=0)
    db.add(new_group)
    db.commit()
    db.refresh(new_group)
    
    # Add participants
    p1 = ChatParticipant(user_id=current_user.id, group_id=new_group.id)
    p2 = ChatParticipant(user_id=recipient.id, group_id=new_group.id)
    db.add_all([p1, p2])
    db.commit()
    
    return {"id": new_group.id, "name": recipient.username, "recipient_id": recipient.id}


class GroupCreate(BaseModel):
    name: str
    member_usernames: List[str]

@app.post("/chat/group/create")
def create_group(group_data: GroupCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Create a new Group Chat."""
    # Validate members
    members = []
    for username in group_data.member_usernames:
        user = db.query(User).filter(User.username == username).first()
        if user:
            members.append(user)
    
    # Create group
    new_group = ChatGroup(name=group_data.name, is_group=1)
    db.add(new_group)
    db.commit()
    db.refresh(new_group)
    
    # Add participants (creator + members)
    participants = [ChatParticipant(user_id=current_user.id, group_id=new_group.id)]
    for m in members:
        if m.id != current_user.id: # Avoid duplicate if creator lists themselves
            participants.append(ChatParticipant(user_id=m.id, group_id=new_group.id))
            
    db.add_all(participants)
    db.commit()
    
    return {"id": new_group.id, "name": new_group.name, "is_group": True}


@app.get("/chat/conversations")
def get_conversations(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Get all conversations for current user."""
    # Get all groups user is part of
    memberships = db.query(ChatParticipant).filter(ChatParticipant.user_id == current_user.id).all()
    group_ids = [m.group_id for m in memberships]
    
    groups = db.query(ChatGroup).filter(ChatGroup.id.in_(group_ids)).all()
    
    result = []
    for g in groups:
        # Determine name
        name = g.name
        recipient_username = None
        if not g.is_group:
            # Find the other participant
            other = db.query(ChatParticipant).filter(
                ChatParticipant.group_id == g.id, 
                ChatParticipant.user_id != current_user.id
            ).first()
            if other:
                 other_user = db.query(User).filter(User.id == other.user_id).first()
                 if other_user:
                     name = other_user.username
                     recipient_username = other_user.username
        
        # Get last message
        last_msg = db.query(ChatMessage).filter(ChatMessage.group_id == g.id).order_by(ChatMessage.created_at.desc()).first()
        
        last_content = None
        if last_msg:
            if last_msg.content:
                last_content = decrypt_message(last_msg.content)
            elif last_msg.file_name:
                last_content = f"📎 {last_msg.file_name}"
            else:
                last_content = "Attachment"

        result.append({
            "id": g.id,
            "name": name,
            "is_group": bool(g.is_group),
            "recipient_username": recipient_username,
            "last_message": last_content,
            "last_message_time": last_msg.created_at.isoformat() if last_msg else None
        })
    
    return result


@app.get("/chat/{group_id}/messages")
def get_messages(group_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Get messages for a group."""
    # Verify membership
    membership = db.query(ChatParticipant).filter(
        ChatParticipant.user_id == current_user.id, 
        ChatParticipant.group_id == group_id
    ).first()
    if not membership:
        raise HTTPException(status_code=403, detail="Not a member of this chat")
    
    # Check if group
    
    # Fetch messages with sender info
    results = db.query(ChatMessage, User.username).join(User, ChatMessage.sender_id == User.id).filter(ChatMessage.group_id == group_id).order_by(ChatMessage.created_at.asc()).all()
    
    return [
        {
            "id": m.ChatMessage.id,
            "sender_id": m.ChatMessage.sender_id,
            "sender_name": m.username,
            "content": decrypt_message(m.ChatMessage.content),
            "file_url": m.ChatMessage.file_url,
            "file_type": m.ChatMessage.file_type,
            "file_name": m.ChatMessage.file_name,
            "created_at": m.ChatMessage.created_at.isoformat()
        }
        for m in results
    ]

class AddMemberRequest(BaseModel):
    username: str

@app.post("/chat/{group_id}/add")
def group_add_member(group_id: int, request: AddMemberRequest, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Add a member to a group chat."""
    # Verify current user is member
    membership = db.query(ChatParticipant).filter(
        ChatParticipant.user_id == current_user.id, 
        ChatParticipant.group_id == group_id
    ).first()
    if not membership:
        raise HTTPException(status_code=403, detail="Not a member of this chat")
    
    group = db.query(ChatGroup).filter(ChatGroup.id == group_id).first()
    if not group or not group.is_group:
         raise HTTPException(status_code=400, detail="Not a valid group")

    # Find user to add
    new_member = db.query(User).filter(User.username == request.username).first()
    if not new_member:
        raise HTTPException(status_code=404, detail="User to add not found")

    # Check if already member
    exists = db.query(ChatParticipant).filter(
        ChatParticipant.user_id == new_member.id,
        ChatParticipant.group_id == group_id
    ).first()
    if exists:
        return {"message": "User already in group"}

    # Add member
    new_participant = ChatParticipant(user_id=new_member.id, group_id=group_id)
    db.add(new_participant)
    db.commit()

    return {"message": "Member added successfully", "user_id": new_member.id, "username": new_member.username}

@app.post("/chat/upload")
async def chat_upload_file(
    file: UploadFile = File(...),
    group_id: int = Form(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Upload a file to a chat."""
    # Verify membership
    membership = db.query(ChatParticipant).filter(
        ChatParticipant.user_id == current_user.id, 
        ChatParticipant.group_id == group_id
    ).first()
    if not membership:
        raise HTTPException(status_code=403, detail="Not a member of this chat")

    if not supabase:
        raise HTTPException(status_code=500, detail="Storage not configured")

    try:
        content = await file.read()
        file_ext = os.path.splitext(file.filename)[1]
        unique_filename = f"{uuid.uuid4()}{file_ext}"
        file_path = f"chat/{group_id}/{unique_filename}"
        
        # Upload to Supabase Storage (using 'datasets' bucket for now as shared storage, or check if 'chat-files' exists)
        # We'll use 'datasets' bucket but organize in chat/ folder.
        supabase.storage.from_("datasets").upload(
            file=content,
            path=file_path,
            file_options={"upsert": "true"}
        )
        
        # Get Signed URL (valid for 10 years to mimic public access for private buckets)
        try:
            res = supabase.storage.from_("datasets").create_signed_url(file_path, 315360000)
            if isinstance(res, dict) and "signedURL" in res:
                file_url = res["signedURL"]
            elif isinstance(res, str):
                file_url = res
            else:
                 # Helper might return object depending on version, try accessing attribute if possible or str
                 file_url = res.get("signedURL") if hasattr(res, "get") else str(res)
                 
            print(f"Generated File URL: {file_url}") # Debug log
        except Exception as e:
            print(f"Error generating signed URL: {e}")
            # Fallback to public URL logic if signed fails (unlikely)
            file_url = supabase.storage.from_("datasets").get_public_url(file_path)
        
        # Determine file type
        content_type = file.content_type
        if "image" in content_type:
            file_type = "image"
        elif "pdf" in content_type:
             file_type = "pdf"
        else:
            file_type = "file"

        # Create Message
        new_msg = ChatMessage(
            group_id=group_id,
            sender_id=current_user.id,
            content="", # Empty content for file-only message
            file_url=file_url,
            file_name=file.filename,
            file_type=file_type
        )
        db.add(new_msg)
        db.commit()
        db.refresh(new_msg)

        # Broadcast
        message_payload = {
            "type": "new_message",
            "id": new_msg.id,
            "group_id": group_id,
            "sender_id": current_user.id,
            "sender_name": current_user.username,
            "content": "",
            "file_url": file_url,
            "file_type": file_type,
            "file_name": file.filename,
            "created_at": new_msg.created_at.isoformat()
        }

        participants = db.query(ChatParticipant).filter(ChatParticipant.group_id == group_id).all()
        print(f"Broadcasting msg {new_msg.id} to group {group_id}. Participants: {[p.user_id for p in participants]}")
        for p in participants:
             print(f"Sending to {p.user_id}. Active? {p.user_id in manager.active_connections}")
             await manager.send_personal_message(message_payload, p.user_id)

        return message_payload

    except Exception as e:
        logger.error(f"Chat Upload Error: {e}")
        raise HTTPException(status_code=400, detail=str(e))


if __name__ == "__main__":
    uvicorn.run("app:app", host="0.0.0.0", port=8000, reload=True)
