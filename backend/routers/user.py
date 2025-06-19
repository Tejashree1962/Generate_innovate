from fastapi import APIRouter, HTTPException, Request, Depends
from pydantic import BaseModel, EmailStr
from datetime import datetime, timedelta
import bcrypt
from pymongo import MongoClient
from jose import jwt, JWTError
from dotenv import load_dotenv
import os

# Load environment variables
load_dotenv()

# Connect to MongoDB
MONGODB_URI = os.getenv("MONGODB_URI")

client = MongoClient(MONGODB_URI)
db = client["mydatabase"]
users_collection = db["users"]

# JWT Config
SECRET_KEY = "defaultsecretkey"
ALGORITHM = "HS256"

# User Models
class UserRegister(BaseModel):
    username: str
    email: EmailStr
    password: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

# Router Initialization
router = APIRouter(prefix="/api/user", tags=["User"])

# Password Hashing Functions
def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return bcrypt.checkpw(plain_password.encode(), hashed_password.encode())

# JWT Token Generation
def create_access_token(email: str, expires_delta: timedelta):
    expire = datetime.utcnow() + expires_delta
    return jwt.encode({"sub": email, "exp": expire}, SECRET_KEY, algorithm=ALGORITHM)

# Get current user from token
def get_current_user(request: Request):
    token = request.headers.get("Authorization", "").replace("Bearer ", "")
    if not token:
        raise HTTPException(status_code=401, detail="Token missing")

    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email = payload.get("sub")
        if not email:
            raise HTTPException(status_code=401, detail="Invalid token")

        user = users_collection.find_one({"email": email})
        if not user:
            raise HTTPException(status_code=404, detail="User not found")

        return user
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

# Register User
@router.post("/register")
def register(user: UserRegister):
    existing_user = users_collection.find_one({"email": user.email})
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")

    hashed_password = hash_password(user.password)
    user_data = {
        "username": user.username,
        "email": user.email,
        "password": hashed_password,
        "credits": 10  # Initial credits
    }

    users_collection.insert_one(user_data)
    token = create_access_token(user.email, timedelta(hours=1))

    return {
        "access_token": token,
        "user": {
            "username": user.username,
            "email": user.email
        }
    }

# Login User
@router.post("/login")
def login(user: UserLogin):
    existing_user = users_collection.find_one({"email": user.email})
    if not existing_user or not verify_password(user.password, existing_user["password"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    token = create_access_token(user.email, timedelta(hours=1))
    return {
        "access_token": token,
        "user": {
            "username": existing_user["username"],
            "email": existing_user["email"]
        }
    }

# Get User Credits
@router.get("/credits")
def get_credits(user=Depends(get_current_user)):
    return {
        "success": True,
        "credits": user.get("credits", 0),
        "user": {
            "username": user["username"],
            "email": user["email"]
        }
    }