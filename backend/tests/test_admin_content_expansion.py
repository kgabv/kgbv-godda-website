"""Backend tests for admin panel content expansion (theme, banners, events,
achievements, facilities, links, teachers, all site_content sections, stats).
Uses direct MongoDB session insertion for admin auth (pattern from test_credentials.md).
"""

import os
import uuid
import pytest
import requests
from datetime import datetime, timezone, timedelta
from pymongo import MongoClient

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://kasturba-gandhi.preview.emergentagent.com").rstrip("/")
MONGO_URL = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.environ.get("DB_NAME", "test_database")

# Load backend env if envs above are missing (pytest run from /app)
try:
    from dotenv import load_dotenv
    load_dotenv("/app/backend/.env")
    MONGO_URL = os.environ.get("MONGO_URL", MONGO_URL)
    DB_NAME = os.environ.get("DB_NAME", DB_NAME)
except Exception:
    pass


# ---------- Fixtures ----------
@pytest.fixture(scope="session")
def mongo_db():
    c = MongoClient(MONGO_URL)
    yield c[DB_NAME]
    c.close()


@pytest.fixture(scope="session")
def admin_session(mongo_db):
    """Insert an admin user + session directly into MongoDB and return the token."""
    token = f"testadm_{uuid.uuid4().hex}"
    user_id = f"user_test_{uuid.uuid4().hex[:8]}"
    mongo_db.users.insert_one({
        "user_id": user_id,
        "email": f"admintest_{user_id}@test.local",
        "name": "Test Admin",
        "picture": "",
        "is_admin": True,
        "created_at": datetime.now(timezone.utc).isoformat(),
    })
    mongo_db.user_sessions.insert_one({
        "user_id": user_id,
        "session_token": token,
        "expires_at": (datetime.now(timezone.utc) + timedelta(days=1)).isoformat(),
        "created_at": datetime.now(timezone.utc).isoformat(),
    })
    yield {"token": token, "user_id": user_id}
    # cleanup
    mongo_db.user_sessions.delete_many({"session_token": token})
    mongo_db.users.delete_many({"user_id": user_id})


@pytest.fixture
def admin_client(admin_session):
    s = requests.Session()
    s.headers.update({
        "Content-Type": "application/json",
        "Authorization": f"Bearer {admin_session['token']}",
    })
    return s


@pytest.fixture
def anon_client():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


# ---------- 1) Public site_content defaults ----------
class TestSiteContentDefaults:
    @pytest.mark.parametrize("key,expected_fields", [
        ("theme", ["primary", "secondary", "accent", "background"]),
        ("branding", ["logo_url", "school_name", "tagline"]),
        ("vision", ["title", "body"]),
        ("mission", ["title", "body"]),
        ("warden", ["name", "message"]),
        ("stats", ["students", "teachers", "classes", "awards"]),
        ("social", ["facebook", "instagram", "twitter", "youtube"]),
        ("footer", ["about_text", "copyright"]),
        ("seo", ["title", "description", "keywords"]),
        ("admission", ["heading", "intro", "eligibility", "process"]),
        ("academics", ["heading", "intro"]),
        ("hostel", ["heading", "body"]),
        ("hero", ["title", "subtitle", "description"]),
        ("about", ["heading", "body"]),
        ("principal", ["name", "message"]),
        ("contact", ["email", "address"]),
    ])
    def test_get_site_content_key(self, anon_client, key, expected_fields):
        r = anon_client.get(f"{BASE_URL}/api/site-content/{key}")
        assert r.status_code == 200, f"{key}: {r.status_code} {r.text[:200]}"
        body = r.json()
        assert body.get("key") == key
        val = body.get("value") or {}
        assert isinstance(val, dict), f"{key} value not dict: {val}"
        for f in expected_fields:
            assert f in val, f"{key} missing field {f}. Got: {list(val.keys())}"

    def test_theme_defaults(self, anon_client):
        r = anon_client.get(f"{BASE_URL}/api/site-content/theme")
        assert r.status_code == 200
        v = r.json()["value"]
        assert v["primary"] == "#0056B3"
        assert v["secondary"] == "#00A0E4"
        assert v["accent"] == "#E1F3FB"
        assert v["background"] == "#F5F9FE"


