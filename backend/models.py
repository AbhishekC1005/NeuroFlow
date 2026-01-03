"""
SQLAlchemy models for User, Dataset, Workflow, and PipelineResult.
"""
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text, LargeBinary, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base


class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    username = Column(String(50), unique=True, index=True, nullable=True) # Added username
    hashed_password = Column(String(255), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    datasets = relationship("Dataset", back_populates="owner", cascade="all, delete-orphan")
    workflows = relationship("Workflow", back_populates="owner", cascade="all, delete-orphan")
    pipeline_results = relationship("PipelineResult", back_populates="owner", cascade="all, delete-orphan")
    chat_memberships = relationship("ChatParticipant", back_populates="user", cascade="all, delete-orphan")
    messages = relationship("ChatMessage", back_populates="sender", cascade="all, delete-orphan")


class Dataset(Base):
    __tablename__ = "datasets"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    filename = Column(String(255), nullable=False)
    storage_path = Column(String(512), nullable=False)  # Path in Supabase Storage
    columns = Column(JSON)  # Store column names as JSON array
    shape = Column(JSON)  # Store shape as {"rows": x, "cols": y}
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationship
    owner = relationship("User", back_populates="datasets")


class Workflow(Base):
    __tablename__ = "workflows"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(255), nullable=False)
    nodes_json = Column(JSON)  # Store ReactFlow nodes
    edges_json = Column(JSON)  # Store ReactFlow edges
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationship
    owner = relationship("User", back_populates="workflows")


class PipelineResult(Base):
    __tablename__ = "pipeline_results"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    workflow_id = Column(Integer, ForeignKey("workflows.id", ondelete="SET NULL"), nullable=True)
    results_json = Column(JSON)  # Store ML results
    workflow_snapshot = Column(JSON, nullable=True) # Store exact workflow state
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationship
    owner = relationship("User", back_populates="pipeline_results")


# Chat Models

class ChatGroup(Base):
    __tablename__ = "chat_groups"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=True) # Null for direct messages
    is_group = Column(Integer, default=0) # 0 = DM, 1 = Group
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    participants = relationship("ChatParticipant", back_populates="group", cascade="all, delete-orphan")
    messages = relationship("ChatMessage", back_populates="group", cascade="all, delete-orphan")


class ChatParticipant(Base):
    __tablename__ = "chat_participants"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    group_id = Column(Integer, ForeignKey("chat_groups.id", ondelete="CASCADE"), nullable=False)
    joined_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    user = relationship("User", back_populates="chat_memberships")
    group = relationship("ChatGroup", back_populates="participants")


class ChatMessage(Base):
    __tablename__ = "chat_messages"

    id = Column(Integer, primary_key=True, index=True)
    group_id = Column(Integer, ForeignKey("chat_groups.id", ondelete="CASCADE"), nullable=False)
    sender_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    content = Column(Text, nullable=True)
    file_url = Column(Text, nullable=True)
    file_type = Column(String(50), nullable=True)
    file_name = Column(String(255), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    group = relationship("ChatGroup", back_populates="messages")
    sender = relationship("User", back_populates="messages")
