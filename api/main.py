import os
import uuid
from fastapi import FastAPI, UploadFile, File, Form
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from supabase import create_client
from dotenv import load_dotenv
import json
from datetime import datetime
import logging
from typing import Optional, List
from pydantic import BaseModel
import re
import unicodedata


# Load environment variables from .env file
load_dotenv()

# Load your environment variables (replace or use dotenv)
SUPABASE_URL = (os.getenv("SUPABASE_URL") or "").strip()
SUPABASE_KEY = (os.getenv("SUPABASE_SERVICE_KEY") or "").strip()
MEDIA_BUCKET = (os.getenv("SUPABASE_MEDIA_BUCKET") or "media").strip()
MANIFESTS_BUCKET = (os.getenv("SUPABASE_MANIFESTS_BUCKET") or "manifests").strip()

SUPABASE_INIT_ERROR: Optional[str] = None
supabase = None
try:
    if not SUPABASE_URL or not SUPABASE_KEY:
        SUPABASE_INIT_ERROR = "Missing SUPABASE_URL or SUPABASE_SERVICE_KEY env vars"
    else:
        supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
except Exception as e:
    SUPABASE_INIT_ERROR = f"Failed to create Supabase client: {e}"

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("poc.main")
if SUPABASE_INIT_ERROR:
    logger.error(SUPABASE_INIT_ERROR)


def sanitize_storage_key(original_name: str) -> str:
    """Sanitize filenames for Supabase Storage keys.
    - Normalize unicode to ASCII
    - Replace whitespace with underscores
    - Keep only [A-Za-z0-9._-]
    - Prevent leading dots
    - Trim to a reasonable length
    """
    name = original_name or "file"
    name = os.path.basename(name)
    name = unicodedata.normalize("NFKD", name).encode("ascii", "ignore").decode("ascii")
    name = re.sub(r"\s+", "_", name)
    name = re.sub(r"[^A-Za-z0-9._-]", "_", name)
    name = name.lstrip(".") or "file"
    if len(name) > 120:
        root, ext = os.path.splitext(name)
        name = (root[:100] + ext[:15]) if ext else root[:115]
    return name

# Pydantic models
class MediaItem(BaseModel):
    type: str
    url: str

class ManifestRequest(BaseModel):
    room: str
    version: int
    items: List[MediaItem]

# FastAPI app
app = FastAPI()


# Configure CORS for Vercel deployment
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000", 
        "http://127.0.0.1:3000",
        "https://*.vercel.app",  # Allow all Vercel domains
        "https://vercel.app",
        "*"  # Allow all origins for development - restrict this in production
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    return {"message": "TV Display Control Backend", "status": "running"}

@app.post("/upload")
async def upload_files(
    room: str = Form(...),
    files: List[UploadFile] = File(...)
):
    """
    Upload multiple files to Supabase Storage and return array of {type, url} objects.
    """
    if SUPABASE_INIT_ERROR or supabase is None:
        return JSONResponse({"error": f"Supabase not configured: {SUPABASE_INIT_ERROR}"}, status_code=500)

    if not room or not room.strip():
        return JSONResponse({"error": "Room ID is required"}, status_code=400)

    uploaded_items = []

    try:
        for file in files:
            # Read file data
            data = await file.read()
            
            # Generate unique filename
            safe_name = sanitize_storage_key(file.filename or "file")
            filename = f"{uuid.uuid4().hex}_{safe_name}"

            # Determine file type
            content_type = file.content_type or "application/octet-stream"
            file_type = "video" if content_type.startswith("video/") else "image"

            # Upload to Supabase Storage
            res = supabase.storage.from_(MEDIA_BUCKET).upload(
                path=filename,
                file=data,
                file_options={"content-type": content_type},
            )

            if res is None:
                return JSONResponse({"error": f"Upload failed for {file.filename}"}, status_code=500)

            # Generate public URL
            public_url = f"{SUPABASE_URL}/storage/v1/object/public/{MEDIA_BUCKET}/{filename}"

            uploaded_items.append({
                "type": file_type,
                "url": public_url
            })

    except Exception as e:
        logger.exception("Upload failed")
        return JSONResponse({"error": f"Upload failed: {str(e)}"}, status_code=500)

    return uploaded_items

@app.post("/save-manifest")
async def save_manifest(manifest: ManifestRequest):
    """
    Save manifest JSON to Supabase Storage as rooms/<room>/latest-manifest.json
    """
    if SUPABASE_INIT_ERROR or supabase is None:
        return JSONResponse({"error": f"Supabase not configured: {SUPABASE_INIT_ERROR}"}, status_code=500)

    if not manifest.room or not manifest.room.strip():
        return JSONResponse({"error": "Room ID is required"}, status_code=400)

    try:
        # Create manifest data
        manifest_data = {
            "version": manifest.version,
            "items": [item.dict() for item in manifest.items],
            "timestamp": datetime.utcnow().isoformat() + "Z"
        }

        # Convert to JSON bytes
        manifest_bytes = json.dumps(manifest_data, indent=2).encode("utf-8")
        
        # Save to manifests bucket
        manifest_path = f"rooms/{manifest.room}/latest-manifest.json"
        
        res = supabase.storage.from_(MANIFESTS_BUCKET).upload(
            path=manifest_path,
            file=manifest_bytes,
            file_options={
                "content-type": "application/json",
                "cache-control": "no-cache"
            }
        )

        if res is None:
            return JSONResponse({"error": "Failed to save manifest"}, status_code=500)

        public_url = f"{SUPABASE_URL}/storage/v1/object/public/{MANIFESTS_BUCKET}/{manifest_path}"

        return {
            "message": "Manifest saved successfully",
            "url": public_url,
            "version": manifest.version
        }

    except Exception as e:
        logger.exception("Save manifest failed")
        return JSONResponse({"error": f"Save manifest failed: {str(e)}"}, status_code=500)
