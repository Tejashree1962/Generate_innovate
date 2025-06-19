import os
from pymongo import MongoClient
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Connect to MongoDB
MONGODB_URI = os.getenv("MONGODB_URI")

try:
    client = MongoClient(MONGODB_URI)
    db = client["mydatabase"]
    users_collection = db["users"]
    images_collection = db["images"]

    print("✅ Connected to MongoDB successfully!")  # Log connection success
except Exception as e:
    print(f"❌ MongoDB Connection Error: {e}")  # Print error message
