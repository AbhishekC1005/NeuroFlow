"""
Database configuration for MongoDB connection using PyMongo.
"""
import os
import ssl
from pymongo import MongoClient
from dotenv import load_dotenv

load_dotenv()

MONGODB_URI = os.getenv("MONGODB_URI")

if not MONGODB_URI:
    raise ValueError("MONGODB_URI environment variable is not set")

# Create SSL context that doesn't verify certificates
# This is needed for some EC2 instances connecting to MongoDB Atlas
try:
    # Try connecting with SSL bypass for certificate verification
    client = MongoClient(
        MONGODB_URI,
        tls=True,
        tlsAllowInvalidCertificates=True,
        tlsAllowInvalidHostnames=True,
        serverSelectionTimeoutMS=30000,
        connectTimeoutMS=30000
    )
    # Test connection
    client.admin.command('ping')
except Exception as e:
    print(f"MongoDB connection error: {e}")
    # Fallback: try with completely disabled TLS (not recommended for production)
    try:
        client = MongoClient(
            MONGODB_URI.replace("mongodb+srv://", "mongodb://").replace(".mongodb.net/", ".mongodb.net:27017/"),
            tls=False,
            serverSelectionTimeoutMS=30000
        )
    except:
        raise ValueError(f"Could not connect to MongoDB: {e}")

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
