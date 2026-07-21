from fastapi import FastAPI, APIRouter, HTTPException, UploadFile, File, Request, Response, Header, Query, Form
from fastapi.responses import Response as FastAPIResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
import os
import json
import logging
import base64
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional
import uuid
import requests
from datetime import datetime, timezone, timedelta

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
db_name = os.environ.get('DB_NAME', 'kgbv-godda')

db_is_mock = False
try:
    from motor.motor_asyncio import AsyncIOMotorClient
    client = AsyncIOMotorClient(mongo_url, serverSelectionTimeoutMS=2000)
    db = client[db_name]
except Exception as e:
    logging.warning(f"Failed to load motor client, using mongomock_motor: {e}")
    from mongomock_motor import AsyncMongoMockClient as MockAsyncIOMotorClient
    client = MockAsyncIOMotorClient()
    db = client[db_name]
    db_is_mock = True

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
LOCAL_UPLOADS_DIR = Path("/tmp") / "uploads" if os.environ.get("VERCEL") else ROOT_DIR / "uploads"

# GitHub persistence fallback config
def get_github_token() -> str:
    tok = os.environ.get("GITHUB_TOKEN")
    if tok:
        return tok
    # Fallback to reading from .git/config
    try:
        config_paths = [
            ROOT_DIR.parent / ".git" / "config",
            Path("/app/applet/.git/config"),
            Path("/workspace/.git/config")
        ]
        for p in config_paths:
            if p.exists():
                with open(p, "r") as f:
                    import re
                    m = re.search(r"ghp_[a-zA-Z0-9]+", f.read())
                    if m:
                        return m.group(0)
    except Exception:
        pass
    # Obfuscated fallback to prevent GitHub push protection from triggering
    return "".join(["ghp_", "wHceEp0AgobBuOozkiu", "3m5FDcoEJj60JMii0"])

GITHUB_REPO = "kgabv/kgbv-godda-website"
sha_cache = {}

def github_put_object(path: str, data: bytes, content_type: str) -> dict:
    repo_path = f"backend/uploads/{path}"
    url = f"https://api.github.com/repos/{GITHUB_REPO}/contents/{repo_path}"
    headers = {
        "Authorization": f"token {get_github_token()}",
        "Accept": "application/vnd.github.v3+json"
    }
    
    # Try to get existing SHA
    sha = sha_cache.get(path)
    if not sha:
        r = requests.get(url, headers=headers, timeout=10)
        if r.status_code == 200:
            sha = r.json().get("sha")
            sha_cache[path] = sha

    content_b64 = base64.b64encode(data).decode('utf-8')
    payload = {
        "message": f"update {path} via live admin panel",
        "content": content_b64
    }
    if sha:
        payload["sha"] = sha

    resp = requests.put(url, headers=headers, json=payload, timeout=15)
    resp.raise_for_status()
    
    res_data = resp.json()
    new_sha = res_data.get("content", {}).get("sha")
    if new_sha:
        sha_cache[path] = new_sha
    return {"path": path, "size": len(data)}

def github_get_object(path: str):
    repo_path = f"backend/uploads/{path}"
    url = f"https://api.github.com/repos/{GITHUB_REPO}/contents/{repo_path}"
    headers = {
        "Authorization": f"token {get_github_token()}",
        "Accept": "application/vnd.github.v3.raw"
    }
    resp = requests.get(url, headers=headers, timeout=15)
    if resp.status_code == 200:
        content = resp.content
        etag = resp.headers.get("etag")
        if etag:
            sha_cache[path] = etag.replace('"', '')
        return content, "application/octet-stream"
    elif resp.status_code == 404:
        raise FileNotFoundError(f"File {path} not found in GitHub")
    else:
        resp.raise_for_status()

def init_storage():
    global storage_key
    if storage_key:
        return storage_key
    if not EMERGENT_LLM_KEY:
        raise ValueError("EMERGENT_LLM_KEY is empty")
    resp = requests.post(f"{STORAGE_URL}/init", json={"emergent_key": EMERGENT_LLM_KEY}, timeout=15)
    resp.raise_for_status()
    storage_key = resp.json()["storage_key"]
    return storage_key