# ---------- 2) New collections GET (public) return [] or list ----------
class TestNewCollectionsPublic:
    @pytest.mark.parametrize("coll", ["banners", "events", "achievements", "facilities", "links", "teachers"])
    def test_get_collection_returns_list(self, anon_client, coll):
        r = anon_client.get(f"{BASE_URL}/api/{coll}")
        assert r.status_code == 200, f"{coll}: {r.status_code}"
        assert isinstance(r.json(), list), f"{coll} not list"


# ---------- 3) Admin routes require auth (401 without session) ----------
class TestAdminAuthRequired:
    @pytest.mark.parametrize("path,payload", [
        ("/api/banners", {"image_url": "x", "title": "t"}),
        ("/api/events", {"title": "t"}),
        ("/api/achievements", {"title": "t"}),
        ("/api/facilities", {"title": "t"}),
        ("/api/links", {"label": "l", "url": "https://x"}),
        ("/api/teachers", {"name": "n", "role": "r"}),
        ("/api/notices", {"title": "n"}),
    ])
    def test_post_unauth_returns_401(self, anon_client, path, payload):
        r = anon_client.post(f"{BASE_URL}{path}", json=payload)
        assert r.status_code == 401, f"{path} POST -> {r.status_code}"

    @pytest.mark.parametrize("path", [
        "/api/banners/xx", "/api/events/xx", "/api/achievements/xx",
        "/api/facilities/xx", "/api/links/xx", "/api/teachers/xx", "/api/notices/xx",
    ])
    def test_delete_unauth_returns_401(self, anon_client, path):
        r = anon_client.delete(f"{BASE_URL}{path}")
        assert r.status_code == 401

    def test_put_site_content_unauth(self, anon_client):
        r = anon_client.put(f"{BASE_URL}/api/site-content", json={"key": "theme", "value": {"primary": "#000000"}})
        assert r.status_code == 401


# ---------- 4) Admin CRUD flows ----------
class TestBannersCRUD:
    def test_create_get_delete_banner(self, admin_client, anon_client):
        payload = {"image_url": "https://example.com/b.jpg", "title": "TEST_banner"}
        r = admin_client.post(f"{BASE_URL}/api/banners", json=payload)
        assert r.status_code == 200, r.text
        created = r.json()
        assert created["title"] == "TEST_banner"
        assert "id" in created
        bid = created["id"]

        r2 = anon_client.get(f"{BASE_URL}/api/banners?active_only=false")
        assert r2.status_code == 200
        ids = [x["id"] for x in r2.json()]
        assert bid in ids

        r3 = admin_client.delete(f"{BASE_URL}/api/banners/{bid}")
        assert r3.status_code == 200

        r4 = anon_client.get(f"{BASE_URL}/api/banners?active_only=false")
        assert bid not in [x["id"] for x in r4.json()]


class TestEventsCRUD:
    def test_create_get_delete_event(self, admin_client, anon_client):
        r = admin_client.post(f"{BASE_URL}/api/events", json={"title": "TEST_event", "is_active": True})
        assert r.status_code == 200
        eid = r.json()["id"]
        r2 = anon_client.get(f"{BASE_URL}/api/events")
        assert eid in [x["id"] for x in r2.json()]
        admin_client.delete(f"{BASE_URL}/api/events/{eid}")


class TestAchievementsCRUD:
    def test_create_get_delete(self, admin_client, anon_client):
        r = admin_client.post(f"{BASE_URL}/api/achievements", json={"title": "TEST_ach"})
        assert r.status_code == 200
        aid = r.json()["id"]
        r2 = anon_client.get(f"{BASE_URL}/api/achievements")
        assert aid in [x["id"] for x in r2.json()]
        admin_client.delete(f"{BASE_URL}/api/achievements/{aid}")


