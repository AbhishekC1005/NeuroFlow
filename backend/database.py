"""
Database configuration for MongoDB connection using PyMongo.
"""
import os
import logging
from pymongo import MongoClient, ASCENDING, DESCENDING
from pymongo.errors import OperationFailure
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

MONGODB_URI = os.getenv("MONGODB_URI")

if not MONGODB_URI:
    raise ValueError("MONGODB_URI environment variable is not set")

# Create MongoDB client with connection pool tuning
client = MongoClient(
    MONGODB_URI,
    serverSelectionTimeoutMS=30000,
    connectTimeoutMS=30000,
    socketTimeoutMS=30000,
    retryWrites=True,
    w="majority",
    maxPoolSize=10,
    minPoolSize=2,
)

db = client.neuroflow  # Database name

# Collections
users_collection = db.users
datasets_collection = db.datasets
workflows_collection = db.workflows
workspaces_collection = db.workspaces

# Create indexes for better query performance (only run once)
try:
    users_collection.create_index("email", unique=True)
    users_collection.create_index("username", unique=True)
    datasets_collection.create_index([("user_id", ASCENDING), ("created_at", DESCENDING)])
    datasets_collection.create_index("filename")
    datasets_collection.create_index("is_sample")
    workflows_collection.create_index([("user_id", ASCENDING), ("created_at", DESCENDING)])
    workspaces_collection.create_index([("user_id", ASCENDING), ("updated_at", DESCENDING)])
except OperationFailure:
    pass  # Indexes already exist
except Exception as e:
    logger.warning(f"Index creation warning: {e}")