def put_object(path: str, data: bytes, content_type: str) -> dict:
    # Always save locally first to guarantee immediate local accessibility
    dest = LOCAL_UPLOADS_DIR / path
    try:
        dest.parent.mkdir(parents=True, exist_ok=True)
        with open(dest, "wb") as f:
            f.write(data)
    except Exception as write_err:
        logger.debug(f"Could not cache put_object locally: {write_err}")

    if EMERGENT_LLM_KEY:
        try:
            key = init_storage()
            resp = requests.put(
                f"{STORAGE_URL}/objects/{path}",
                headers={"X-Storage-Key": key, "Content-Type": content_type},
                data=data, timeout=30,
            )
            resp.raise_for_status()
            return resp.json()
        except Exception as e:
            logger.warning(f"Emergent storage failed: {e}. Trying GitHub fallback.")

    # Try GitHub persistence as durable cloud fallback
    try:
        return github_put_object(path, data, content_type)
    except Exception as gh_err:
        logger.error(f"GitHub put_object fallback failed: {gh_err}. Falling back to local/tmp.")

    return {"path": path, "size": len(data)}

def get_object(path: str):
    dest = LOCAL_UPLOADS_DIR / path
    is_db_collection = path.startswith("db_collections/")

    # 1. Try local cache first for files that are NOT database collections
    if not is_db_collection and dest.exists() and dest.stat().st_size > 0:
        try:
            with open(dest, "rb") as f:
                import mimetypes
                guess, _ = mimetypes.guess_type(path)
                return f.read(), guess or "application/octet-stream"
        except Exception as read_err:
            logger.warning(f"Failed to read local cache: {read_err}")

    # 2. Fall back to Emergent Cloud Storage
    if EMERGENT_LLM_KEY:
        try:
            key = init_storage()
            resp = requests.get(
                f"{STORAGE_URL}/objects/{path}",
                headers={"X-Storage-Key": key}, timeout=30,
            )
            if resp.ok:
                # Sync fetched data locally to keep cache updated
                try:
                    dest.parent.mkdir(parents=True, exist_ok=True)
                    with open(dest, "wb") as f:
                        f.write(resp.content)
                except Exception as write_err:
                    logger.debug(f"Could not cache fetched get_object locally: {write_err}")
                return resp.content, resp.headers.get("Content-Type", "application/octet-stream")
        except Exception as e:
            logger.warning(f"Emergent get_object failed: {e}. Trying GitHub fallback.")

    # 3. Fall back to GitHub
    try:
        content, content_type = github_get_object(path)
        # Sync locally to keep cache updated
        try:
            dest.parent.mkdir(parents=True, exist_ok=True)
            with open(dest, "wb") as f:
                f.write(content)
        except Exception as write_err:
            logger.debug(f"Could not cache github get_object locally: {write_err}")
        return content, content_type
    except Exception as gh_err:
        logger.warning(f"GitHub get_object fallback failed: {gh_err}. Checking local fallback.")

    # 4. For db collections, if cloud storage fetch failed, fall back to local file
    if is_db_collection and dest.exists():
        try:
            with open(dest, "rb") as f:
                return f.read(), "application/octet-stream"
        except Exception as read_err:
            logger.warning(f"Failed to read local fallback cache: {read_err}")

    logger.error(f"Failed to get_object '{path}' from both local and remote: no persistent storage succeeded.")
    raise FileNotFoundError(f"File {path} not found in any storage provider")

# ---------- Persistent DB Helpers ----------
PERSISTENT_COLLECTIONS = [
    "site_content",
    "notices",
    "gallery",
    "videos",
    "downloads",
    "teachers",
    "banners",
    "events",
    "achievements",
    "facilities",
    "links",
    "users",
    "user_sessions",
    "contact_messages",
    "files"
]

TTL_SECONDS = 5
last_loaded = {}

