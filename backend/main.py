import os
from fastapi import FastAPI, HTTPException, Depends, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pymongo import MongoClient
from dotenv import load_dotenv
import torch
from diffusers import StableDiffusionPipeline
from datetime import datetime
from pydantic import BaseModel
from bson import ObjectId
from fastapi.responses import StreamingResponse
from io import BytesIO
import base64
from PIL import Image
import numpy as np
import cv2

from routers.user import get_current_user
from database import users_collection
from routers import user

# Load environment variables
load_dotenv()

# MongoDB Connection
MONGODB_URI = os.getenv("MONGODB_URI", "mongodb://localhost:27017")
DB_NAME = os.getenv("DB_NAME", "mydatabase")

try:
    client = MongoClient(MONGODB_URI)
    db = client[DB_NAME]
    users_collection = db["users"]
    images_collection = db["images"]
    print("✅ MongoDB connection successful!")
except Exception as e:
    print(f"❌ MongoDB connection failed: {e}")

# FastAPI App Initialization
app = FastAPI()

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Static files
STATIC_DIR = "static"
os.makedirs(STATIC_DIR, exist_ok=True)
app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")

# Include auth routes
app.include_router(user.router)

# Load Stable Diffusion model
device = "cuda" if torch.cuda.is_available() else "cpu"
torch_dtype = torch.bfloat16 if torch.cuda.is_available() else torch.float32

try:
    pipe = StableDiffusionPipeline.from_pretrained(
        "CompVis/stable-diffusion-v1-4",
        torch_dtype=torch_dtype
    )
    pipe.to(device)
    print("✅ Stable Diffusion Model Loaded Successfully!")
except Exception as e:
    print(f"❌ Error loading Stable Diffusion model: {e}")
    pipe = None

# --- Style Functions ---

def cartoonize_image(pil_image: Image.Image) -> Image.Image:
    img = np.array(pil_image.convert("RGB"))
    gray = cv2.cvtColor(img, cv2.COLOR_RGB2GRAY)
    gray = cv2.medianBlur(gray, 5)
    edges = cv2.adaptiveThreshold(
        gray, 255,
        cv2.ADAPTIVE_THRESH_MEAN_C,
        cv2.THRESH_BINARY, 9, 9
    )
    color = cv2.bilateralFilter(img, d=9, sigmaColor=300, sigmaSpace=300)
    cartoon = cv2.bitwise_and(color, color, mask=edges)
    return Image.fromarray(cartoon)

def sketch_image(pil_image: Image.Image) -> Image.Image:
    img = np.array(pil_image.convert("RGB"))
    gray = cv2.cvtColor(img, cv2.COLOR_RGB2GRAY)
    inv = 255 - gray
    blur = cv2.GaussianBlur(inv, (21, 21), 0)
    sketch = cv2.divide(gray, 255 - blur, scale=256)
    return Image.fromarray(sketch)

def oil_painting_image(pil_image: Image.Image) -> Image.Image:
    img = np.array(pil_image.convert("RGB"))
    if not hasattr(cv2, "xphoto"):
        raise RuntimeError("OpenCV xphoto module not available. Please install opencv-contrib-python.")
    oil = cv2.xphoto.oilPainting(img, 7, 1)
    return Image.fromarray(oil)

# --- Models ---

class ImageRequest(BaseModel):
    prompt: str

# --- Endpoints ---

@app.post("/generate-image")
def generate_image(request: ImageRequest, user=Depends(get_current_user)):
    if not pipe:
        raise HTTPException(status_code=500, detail="Stable Diffusion model not loaded")

    if user.get("credits", 0) <= 0:
        raise HTTPException(status_code=402, detail="You are out of credits. Please buy more.")

    try:
        image = pipe(request.prompt).images[0]
        buffered = BytesIO()
        image.save(buffered, format="PNG")
        image_binary = buffered.getvalue()

        insert_result = images_collection.insert_one({
            "user_email": user["email"],
            "prompt": request.prompt,
            "image_data": image_binary,
            "created_at": datetime.utcnow(),
            "styles": {}
        })

        users_collection.update_one({"email": user["email"]}, {"$inc": {"credits": -1}})

        image_base64 = base64.b64encode(image_binary).decode()

        return {
            "success": True,
            "message": "Image generated and stored in database.",
            "image_base64": image_base64,
            "image_id": str(insert_result.inserted_id)
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/apply-style")
def apply_style(
    image_id: str = Query(...),
    style: str = Query("cartoon"),
    user=Depends(get_current_user)
):
    image_doc = images_collection.find_one({"_id": ObjectId(image_id)})

    if not image_doc or image_doc["user_email"] != user["email"]:
        raise HTTPException(status_code=404, detail="Image not found or unauthorized")

    original_image_data = image_doc["image_data"]
    original_image = Image.open(BytesIO(original_image_data))

    if style == "cartoon":
        styled_img = cartoonize_image(original_image)
    elif style == "sketch":
        styled_img = sketch_image(original_image)
    elif style == "oil_painting":
        styled_img = oil_painting_image(original_image)
    else:
        raise HTTPException(status_code=400, detail="Invalid style selected")

    buffered = BytesIO()
    styled_img.save(buffered, format="PNG")
    styled_binary = buffered.getvalue()

    images_collection.update_one(
        {"_id": ObjectId(image_id)},
        {f"$set": {f"styles.{style}": styled_binary}}
    )

    styled_base64 = base64.b64encode(styled_binary).decode()
    return {
        "success": True,
        "styled_base64": styled_base64
    }

@app.get("/api/images/user")
def get_user_images(user=Depends(get_current_user)):
    try:
        user_images = images_collection.find({"user_email": user["email"]})
        images_list = []

        for img in user_images:
            base = {
                "id": str(img["_id"]),
                "prompt": img.get("prompt", ""),
                "image_base64": base64.b64encode(img["image_data"]).decode(),
                "type": "original"
            }
            images_list.append(base)

            styles = img.get("styles", {})
            for style_name, style_data in styles.items():
                images_list.append({
                    "id": str(img["_id"]) + f"_{style_name}",
                    "prompt": f"{img.get('prompt', '')} ({style_name})",
                    "image_base64": base64.b64encode(style_data).decode(),
                    "type": style_name
                })

        return {"success": True, "images": images_list}
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/api/images/{image_id}")
def delete_image(image_id: str, user=Depends(get_current_user)):
    try:
        result = images_collection.delete_one({"_id": ObjectId(image_id), "user_email": user["email"]})
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Image not found or unauthorized")
        return {"success": True, "message": "Image deleted successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/images/download/{image_id}")
def download_image(image_id: str, user=Depends(get_current_user)):
    try:
        image_doc = images_collection.find_one({"_id": ObjectId(image_id), "user_email": user["email"]})
        if not image_doc:
            raise HTTPException(status_code=404, detail="Image not found or unauthorized")

        image_data = image_doc["image_data"]
        return StreamingResponse(BytesIO(image_data), media_type="image/png")

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Health Check
@app.get("/health")
def health_check():
    try:
        client.server_info()
        return {"status": "Healthy", "db": "Connected"}
    except Exception:
        return {"status": "Unhealthy", "db": "Not Connected"}

# Root
@app.get("/")
def home():
    return {"message": "Stable Diffusion API running"}

