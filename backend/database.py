"""
Database configuration for MongoDB connection using PyMongo.
"""
import os
from pymongo import MongoClient
from dotenv import load_dotenv

load_dotenv()

MONGODB_URI = os.getenv("MONGODB_URI")

if not MONGODB_URI:
    raise ValueError("MONGODB_URI environment variable is not set")

# Create MongoDB client with proper settings for cloud connections
client = MongoClient(
    MONGODB_URI,
    serverSelectionTimeoutMS=30000,
    connectTimeoutMS=30000,
    socketTimeoutMS=30000,
    retryWrites=True,
    w="majority"
)

db = client.neuroflow  # Database name

# Collections (equivalent to tables)
users_collection = db.users
datasets_collection = db.datasets
workflows_collection = db.workflows
results_collection = db.pipeline_results

# Create indexes for better query performance (only run once)
try:
    users_collection.create_index("email", unique=True)
    users_collection.create_index("username", unique=True)
    datasets_collection.create_index("user_id")
    workflows_collection.create_index("user_id")
    results_collection.create_index("user_id")
except Exception:
    pass  # Indexes may already exist


def get_db():
    """
    Returns the database instance.
    For MongoDB, we don't need session management like SQLAlchemy.
    """
    return db