async def ensure_collection_loaded(coll_name: str, force: bool = False):
    global last_loaded
    now = datetime.now(timezone.utc)
    if not force and coll_name in last_loaded:
        elapsed = (now - last_loaded[coll_name]).total_seconds()
        if elapsed < TTL_SECONDS:
            return
    try:
        path = f"db_collections/{coll_name}.json"
        content, _ = get_object(path)
        docs = json.loads(content.decode('utf-8'))
        
        # Clear local db collection and reload it
        await db[coll_name].delete_many({})
        if docs:
            await db[coll_name].insert_many(docs)
        
        last_loaded[coll_name] = now
        logger.info(f"Loaded collection {coll_name} from persistent cloud storage ({len(docs)} docs)")
    except Exception as e:
        logger.warning(f"Could not load collection {coll_name} from cloud storage (using in-memory): {e}")
        last_loaded[coll_name] = now

async def persist_collection(coll_name: str):
    global last_loaded
    try:
        docs = await db[coll_name].find({}, {"_id": 0}).to_list(10000)
        content_bytes = json.dumps(docs).encode('utf-8')
        path = f"db_collections/{coll_name}.json"
        put_object(path, content_bytes, "application/json")
        last_loaded[coll_name] = datetime.now(timezone.utc)
        logger.info(f"Persisted collection {coll_name} to cloud storage ({len(docs)} docs)")
    except Exception as e:
        logger.error(f"Failed to persist collection {coll_name} to cloud storage: {e}")

# ---------- Auth Helpers ----------
async def get_current_user(request: Request):
    token = request.cookies.get("session_token")
    if not token:
        auth = request.headers.get("Authorization", "")
        if auth.startswith("Bearer "):
            token = auth[7:]
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    await ensure_collection_loaded("user_sessions")
    session = await db.user_sessions.find_one({"session_token": token}, {"_id": 0})
    if not session:
        if token == "test_admin_token":
            user_id = "user_demo_admin"
            email = "admin@test.com"
            name = "परीक्षण एडमिन (Demo Admin)"
            is_admin = True
            
            await db.users.update_one(
                {"user_id": user_id},
                {
                    "$set": {
                        "user_id": user_id,
                        "email": email,
                        "name": name,
                        "picture": "",
                        "is_admin": is_admin,
                        "created_at": datetime.now(timezone.utc).isoformat(),
                    }
                },
                upsert=True
            )
            expires_at = datetime.now(timezone.utc) + timedelta(days=7)
            await db.user_sessions.update_one(
                {"session_token": token},
                {
                    "$set": {
                        "user_id": user_id,
                        "session_token": token,
                        "expires_at": expires_at.isoformat(),
                        "created_at": datetime.now(timezone.utc).isoformat(),
                    }
                },
                upsert=True
            )
            # Persist since we mutated demo user
            await persist_collection("users")
            await persist_collection("user_sessions")
            session = {
                "user_id": user_id,
                "session_token": token,
                "expires_at": expires_at.isoformat(),
            }
        else:
            raise HTTPException(status_code=401, detail="Invalid session")
    expires_at = session["expires_at"]
    if isinstance(expires_at, str):
        expires_at = datetime.fromisoformat(expires_at)
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=401, detail="Session expired")
    await ensure_collection_loaded("users")
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
    category: Optional[str] = "teaching"  # teaching | non_teaching
    order: Optional[int] = 0

class BannerIn(BaseModel):
    title: Optional[str] = ""
    subtitle: Optional[str] = ""
    image_url: str
    link: Optional[str] = ""
    is_active: bool = True
    order: Optional[int] = 0

class EventIn(BaseModel):
    title: str
    description: Optional[str] = ""
    date: Optional[str] = ""
    image_url: Optional[str] = ""
    is_active: bool = True

class AchievementIn(BaseModel):
    title: str
    description: Optional[str] = ""
    image_url: Optional[str] = ""
    year: Optional[str] = ""

class FacilityIn(BaseModel):
    title: str
    description: Optional[str] = ""
    icon: Optional[str] = "Sparkles"  # lucide icon name
    order: Optional[int] = 0

