import os
import uuid
from fastapi import FastAPI, UploadFile, File
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from supabase import create_client
from dotenv import load_dotenv
from fastapi.responses import StreamingResponse
import asyncio
import json
from datetime import datetime
from fastapi import Form
import logging
from typing import Optional
try:
    import httpx
except Exception:  # httpx might not be installed directly, guard import
    httpx = None
import re
import unicodedata


# Load environment variables from .env file
load_dotenv()

# Load your environment variables (replace or use dotenv)
SUPABASE_URL = (os.getenv("SUPABASE_URL") or "").strip()
SUPABASE_KEY = (os.getenv("SUPABASE_SERVICE_KEY") or "").strip()
BUCKET = (os.getenv("SUPABASE_BUCKET") or "media").strip()

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

# FastAPI app
app = FastAPI()


app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_methods=["*"],
    allow_headers=["*"],
)

event_queue: asyncio.Queue[str] = asyncio.Queue()

@app.get("/events")
async def sse_events():
    async def event_generator():
        while True:
            data = await event_queue.get()
            yield f"data: {data}\n\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream")


@app.post("/upload")
async def upload(file: UploadFile = File(...)):
    if SUPABASE_INIT_ERROR or supabase is None:
        return JSONResponse({"error": f"Supabase not configured: {SUPABASE_INIT_ERROR}"}, status_code=500)

    data = await file.read()
    safe_name = sanitize_storage_key(file.filename)
    filename = f"{uuid.uuid4().hex}_{safe_name}"

    try:
        res = supabase.storage.from_(BUCKET).upload(
            path=filename,
            file=data,
            file_options={"content-type": file.content_type or "application/octet-stream"},
        )
    except Exception as e:
        logger.exception("Upload failed")
        return JSONResponse({"error": f"Upload failed: {e}"}, status_code=500)

    if res is None:
        return JSONResponse({"error": "Upload failed"}, status_code=500)

    public_url = f"{SUPABASE_URL}/storage/v1/object/public/{BUCKET}/{filename}"

    # Notify the display page via SSE
    await event_queue.put(public_url)

    return {
        "message": "Uploaded successfully!",
        "filename": filename,
        "url": public_url,
        "content_type": file.content_type,
    }

@app.post("/upload-playlist")
async def upload_playlist(
    files: list[UploadFile] = File(...),
    durations: str = Form(...),
    loop: bool = Form(False),
):
    if SUPABASE_INIT_ERROR or supabase is None:
        return JSONResponse({"error": f"Supabase not configured: {SUPABASE_INIT_ERROR}"}, status_code=500)

    try:
        durations_list = json.loads(durations)
    except Exception:
        return JSONResponse(
            {"error": "Invalid 'durations' JSON. Provide an array of numbers in seconds."},
            status_code=400,
        )

    if not isinstance(durations_list, list) or len(durations_list) != len(files):
        return JSONResponse(
            {"error": "Number of durations must match number of files"},
            status_code=400,
        )

    public_urls: list[str] = []
    content_types: list[str] = []

    for file in files:
        data = await file.read()
        safe_name = sanitize_storage_key(file.filename)
        filename = f"{uuid.uuid4().hex}_{safe_name}"
        try:
            res = supabase.storage.from_(BUCKET).upload(
                path=filename,
                file=data,
                file_options={"content-type": file.content_type or "application/octet-stream"},
            )
        except Exception as e:
            logger.exception("Upload failed for %s", file.filename)
            return JSONResponse({"error": f"Upload failed for {file.filename}: {e}"}, status_code=500)

        if res is None:
            return JSONResponse(
                {"error": f"Upload failed for {file.filename}"}, status_code=500
            )
        public_url = f"{SUPABASE_URL}/storage/v1/object/public/{BUCKET}/{filename}"
        public_urls.append(public_url)
        content_types.append(file.content_type or "")

    playlist_items = []
    for i, url in enumerate(public_urls):
        try:
            duration_ms = int(float(durations_list[i]) * 1000)
        except Exception:
            duration_ms = 5000
        playlist_items.append(
            {
                "url": url,
                "durationMs": duration_ms,
                "contentType": content_types[i],
            }
        )

    playlist = {
        "items": playlist_items,
        "loop": bool(loop),
        "createdAt": datetime.utcnow().isoformat() + "Z",
    }

    playlist_bytes = json.dumps(playlist).encode("utf-8")
    playlist_filename = f"{uuid.uuid4().hex}_playlist.json"
    try:
        res = supabase.storage.from_(BUCKET).upload(
            path=playlist_filename,
            file=playlist_bytes,
            file_options={"content-type": "application/json"},
        )
    except Exception as e:
        logger.exception("Playlist upload failed")
        return JSONResponse({"error": f"Playlist upload failed: {e}"}, status_code=500)

    if res is None:
        return JSONResponse({"error": "Playlist upload failed"}, status_code=500)

    playlist_url = (
        f"{SUPABASE_URL}/storage/v1/object/public/{BUCKET}/{playlist_filename}"
    )

    await event_queue.put(playlist_url)

    return {
        "message": "Playlist uploaded successfully!",
        "playlist_url": playlist_url,
        "items": playlist_items,
    }
