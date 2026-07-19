from fastapi import FastAPI, APIRouter, HTTPException, UploadFile, File, Request, Response, Header, Query, Form
from fastapi.responses import Response as FastAPIResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional
import uuid
import requests
from datetime import datetime, timezone, timedelta

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Config
EMERGENT_LLM_KEY = os.environ.get("EMERGENT_LLM_KEY", "")
APP_NAME = os.environ.get("APP_NAME", "kgbv-godda")
STORAGE_URL = "https://integrations.emergentagent.com/objstore/api/v1/storage"
AUTH_SESSION_URL = "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data"
ADMIN_ALLOWED_EMAILS = [e.strip() for e in os.environ.get("ADMIN_ALLOWED_EMAILS", "").split(",") if e.strip()]

app = FastAPI(title="KGBV Godda API")
api_router = APIRouter(prefix="/api")

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# ---------- Storage ----------
storage_key = None

def init_storage():
    global storage_key
    if storage_key:
        return storage_key
    resp = requests.post(f"{STORAGE_URL}/init", json={"emergent_key": EMERGENT_LLM_KEY}, timeout=30)
    resp.raise_for_status()
    storage_key = resp.json()["storage_key"]
    return storage_key

def put_object(path: str, data: bytes, content_type: str) -> dict:
    key = init_storage()
    resp = requests.put(
        f"{STORAGE_URL}/objects/{path}",
        headers={"X-Storage-Key": key, "Content-Type": content_type},
        data=data, timeout=120,
    )
    resp.raise_for_status()
    return resp.json()

def get_object(path: str):
    key = init_storage()
    resp = requests.get(
        f"{STORAGE_URL}/objects/{path}",
        headers={"X-Storage-Key": key}, timeout=60,
    )
    resp.raise_for_status()
    return resp.content, resp.headers.get("Content-Type", "application/octet-stream")