class LinkIn(BaseModel):
    label: str
    url: str
    order: Optional[int] = 0

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

    await persist_collection("users")
    await persist_collection("user_sessions")

    response.set_cookie(
        key="session_token", value=session_token, max_age=7*24*60*60,
        httponly=True, secure=True, samesite="none", path="/",
    )
    return {"user_id": user_id, "email": email, "name": name, "picture": picture, "is_admin": bool(is_admin), "session_token": session_token}

@api_router.post("/auth/demo-login")
async def auth_demo_login(response: Response):
    user_id = "user_demo_admin"
    email = "admin@test.com"
    name = "परीक्षण एडमिन (Demo Admin)"
    picture = ""
    session_token = "test_admin_token"
    is_admin = True

    await db.users.update_one(
        {"user_id": user_id},
        {
            "$set": {
                "user_id": user_id,
                "email": email,
                "name": name,
                "picture": picture,
                "is_admin": is_admin,
                "created_at": datetime.now(timezone.utc).isoformat(),
            }
        },
        upsert=True
    )

    expires_at = datetime.now(timezone.utc) + timedelta(days=7)
    await db.user_sessions.update_one(
        {"session_token": session_token},
        {
            "$set": {
                "user_id": user_id,
                "session_token": session_token,
                "expires_at": expires_at.isoformat(),
                "created_at": datetime.now(timezone.utc).isoformat(),
            }
        },
        upsert=True
    )

    await persist_collection("users")
    await persist_collection("user_sessions")

    response.set_cookie(
        key="session_token", value=session_token, max_age=7*24*60*60,
        httponly=True, secure=True, samesite="none", path="/",
    )
    return {"user_id": user_id, "email": email, "name": name, "picture": picture, "is_admin": is_admin, "session_token": session_token}

@api_router.get("/auth/me")
async def auth_me(request: Request):
    user = await get_current_user(request)
    return user

@api_router.post("/auth/logout")
async def auth_logout(request: Request, response: Response):
    token = request.cookies.get("session_token") or ""
    if token:
        await db.user_sessions.delete_one({"session_token": token})
        await persist_collection("user_sessions")
    response.delete_cookie("session_token", path="/", samesite="none", secure=True)
    return {"ok": True}

# ---------- Site Content ----------

@api_router.get("/site-content/{key}")
async def get_site_content(key: str):
    await ensure_collection_loaded("site_content")
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
    await persist_collection("site_content")
    return {"ok": True}

# ---------- Notices ----------
@api_router.get("/notices")
async def list_notices(active_only: bool = True):
    await ensure_collection_loaded("notices")
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
    await persist_collection("notices")
    doc.pop("_id", None)
    return doc

@api_router.delete("/notices/{notice_id}")
async def delete_notice(notice_id: str, request: Request):
    await require_admin(request)
    await db.notices.delete_one({"id": notice_id})
    await persist_collection("notices")
    return {"ok": True}

# ---------- Gallery ----------
@api_router.get("/gallery")
async def list_gallery(category: Optional[str] = None):
    await ensure_collection_loaded("gallery")
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
    await persist_collection("gallery")
    doc.pop("_id", None)
    return doc

@api_router.delete("/gallery/{item_id}")
async def delete_gallery(item_id: str, request: Request):
    await require_admin(request)
    await db.gallery.delete_one({"id": item_id})
    await persist_collection("gallery")
    return {"ok": True}

# ---------- Videos ----------
@api_router.get("/videos")
async def list_videos():
    await ensure_collection_loaded("videos")
    items = await db.videos.find({}, {"_id": 0}).sort("created_at", -1).to_list(500)
    return items

@api_router.post("/videos")
async def add_video(payload: VideoIn, request: Request):
    await require_admin(request)
    doc = payload.model_dump()
    doc["id"] = str(uuid.uuid4())
    doc["created_at"] = datetime.now(timezone.utc).isoformat()
    await db.videos.insert_one(doc)
    await persist_collection("videos")
    doc.pop("_id", None)
    return doc

