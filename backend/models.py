"""
Pydantic models for MongoDB documents.
These replace SQLAlchemy ORM models.
"""
from pydantic import BaseModel, Field, EmailStr, ConfigDict
from typing import Optional, List, Dict, Any
from datetime import datetime
from bson import ObjectId


class PyObjectId(str):
    """Custom type for MongoDB ObjectId."""
    @classmethod
    def __get_pydantic_core_schema__(cls, _source_type, _handler):
        from pydantic_core import core_schema
        return core_schema.str_schema()

    @classmethod
    def validate(cls, v):
        if not ObjectId.is_valid(v):
            raise ValueError("Invalid ObjectId")
        return str(v)


# ==================== User Models ====================

class UserCreate(BaseModel):
    email: EmailStr
    username: str
    password: str


class UserInDB(BaseModel):
    id: Optional[str] = Field(default=None, alias="_id")
    email: str
    username: str
    hashed_password: str
    created_at: datetime = Field(default_factory=datetime.utcnow)

    model_config = ConfigDict(
        populate_by_name=True,
        arbitrary_types_allowed=True,
        json_encoders={ObjectId: str}
    )


class UserResponse(BaseModel):
    id: str
    email: str
    username: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


# ==================== Dataset Models ====================

class DatasetInDB(BaseModel):
    id: Optional[str] = Field(default=None, alias="_id")
    user_id: str
    filename: str
    cloudinary_url: str
    cloudinary_public_id: str
    columns: List[str] = []
    shape: Dict[str, int] = {}
    created_at: datetime = Field(default_factory=datetime.utcnow)

    model_config = ConfigDict(
        populate_by_name=True,
        arbitrary_types_allowed=True,
        json_encoders={ObjectId: str}
    )


class DatasetResponse(BaseModel):
    id: str
    filename: str
    columns: List[str]
    shape: Dict[str, int]
    created_at: Optional[str] = None


# ==================== Workflow Models ====================

class WorkflowCreate(BaseModel):
    name: str
    nodes_json: List[Dict[str, Any]]
    edges_json: List[Dict[str, Any]]


class WorkflowInDB(BaseModel):
    id: Optional[str] = Field(default=None, alias="_id")
    user_id: str
    name: str
    nodes_json: List[Dict[str, Any]] = []
    edges_json: List[Dict[str, Any]] = []
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(
        populate_by_name=True,
        arbitrary_types_allowed=True,
        json_encoders={ObjectId: str}
    )


class WorkflowResponse(BaseModel):
    id: str
    name: str
    nodes_json: List[Dict[str, Any]]
    edges_json: List[Dict[str, Any]]

    model_config = ConfigDict(from_attributes=True)


# ==================== Pipeline Result Models ====================

class PipelineResultInDB(BaseModel):
    id: Optional[str] = Field(default=None, alias="_id")
    user_id: str
    workflow_id: Optional[str] = None
    results_json: Dict[str, Any] = {}
    workflow_snapshot: Optional[Dict[str, Any]] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

    model_config = ConfigDict(
        populate_by_name=True,
        arbitrary_types_allowed=True,
        json_encoders={ObjectId: str}
    )


# ==================== Request/Response Models ====================

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
    workflow_id: Optional[str] = None
    workflow_snapshot: Optional[Dict[str, Any]] = None


class ChatRequest(BaseModel):
    workflow: Dict[str, Any]
    question: str
    sample_data: Optional[List[Dict[str, Any]]] = None


class AnalyzeRequest(BaseModel):
    file_id: str