class TestFacilitiesCRUD:
    def test_create_get_delete(self, admin_client, anon_client):
        r = admin_client.post(f"{BASE_URL}/api/facilities", json={"title": "TEST_fac", "icon": "Home"})
        assert r.status_code == 200
        fid = r.json()["id"]
        r2 = anon_client.get(f"{BASE_URL}/api/facilities")
        assert fid in [x["id"] for x in r2.json()]
        admin_client.delete(f"{BASE_URL}/api/facilities/{fid}")


class TestLinksCRUD:
    def test_create_get_delete(self, admin_client, anon_client):
        r = admin_client.post(f"{BASE_URL}/api/links", json={"label": "TEST_link", "url": "https://ex.com"})
        assert r.status_code == 200
        lid = r.json()["id"]
        r2 = anon_client.get(f"{BASE_URL}/api/links")
        assert lid in [x["id"] for x in r2.json()]
        admin_client.delete(f"{BASE_URL}/api/links/{lid}")


class TestTeachersCRUD:
    def test_create_get_delete(self, admin_client, anon_client):
        r = admin_client.post(f"{BASE_URL}/api/teachers", json={"name": "TEST_teacher", "role": "Math"})
        assert r.status_code == 200
        tid = r.json()["id"]
        r2 = anon_client.get(f"{BASE_URL}/api/teachers")
        assert tid in [x["id"] for x in r2.json()]
        admin_client.delete(f"{BASE_URL}/api/teachers/{tid}")


# ---------- 5) Theme PUT + persist ----------
class TestThemeEdit:
    def test_put_theme_persists(self, admin_client, anon_client, mongo_db):
        # save current for restore
        orig = mongo_db.site_content.find_one({"key": "theme"}, {"_id": 0})
        new_theme = {"primary": "#FF0000", "secondary": "#00FF00", "accent": "#0000FF", "background": "#FFFFFF"}
        r = admin_client.put(f"{BASE_URL}/api/site-content", json={"key": "theme", "value": new_theme})
        assert r.status_code == 200, r.text
        # GET and verify
        r2 = anon_client.get(f"{BASE_URL}/api/site-content/theme")
        assert r2.status_code == 200
        val = r2.json()["value"]
        assert val["primary"] == "#FF0000"
        assert val["secondary"] == "#00FF00"
        assert val["accent"] == "#0000FF"
        assert val["background"] == "#FFFFFF"
        # restore original
        if orig:
            admin_client.put(f"{BASE_URL}/api/site-content", json={"key": "theme", "value": orig["value"]})


# ---------- 6) Stats dynamic ----------
class TestStatsDynamic:
    def test_put_stats_and_get_stats(self, admin_client, anon_client, mongo_db):
        orig = mongo_db.site_content.find_one({"key": "stats"}, {"_id": 0})
        new_stats = {"students": 600, "teachers": 35, "classes": 7, "awards": 50}
        r = admin_client.put(f"{BASE_URL}/api/site-content", json={"key": "stats", "value": new_stats})
        assert r.status_code == 200
        r2 = anon_client.get(f"{BASE_URL}/api/stats")
        assert r2.status_code == 200
        data = r2.json()
        assert data["students"] == 600
        assert data["teachers"] == 35
        assert data["classes"] == 7
        assert data["awards"] == 50
        # restore
        if orig:
            admin_client.put(f"{BASE_URL}/api/site-content", json={"key": "stats", "value": orig["value"]})


# ---------- 7) Branding editable ----------
class TestBrandingEdit:
    def test_put_branding_persists(self, admin_client, anon_client, mongo_db):
        orig = mongo_db.site_content.find_one({"key": "branding"}, {"_id": 0})
        new_val = dict(orig["value"]) if orig else {}
        new_val["school_name"] = "TEST_SCHOOL_NAME_KGBV"
        r = admin_client.put(f"{BASE_URL}/api/site-content", json={"key": "branding", "value": new_val})
        assert r.status_code == 200
        r2 = anon_client.get(f"{BASE_URL}/api/site-content/branding")
        assert r2.json()["value"]["school_name"] == "TEST_SCHOOL_NAME_KGBV"
        # restore
        if orig:
            admin_client.put(f"{BASE_URL}/api/site-content", json={"key": "branding", "value": orig["value"]})