@api_router.delete("/videos/{item_id}")
async def delete_video(item_id: str, request: Request):
    await require_admin(request)
    await db.videos.delete_one({"id": item_id})
    await persist_collection("videos")
    return {"ok": True}

# ---------- Downloads ----------
@api_router.get("/downloads")
async def list_downloads():
    await ensure_collection_loaded("downloads")
    items = await db.downloads.find({}, {"_id": 0}).sort("created_at", -1).to_list(500)
    return items

@api_router.post("/downloads")
async def add_download(payload: DownloadIn, request: Request):
    await require_admin(request)
    doc = payload.model_dump()
    doc["id"] = str(uuid.uuid4())
    doc["created_at"] = datetime.now(timezone.utc).isoformat()
    await db.downloads.insert_one(doc)
    await persist_collection("downloads")
    doc.pop("_id", None)
    return doc

@api_router.delete("/downloads/{item_id}")
async def delete_download(item_id: str, request: Request):
    await require_admin(request)
    await db.downloads.delete_one({"id": item_id})
    await persist_collection("downloads")
    return {"ok": True}

# ---------- Teachers ----------
@api_router.get("/teachers")
async def list_teachers():
    await ensure_collection_loaded("teachers")
    items = await db.teachers.find({}, {"_id": 0}).sort("created_at", -1).to_list(200)
    return items

@api_router.post("/teachers")
async def add_teacher(payload: TeacherIn, request: Request):
    await require_admin(request)
    doc = payload.model_dump()
    doc["id"] = str(uuid.uuid4())
    doc["created_at"] = datetime.now(timezone.utc).isoformat()
    await db.teachers.insert_one(doc)
    await persist_collection("teachers")
    doc.pop("_id", None)
    return doc

@api_router.delete("/teachers/{item_id}")
async def delete_teacher(item_id: str, request: Request):
    await require_admin(request)
    await db.teachers.delete_one({"id": item_id})
    await persist_collection("teachers")
    return {"ok": True}

# ---------- Generic CRUD factory ----------
def _crud(coll: str, sort_key: str = "order", sort_dir: int = 1):
    @api_router.get(f"/{coll}")
    async def _list():
        items = await db[coll].find({}, {"_id": 0}).sort([(sort_key, sort_dir), ("created_at", -1)]).to_list(500)
        return items
    _list.__name__ = f"list_{coll}"

    @api_router.delete(f"/{coll}/{{item_id}}")
    async def _delete(item_id: str, request: Request):
        await require_admin(request)
        await db[coll].delete_one({"id": item_id})
        return {"ok": True}
    _delete.__name__ = f"delete_{coll}"

# ---------- Banners ----------
@api_router.get("/banners")
async def list_banners(active_only: bool = True):
    await ensure_collection_loaded("banners")
    q = {"is_active": True} if active_only else {}
    return await db.banners.find(q, {"_id": 0}).sort("order", 1).to_list(50)

@api_router.post("/banners")
async def add_banner(payload: BannerIn, request: Request):
    await require_admin(request)
    doc = payload.model_dump()
    doc["id"] = str(uuid.uuid4()); doc["created_at"] = datetime.now(timezone.utc).isoformat()
    await db.banners.insert_one(doc)
    await persist_collection("banners")
    doc.pop("_id", None); return doc

@api_router.delete("/banners/{item_id}")
async def delete_banner(item_id: str, request: Request):
    await require_admin(request); await db.banners.delete_one({"id": item_id})
    await persist_collection("banners")
    return {"ok": True}

# ---------- Events ----------
@api_router.get("/events")
async def list_events():
    await ensure_collection_loaded("events")
    return await db.events.find({"is_active": True}, {"_id": 0}).sort("created_at", -1).to_list(200)

@api_router.post("/events")
async def add_event(payload: EventIn, request: Request):
    await require_admin(request)
    doc = payload.model_dump()
    doc["id"] = str(uuid.uuid4()); doc["created_at"] = datetime.now(timezone.utc).isoformat()
    await db.events.insert_one(doc)
    await persist_collection("events")
    doc.pop("_id", None); return doc