# ---------- Auth Helpers ----------
async def get_current_user(request: Request):
    token = request.cookies.get("session_token")
    if not token:
        auth = request.headers.get("Authorization", "")
        if auth.startswith("Bearer "):
            token = auth[7:]
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    session = await db.user_sessions.find_one({"session_token": token}, {"_id": 0})
    if not session:
        raise HTTPException(status_code=401, detail="Invalid session")
    expires_at = session["expires_at"]
    if isinstance(expires_at, str):
        expires_at = datetime.fromisoformat(expires_at)
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=401, detail="Session expired")
    user = await db.users.find_one({"user_id": session["user_id"]}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user

async def require_admin(request: Request):
    user = await get_current_user(request)
    # If ADMIN_ALLOWED_EMAILS is empty, first user becomes admin; otherwise check whitelist
    if ADMIN_ALLOWED_EMAILS:
        if user["email"] not in ADMIN_ALLOWED_EMAILS:
            raise HTTPException(status_code=403, detail="Admin access denied")
    if not user.get("is_admin", False):
        raise HTTPException(status_code=403, detail="Not an admin")
    return user

# ---------- Models ----------
class SessionRequest(BaseModel):
    session_id: str

class NoticeIn(BaseModel):
    title: str
    body: Optional[str] = ""
    priority: str = "normal"  # normal | urgent
    is_active: bool = True

class GalleryImageIn(BaseModel):
    title: str
    category: str  # Campus, Classrooms, Hostel, Library, Laboratory, Activities, Sports, Events, Educational Tours, Celebrations, Teachers, Students, Infrastructure
    image_url: str
    caption: Optional[str] = ""

class VideoIn(BaseModel):
    title: str
    youtube_id: str
    description: Optional[str] = ""
    category: Optional[str] = "General"

class DownloadIn(BaseModel):
    title: str
    file_url: str
    description: Optional[str] = ""
    category: Optional[str] = "General"

class TeacherIn(BaseModel):
    name: str
    role: str
    image_url: Optional[str] = ""
    bio: Optional[str] = ""

class ContactMessageIn(BaseModel):
    name: str
    email: EmailStr
    phone: Optional[str] = ""
    subject: Optional[str] = ""
    message: str

class SiteContentIn(BaseModel):
    key: str
    value: dict

# ---------- Auth Routes ----------
@api_router.post("/auth/session")
async def auth_session(payload: SessionRequest, response: Response):
    try:
        r = requests.get(AUTH_SESSION_URL, headers={"X-Session-ID": payload.session_id}, timeout=15)
        r.raise_for_status()
        data = r.json()
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid session_id: {e}")

    email = data.get("email")
    name = data.get("name")
    picture = data.get("picture")
    session_token = data.get("session_token")

    existing = await db.users.find_one({"email": email}, {"_id": 0})
    if existing:
        user_id = existing["user_id"]
        await db.users.update_one({"user_id": user_id}, {"$set": {"name": name, "picture": picture}})
        is_admin = existing.get("is_admin", False)
    else:
        user_id = f"user_{uuid.uuid4().hex[:12]}"
        # First user is auto-admin. Subsequent users only admin if in ADMIN_ALLOWED_EMAILS
        users_count = await db.users.count_documents({})
        is_admin = users_count == 0 or (ADMIN_ALLOWED_EMAILS and email in ADMIN_ALLOWED_EMAILS)
        await db.users.insert_one({
            "user_id": user_id,
            "email": email,
            "name": name,
            "picture": picture,
            "is_admin": bool(is_admin),
            "created_at": datetime.now(timezone.utc).isoformat(),
        })

    # Enforce admin whitelist after creation
    if ADMIN_ALLOWED_EMAILS and email in ADMIN_ALLOWED_EMAILS and not is_admin:
        await db.users.update_one({"user_id": user_id}, {"$set": {"is_admin": True}})
        is_admin = True

    expires_at = datetime.now(timezone.utc) + timedelta(days=7)
    await db.user_sessions.insert_one({
        "user_id": user_id,
        "session_token": session_token,
        "expires_at": expires_at.isoformat(),
        "created_at": datetime.now(timezone.utc).isoformat(),
    })

    response.set_cookie(
        key="session_token", value=session_token, max_age=7*24*60*60,
        httponly=True, secure=True, samesite="none", path="/",
    )
    return {"user_id": user_id, "email": email, "name": name, "picture": picture, "is_admin": bool(is_admin)}

@api_router.get("/auth/me")
async def auth_me(request: Request):
    user = await get_current_user(request)
    return user

@api_router.post("/auth/logout")
async def auth_logout(request: Request, response: Response):
    token = request.cookies.get("session_token") or ""
    if token:
        await db.user_sessions.delete_one({"session_token": token})
    response.delete_cookie("session_token", path="/", samesite="none", secure=True)
    return {"ok": True}

# ---------- Site Content ----------
@api_router.get("/site-content/{key}")
async def get_site_content(key: str):
    doc = await db.site_content.find_one({"key": key}, {"_id": 0})
    if not doc:
        return {"key": key, "value": None}
    return doc

@api_router.put("/site-content")
async def put_site_content(payload: SiteContentIn, request: Request):
    await require_admin(request)
    await db.site_content.update_one(
        {"key": payload.key},
        {"$set": {"key": payload.key, "value": payload.value, "updated_at": datetime.now(timezone.utc).isoformat()}},
        upsert=True,
    )
    return {"ok": True}

# ---------- Notices ----------
@api_router.get("/notices")
async def list_notices(active_only: bool = True):
    q = {"is_active": True} if active_only else {}
    items = await db.notices.find(q, {"_id": 0}).sort("created_at", -1).to_list(200)
    return items

@api_router.post("/notices")
async def create_notice(payload: NoticeIn, request: Request):
    await require_admin(request)
    doc = payload.model_dump()
    doc["id"] = str(uuid.uuid4())
    doc["created_at"] = datetime.now(timezone.utc).isoformat()
    await db.notices.insert_one(doc)
    doc.pop("_id", None)
    return doc

@api_router.delete("/notices/{notice_id}")
async def delete_notice(notice_id: str, request: Request):
    await require_admin(request)
    await db.notices.delete_one({"id": notice_id})
    return {"ok": True}

# ---------- Gallery ----------
@api_router.get("/gallery")
async def list_gallery(category: Optional[str] = None):
    q = {} if not category or category == "All" else {"category": category}
    items = await db.gallery.find(q, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return items

@api_router.post("/gallery")
async def add_gallery(payload: GalleryImageIn, request: Request):
    await require_admin(request)
    doc = payload.model_dump()
    doc["id"] = str(uuid.uuid4())
    doc["created_at"] = datetime.now(timezone.utc).isoformat()
    await db.gallery.insert_one(doc)
    doc.pop("_id", None)
    return doc

@api_router.delete("/gallery/{item_id}")
async def delete_gallery(item_id: str, request: Request):
    await require_admin(request)
    await db.gallery.delete_one({"id": item_id})
    return {"ok": True}

# ---------- Videos ----------
@api_router.get("/videos")
async def list_videos():
    items = await db.videos.find({}, {"_id": 0}).sort("created_at", -1).to_list(500)
    return items

@api_router.post("/videos")
async def add_video(payload: VideoIn, request: Request):
    await require_admin(request)
    doc = payload.model_dump()
    doc["id"] = str(uuid.uuid4())
    doc["created_at"] = datetime.now(timezone.utc).isoformat()
    await db.videos.insert_one(doc)
    doc.pop("_id", None)
    return doc

@api_router.delete("/videos/{item_id}")
async def delete_video(item_id: str, request: Request):
    await require_admin(request)
    await db.videos.delete_one({"id": item_id})
    return {"ok": True}

# ---------- Downloads ----------
@api_router.get("/downloads")
async def list_downloads():
    items = await db.downloads.find({}, {"_id": 0}).sort("created_at", -1).to_list(500)
    return items

@api_router.post("/downloads")
async def add_download(payload: DownloadIn, request: Request):
    await require_admin(request)
    doc = payload.model_dump()
    doc["id"] = str(uuid.uuid4())
    doc["created_at"] = datetime.now(timezone.utc).isoformat()
    await db.downloads.insert_one(doc)
    doc.pop("_id", None)
    return doc

@api_router.delete("/downloads/{item_id}")
async def delete_download(item_id: str, request: Request):
    await require_admin(request)
    await db.downloads.delete_one({"id": item_id})
    return {"ok": True}

# ---------- Teachers ----------
@api_router.get("/teachers")
async def list_teachers():
    items = await db.teachers.find({}, {"_id": 0}).sort("created_at", -1).to_list(200)
    return items

@api_router.post("/teachers")
async def add_teacher(payload: TeacherIn, request: Request):
    await require_admin(request)
    doc = payload.model_dump()
    doc["id"] = str(uuid.uuid4())
    doc["created_at"] = datetime.now(timezone.utc).isoformat()
    await db.teachers.insert_one(doc)
    doc.pop("_id", None)
    return doc

@api_router.delete("/teachers/{item_id}")
async def delete_teacher(item_id: str, request: Request):
    await require_admin(request)
    await db.teachers.delete_one({"id": item_id})
    return {"ok": True}

# ---------- Contact ----------
@api_router.post("/contact")
async def submit_contact(payload: ContactMessageIn):
    doc = payload.model_dump()
    doc["id"] = str(uuid.uuid4())
    doc["created_at"] = datetime.now(timezone.utc).isoformat()
    doc["read"] = False
    await db.contact_messages.insert_one(doc)
    return {"ok": True, "id": doc["id"]}

@api_router.get("/contact")
async def list_contact(request: Request):
    await require_admin(request)
    items = await db.contact_messages.find({}, {"_id": 0}).sort("created_at", -1).to_list(500)
    return items

# ---------- File Upload ----------
@api_router.post("/upload")
async def upload_file(request: Request, file: UploadFile = File(...)):
    await require_admin(request)
    ext = file.filename.split(".")[-1].lower() if "." in file.filename else "bin"
    file_id = str(uuid.uuid4())
    path = f"{APP_NAME}/uploads/{file_id}.{ext}"
    data = await file.read()
    result = put_object(path, data, file.content_type or "application/octet-stream")
    file_url = f"/api/files/{result['path']}"
    await db.files.insert_one({
        "id": file_id,
        "storage_path": result["path"],
        "original_filename": file.filename,
        "content_type": file.content_type,
        "size": result["size"],
        "is_deleted": False,
        "created_at": datetime.now(timezone.utc).isoformat(),
    })
    return {"id": file_id, "url": file_url, "storage_path": result["path"], "content_type": file.content_type}

@api_router.get("/files/{path:path}")
async def download_file(path: str):
    record = await db.files.find_one({"storage_path": path, "is_deleted": False}, {"_id": 0})
    if not record:
        raise HTTPException(status_code=404, detail="File not found")
    data, content_type = get_object(path)
    return FastAPIResponse(content=data, media_type=record.get("content_type") or content_type)

# ---------- Public stats ----------
@api_router.get("/stats")
async def stats():
    return {
        "students": 500,
        "teachers": 30,
        "classes": 7,
        "awards": 45,
    }

@api_router.get("/")
async def root():
    return {"message": "KGBV Godda API"}

# ---------- Seed ----------
async def seed():
    # Default site content
    defaults = {
        "hero": {
            "title": "कस्तूरबा गांधी बालिका विद्यालय, गोड्डा",
            "subtitle": "शिक्षा • संस्कार • आत्मनिर्भरता",
            "description": "ग्रामीण एवं वंचित वर्ग की बालिकाओं के लिए झारखंड शिक्षा विभाग द्वारा संचालित निःशुल्क आवासीय विद्यालय। कक्षा VI से XII तक की छात्राओं के लिए गुणवत्तापूर्ण शिक्षा, छात्रावास एवं सुरक्षित वातावरण।",
        },
        "about": {
            "heading": "हमारे विद्यालय के बारे में",
            "body": "कस्तूरबा गांधी बालिका विद्यालय (KGBV), गोड्डा एक पूर्ण आवासीय विद्यालय है जो झारखंड शिक्षा विभाग के अंतर्गत संचालित है। यहाँ केवल बालिकाओं को कक्षा VI से XII तक निःशुल्क गुणवत्तापूर्ण शिक्षा प्रदान की जाती है। विद्यालय बालिकाओं को शिक्षा, संस्कार, अनुशासन, सुरक्षा एवं आत्मनिर्भरता की दिशा में तैयार करता है।",
            "mission": "प्रत्येक बालिका को गुणवत्तापूर्ण शिक्षा एवं सुरक्षित वातावरण उपलब्ध कराना।",
            "vision": "बालिकाओं को आत्मनिर्भर, आत्मविश्वासी एवं सुसंस्कारित नागरिक बनाना।",
        },
        "principal": {
            "name": "श्रीमती आदर्श प्राचार्या",
            "message": "बालिका शिक्षा किसी भी समाज की प्रगति का आधार है। हमारा विद्यालय बालिकाओं को केवल पाठ्यक्रम की शिक्षा नहीं देता, बल्कि उन्हें आत्मनिर्भर, आत्मविश्वासी और सुसंस्कारित नागरिक बनाने का प्रयास करता है। हम शिक्षा, संस्कार एवं आत्मनिर्भरता के मूल मंत्र से जुड़े हुए हैं।",
            "photo_url": "https://images.pexels.com/photos/37586859/pexels-photo-37586859.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940",
        },
        "contact": {
            "email": "kgabvgodda@gmail.com",
            "phone": "",
            "address": "कस्तूरबा गांधी बालिका विद्यालय, गोड्डा, झारखंड",
            "youtube": "https://www.youtube.com/@kgbvgodda",
            "whatsapp": "",
            "map_lat": 24.795789,
            "map_lng": 87.299783,
        },
    }
    for k, v in defaults.items():
        exists = await db.site_content.find_one({"key": k})
        if not exists:
            await db.site_content.insert_one({"key": k, "value": v, "updated_at": datetime.now(timezone.utc).isoformat()})

    # Seed sample notices
    if await db.notices.count_documents({}) == 0:
        samples = [
            {"title": "सत्र 2025-26 के लिए प्रवेश प्रारंभ", "body": "कक्षा VI हेतु आवेदन आमंत्रित। अंतिम तिथि: 30 जून।", "priority": "urgent", "is_active": True},
            {"title": "वार्षिक खेल दिवस - 15 अगस्त", "body": "सभी छात्राओं की उपस्थिति अनिवार्य।", "priority": "normal", "is_active": True},
            {"title": "मासिक परीक्षा - अगस्त सप्ताह 3", "body": "समय-सारणी नोटिस बोर्ड पर देखें।", "priority": "normal", "is_active": True},
            {"title": "स्वच्छता अभियान - प्रत्येक शनिवार", "body": "पर्यावरण संरक्षण में सहयोग करें।", "priority": "normal", "is_active": True},
        ]
        for s in samples:
            s["id"] = str(uuid.uuid4())
            s["created_at"] = datetime.now(timezone.utc).isoformat()
            await db.notices.insert_one(s)

    # Seed sample gallery
    if await db.gallery.count_documents({}) == 0:
        images = [
            ("मुख्य परिसर", "Campus", "https://images.unsplash.com/photo-1709817243586-6ddd4e6822c1?crop=entropy&cs=srgb&fm=jpg&q=85"),
            ("आधुनिक कक्षा", "Classrooms", "https://images.unsplash.com/photo-1573894998033-c0cef4ed722b?crop=entropy&cs=srgb&fm=jpg&q=85"),
            ("पुस्तकालय", "Library", "https://images.pexels.com/photos/33745700/pexels-photo-33745700.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940"),
            ("विज्ञान शिक्षण", "Laboratory", "https://images.pexels.com/photos/35551010/pexels-photo-35551010.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940"),
            ("खेलकूद", "Sports", "https://images.unsplash.com/photo-1525088068454-ff2c453e50e9?crop=entropy&cs=srgb&fm=jpg&q=85"),
            ("बैडमिंटन", "Sports", "https://images.pexels.com/photos/7351720/pexels-photo-7351720.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940"),
            ("योग सत्र", "Activities", "https://images.pexels.com/photos/34058359/pexels-photo-34058359.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940"),
            ("अध्ययनशील छात्राएँ", "Students", "https://images.unsplash.com/flagged/photo-1574097656146-0b43b7660cb6?crop=entropy&cs=srgb&fm=jpg&q=85"),
        ]
        for t, c, u in images:
            await db.gallery.insert_one({
                "id": str(uuid.uuid4()), "title": t, "category": c, "image_url": u,
                "caption": "", "created_at": datetime.now(timezone.utc).isoformat(),
            })

    # Seed sample videos
    if await db.videos.count_documents({}) == 0:
        samples = [
            {"title": "विद्यालय परिचय", "youtube_id": "dQw4w9WgXcQ", "description": "KGBV Godda का परिचय।", "category": "About"},
        ]
        for s in samples:
            s["id"] = str(uuid.uuid4())
            s["created_at"] = datetime.now(timezone.utc).isoformat()
            await db.videos.insert_one(s)

app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def startup():
    try:
        init_storage()
        logger.info("Object storage initialized")
    except Exception as e:
        logger.warning(f"Storage init failed (will retry lazily): {e}")
    try:
        await seed()
        logger.info("Seed complete")
    except Exception as e:
        logger.error(f"Seed error: {e}")

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
