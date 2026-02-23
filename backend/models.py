"""
Pydantic models for MongoDB documents.
These replace SQLAlchemy ORM models.
"""
from pydantic import BaseModel, Field, EmailStr, ConfigDict
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone
from pydantic import BaseModel, Field, EmailStr, ConfigDict, field_validator
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
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

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
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

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
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
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
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

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

    # Split enhancements
    stratified: Optional[bool] = False
    random_state: Optional[int] = 42
    shuffle: Optional[bool] = True

    # Duplicate Removal Node
    duplicate_handling: Optional[str] = 'none'  # 'all', 'first', 'last', 'none'

    # Outlier Handling Node
    outlier_method: Optional[str] = 'none'  # 'iqr', 'zscore', 'none'
    outlier_action: Optional[str] = 'clip'  # 'clip', 'remove', 'none'

    # Feature Selection Node
    feature_selection_method: Optional[str] = 'none'  # 'variance', 'correlation', 'both', 'none'
    variance_threshold: Optional[float] = 0.01
    correlation_threshold: Optional[float] = 0.95

    # Cross-Validation Node
    cv_folds: Optional[int] = 0  # 0 = disabled, 3/5/10
    cv_stratified: Optional[bool] = True

    # PCA Node
    pca_components: Optional[int] = 0  # 0 = disabled

    # Feature Engineering Node
    feature_engineering_method: Optional[str] = 'none'  # 'polynomial', 'log', 'sqrt', 'none'
    polynomial_degree: Optional[int] = 2

    # Class Balancing Node
    class_balancing: Optional[str] = 'none'  # 'smote', 'oversample', 'undersample', 'class_weight', 'none'

    @field_validator('test_size')
    @classmethod
    def validate_test_size(cls, v: float) -> float:
        if not (0.0 < v < 1.0):
            raise ValueError('test_size must be between 0.0 and 1.0')
        return v


class ChatRequest(BaseModel):
    workflow: Dict[str, Any]
    question: str
    sample_data: Optional[List[Dict[str, Any]]] = None


class AnalyzeRequest(BaseModel):
    file_id: str