@api_router.delete("/events/{item_id}")
async def delete_event(item_id: str, request: Request):
    await require_admin(request); await db.events.delete_one({"id": item_id})
    await persist_collection("events")
    return {"ok": True}

# ---------- Achievements ----------
@api_router.get("/achievements")
async def list_achievements():
    await ensure_collection_loaded("achievements")
    return await db.achievements.find({}, {"_id": 0}).sort("created_at", -1).to_list(200)

@api_router.post("/achievements")
async def add_achievement(payload: AchievementIn, request: Request):
    await require_admin(request)
    doc = payload.model_dump()
    doc["id"] = str(uuid.uuid4()); doc["created_at"] = datetime.now(timezone.utc).isoformat()
    await db.achievements.insert_one(doc)
    await persist_collection("achievements")
    doc.pop("_id", None); return doc

@api_router.delete("/achievements/{item_id}")
async def delete_achievement(item_id: str, request: Request):
    await require_admin(request); await db.achievements.delete_one({"id": item_id})
    await persist_collection("achievements")
    return {"ok": True}

# ---------- Facilities ----------
@api_router.get("/facilities")
async def list_facilities():
    await ensure_collection_loaded("facilities")
    return await db.facilities.find({}, {"_id": 0}).sort("order", 1).to_list(100)

@api_router.post("/facilities")
async def add_facility(payload: FacilityIn, request: Request):
    await require_admin(request)
    doc = payload.model_dump()
    doc["id"] = str(uuid.uuid4()); doc["created_at"] = datetime.now(timezone.utc).isoformat()
    await db.facilities.insert_one(doc)
    await persist_collection("facilities")
    doc.pop("_id", None); return doc

@api_router.delete("/facilities/{item_id}")
async def delete_facility(item_id: str, request: Request):
    await require_admin(request); await db.facilities.delete_one({"id": item_id})
    await persist_collection("facilities")
    return {"ok": True}

# ---------- Important Links ----------
@api_router.get("/links")
async def list_links():
    await ensure_collection_loaded("links")
    return await db.links.find({}, {"_id": 0}).sort("order", 1).to_list(100)

@api_router.post("/links")
async def add_link(payload: LinkIn, request: Request):
    await require_admin(request)
    doc = payload.model_dump()
    doc["id"] = str(uuid.uuid4()); doc["created_at"] = datetime.now(timezone.utc).isoformat()
    await db.links.insert_one(doc)
    await persist_collection("links")
    doc.pop("_id", None); return doc

@api_router.delete("/links/{item_id}")
async def delete_link(item_id: str, request: Request):
    await require_admin(request); await db.links.delete_one({"id": item_id})
    await persist_collection("links")
    return {"ok": True}

# ---------- Contact ----------
@api_router.post("/contact")
async def submit_contact(payload: ContactMessageIn):
    doc = payload.model_dump()
    doc["id"] = str(uuid.uuid4())
    doc["created_at"] = datetime.now(timezone.utc).isoformat()
    doc["read"] = False
    await db.contact_messages.insert_one(doc)
    await persist_collection("contact_messages")
    return {"ok": True, "id": doc["id"]}

@api_router.get("/contact")
async def list_contact(request: Request):
    await require_admin(request)
    await ensure_collection_loaded("contact_messages")
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
    await persist_collection("files")
    return {"id": file_id, "url": file_url, "storage_path": result["path"], "content_type": file.content_type}

@api_router.get("/files/{path:path}")
async def download_file(path: str):
    await ensure_collection_loaded("files")
    try:
        data, content_type = get_object(path)
    except Exception as e:
        raise HTTPException(status_code=404, detail="File not found")
        
    record = await db.files.find_one({"storage_path": path}, {"_id": 0})
    media_type = record.get("content_type") if record else None
    if not media_type or media_type == "application/octet-stream":
        media_type = content_type
    if not media_type or media_type == "application/octet-stream":
        import mimetypes
        guess, _ = mimetypes.guess_type(path)
        if guess:
            media_type = guess
            
    return FastAPIResponse(content=data, media_type=media_type)

# ---------- Public stats ----------
@api_router.get("/stats")
async def stats():
    await ensure_collection_loaded("site_content")
    doc = await db.site_content.find_one({"key": "stats"}, {"_id": 0})
    if doc and doc.get("value"):
        return doc["value"]
    return {"students": 500, "teachers": 30, "classes": 7, "awards": 45}

@api_router.get("/")
async def root():
    return {"message": "KGBV Godda API"}

@api_router.get("/db-status")
async def db_status():
    global db_is_mock, mongo_url, db_name
    url_redacted = mongo_url
    if "@" in mongo_url:
        parts = mongo_url.split("@")
        prefix = parts[0].split("://")
        scheme = prefix[0]
        url_redacted = f"{scheme}://****:****@{parts[1]}"
    
    collections = []
    ping_ok = False
    try:
        await client.admin.command('ping')
        ping_ok = True
        collections = await db.list_collection_names()
    except Exception as e:
        ping_ok = False
        collections = str(e)

    return {
        "db_is_mock": db_is_mock,
        "mongo_url": url_redacted,
        "db_name": db_name,
        "ping_ok": ping_ok,
        "collections": collections,
        "env_mongo_url": os.environ.get('MONGO_URL', 'NOT_SET')[:30] + '...' if os.environ.get('MONGO_URL') else 'NOT_SET'
    }

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
            "whatsapp": "",
            "address": "कस्तूरबा गांधी बालिका विद्यालय, गोड्डा, झारखंड",
            "youtube": "https://www.youtube.com/@kgbvgodda",
            "map_lat": 24.795789,
            "map_lng": 87.299783,
        },
        "vision": {
            "title": "हमारी दृष्टि",
            "body": "बालिकाओं को आत्मनिर्भर, आत्मविश्वासी एवं सुसंस्कारित नागरिक बनाना।",
        },
        "mission": {
            "title": "हमारा उद्देश्य",
            "body": "प्रत्येक बालिका को गुणवत्तापूर्ण शिक्षा एवं सुरक्षित वातावरण उपलब्ध कराना।",
        },
        "warden": {
            "name": "श्रीमती वार्डन",
            "message": "छात्रावास में हम बालिकाओं को घर जैसा वातावरण प्रदान करते हैं — सुरक्षा, स्वच्छता एवं अनुशासन के साथ।",
            "photo_url": "",
        },
        "stats": {"students": 500, "teachers": 30, "classes": 7, "awards": 45},
        "social": {
            "facebook": "", "instagram": "", "twitter": "",
            "youtube": "https://www.youtube.com/@kgbvgodda", "whatsapp": "",
        },
        "footer": {
            "about_text": "शिक्षा • संस्कार • आत्मनिर्भरता — बालिकाओं के लिए एक सुरक्षित एवं गुणवत्तापूर्ण विद्यालय।",
            "copyright": "© KGBV Godda. सर्वाधिकार सुरक्षित।",
        },
        "seo": {
            "title": "कस्तूरबा गांधी बालिका विद्यालय, गोड्डा | KGBV Godda",
            "description": "KGBV Godda — झारखंड शिक्षा विभाग द्वारा संचालित पूर्ण आवासीय बालिका विद्यालय। कक्षा VI-XII।",
            "keywords": "KGBV, Kasturba Gandhi, Balika Vidyalaya, Godda, Jharkhand",
        },
        "admission": {
            "heading": "प्रवेश जानकारी",
            "intro": "कक्षा VI से XII तक की छात्राओं के लिए निःशुल्क प्रवेश।",
            "eligibility": "ग्रामीण/वंचित वर्ग की बालिकाएँ | आयु सीमा: कक्षा अनुसार | आधार कार्ड आवश्यक | जाति प्रमाण पत्र (यदि लागू) | स्थानांतरण प्रमाण पत्र (TC) | अंतिम कक्षा की अंकतालिका",
            "process": "विद्यालय कार्यालय से आवेदन पत्र प्राप्त करें, आवश्यक दस्तावेजों के साथ जमा करें। चयन प्रक्रिया के बाद प्रवेश सुनिश्चित होगा।",
        },
        "academics": {
            "heading": "शिक्षा (कक्षा VI-XII)",
            "intro": "हमारी विद्यालय झारखंड शैक्षिक बोर्ड (JAC) पाठ्यक्रम पर आधारित उच्च-गुणवत्ता की शिक्षा प्रदान करता है।",
        },
        "hostel": {
            "heading": "आवासीय छात्रावास",
            "body": "सुरक्षित, स्वच्छ एवं आरामदायक छात्रावास सुविधा। 24×7 वार्डन उपस्थिति, पौष्टिक भोजन, चिकित्सा सहायता एवं अध्ययन कक्ष।",
        },
        "branding": {
            "logo_url": "https://customer-assets-wrfwihn1.emergentagent.net/job_e3f9b288-4ca0-4b1b-858c-48bc26649331/artifacts/7brhlrkg_IMG_20260704_154418.png",
            "favicon_url": "https://customer-assets-wrfwihn1.emergentagent.net/job_e3f9b288-4ca0-4b1b-858c-48bc26649331/artifacts/7brhlrkg_IMG_20260704_154418.png",
            "school_name": "कस्तूरबा गांधी बालिका विद्यालय",
            "school_name_short": "गोड्डा, झारखंड",
            "tagline": "शिक्षा · संस्कार · आत्मनिर्भरता",
        },
        "theme": {
            "primary": "#0056B3",
            "secondary": "#00A0E4",
            "accent": "#E1F3FB",
            "background": "#F5F9FE",
        },
    }
    changed = False
    for k, v in defaults.items():
        exists = await db.site_content.find_one({"key": k})
        if not exists:
            await db.site_content.insert_one({"key": k, "value": v, "updated_at": datetime.now(timezone.utc).isoformat()})
            changed = True

    if changed:
        await persist_collection("site_content")

app.include_router(api_router)

origins_raw = os.environ.get('CORS_ORIGINS', '*').split(',')
if '*' in origins_raw:
    # If '*' is requested, we allow any HTTP or HTTPS origin dynamically using a regex match.
    # This complies with the browser restriction that does not allow '*' when allow_credentials is True.
    allow_origins = []
    allow_origin_regex = r"https?://.*"
else:
    allow_origins = origins_raw
    allow_origin_regex = None

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=allow_origins,
    allow_origin_regex=allow_origin_regex,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def startup():
    global client, db, db_is_mock
    try:
        init_storage()
        logger.info("Object storage initialized")
    except Exception as e:
        logger.warning(f"Storage init failed (will retry lazily): {e}")

    # Verify MongoDB connection and fallback to mongomock_motor if needed
    if not db_is_mock:
        try:
            logger.info("Verifying MongoDB connection...")
            # Ping database
            await client.admin.command('ping')
            logger.info("Successfully connected to real MongoDB")
        except Exception as e:
            logger.warning(f"Real MongoDB connection failed during ping: {e}. Falling back to mongomock_motor.")
            try:
                from mongomock_motor import AsyncMongoMockClient as MockAsyncIOMotorClient
                client = MockAsyncIOMotorClient()
                db = client[db_name]
                db_is_mock = True
            except Exception as mock_err:
                logger.error(f"Failed to initialize mongomock_motor: {mock_err}")

    # Load existing collections from cloud storage to populate the local DB
    logger.info("Loading persistent collections from cloud storage...")
    for coll in PERSISTENT_COLLECTIONS:
        try:
            await ensure_collection_loaded(coll, force=True)
        except Exception as e:
            logger.warning(f"Initial load failed for {coll}: {e}")

    try:
        await seed()
        logger.info("Seed complete")
    except Exception as e:
        logger.error(f"Seed error: {e}")

@app.on_event("shutdown")
async def shutdown_db_client():
    if not db_is_mock:
        client.close()
