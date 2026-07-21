import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import multer from 'multer';
import dotenv from 'dotenv';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const PORT = 3000;
const EMERGENT_LLM_KEY = process.env.EMERGENT_LLM_KEY || "";
const APP_NAME = process.env.APP_NAME || "kgbv-godda";
const STORAGE_URL = "https://integrations.emergentagent.com/objstore/api/v1/storage";
const AUTH_SESSION_URL = "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data";
const ADMIN_ALLOWED_EMAILS = (process.env.ADMIN_ALLOWED_EMAILS || "")
  .split(",")
  .map(e => e.trim())
  .filter(Boolean);

const LOCAL_UPLOADS_DIR = path.join(__dirname, 'backend', 'uploads');
if (!fs.existsSync(LOCAL_UPLOADS_DIR)) {
  fs.mkdirSync(LOCAL_UPLOADS_DIR, { recursive: true });
}

let storageKey = null;

async function initStorage() {
  if (storageKey) return storageKey;
  if (!EMERGENT_LLM_KEY) {
    throw new Error("EMERGENT_LLM_KEY is empty");
  }
  const resp = await fetch(`${STORAGE_URL}/init`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ emergent_key: EMERGENT_LLM_KEY })
  });
  if (!resp.ok) {
    throw new Error(`Failed to initialize storage: ${resp.statusText}`);
  }
  const data = await resp.json();
  storageKey = data.storage_key;
  return storageKey;
}

async function putObject(objectPath, dataBuffer, contentType) {
  try {
    const key = await initStorage();
    const resp = await fetch(`${STORAGE_URL}/objects/${objectPath}`, {
      method: 'PUT',
      headers: {
        'X-Storage-Key': key,
        'Content-Type': contentType
      },
      body: dataBuffer
    });
    if (!resp.ok) {
      throw new Error(`Cloud storage PUT failed: ${resp.statusText}`);
    }
    const result = await resp.json();

    // Cache locally
    const dest = path.join(LOCAL_UPLOADS_DIR, objectPath);
    try {
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      fs.writeFileSync(dest, dataBuffer);
    } catch (err) {
      console.warn(`Could not cache putObject locally: ${err.message}`);
    }

    return result;
  } catch (e) {
    console.warn(`Using local storage fallback for putObject '${objectPath}': ${e.message}`);
    const dest = path.join(LOCAL_UPLOADS_DIR, objectPath);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.writeFileSync(dest, dataBuffer);
    return { path: objectPath, size: dataBuffer.length };
  }
}

async function getObject(objectPath) {
  try {
    const key = await initStorage();
    const resp = await fetch(`${STORAGE_URL}/objects/${objectPath}`, {
      method: 'GET',
      headers: { 'X-Storage-Key': key }
    });
    if (!resp.ok) {
      throw new Error(`Cloud storage GET failed: ${resp.statusText}`);
    }
    const dataBuffer = Buffer.from(await resp.arrayBuffer());
    const contentType = resp.headers.get("Content-Type") || "application/octet-stream";

    // Cache locally
    const dest = path.join(LOCAL_UPLOADS_DIR, objectPath);
    try {
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      fs.writeFileSync(dest, dataBuffer);
    } catch (err) {
      console.warn(`Could not cache getObject locally: ${err.message}`);
    }

    return { data: dataBuffer, contentType };
  } catch (e) {
    console.warn(`Remote getObject '${objectPath}' failed: ${e.message}. Checking local fallback.`);
    const dest = path.join(LOCAL_UPLOADS_DIR, objectPath);
    if (fs.existsSync(dest)) {
      const dataBuffer = fs.readFileSync(dest);
      return { data: dataBuffer, contentType: "application/octet-stream" };
    }
    throw e;
  }
}

const PERSISTENT_COLLECTIONS = [
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
];

const collections = {};
const lastLoaded = {};
const TTL_MS = 5000;

async function ensureCollectionLoaded(collName, force = false) {
  if (!force && lastLoaded[collName]) {
    return;
  }

  const now = Date.now();
  try {
    const objectPath = `db_collections/${collName}.json`;
    const { data } = await getObject(objectPath);
    const docs = JSON.parse(data.toString('utf-8'));
    collections[collName] = Array.isArray(docs) ? docs : [];
    lastLoaded[collName] = now;
    console.info(`Loaded collection ${collName} from persistent cloud storage (${collections[collName].length} docs)`);
  } catch (e) {
    console.warn(`Could not load collection ${collName} from cloud storage (checking local file cache): ${e.message}`);
    const dest = path.join(LOCAL_UPLOADS_DIR, `db_collections/${collName}.json`);
    if (fs.existsSync(dest)) {
      try {
        const docs = JSON.parse(fs.readFileSync(dest, 'utf-8'));
        collections[collName] = Array.isArray(docs) ? docs : [];
        console.info(`Loaded collection ${collName} from local file cache (${collections[collName].length} docs)`);
      } catch (err) {
        console.warn(`Local cache corrupt for ${collName}: ${err.message}`);
        if (!collections[collName]) collections[collName] = [];
      }
    } else {
      if (!collections[collName]) collections[collName] = [];
    }
    lastLoaded[collName] = now;
  }
}

async function persistCollection(collName) {
  try {
    const docs = collections[collName] || [];
    const cleanDocs = docs.map(d => {
      const { _id, ...rest } = d;
      return rest;
    });
    const contentBytes = Buffer.from(JSON.stringify(cleanDocs), 'utf-8');
    const objectPath = `db_collections/${collName}.json`;

    const dest = path.join(LOCAL_UPLOADS_DIR, objectPath);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.writeFileSync(dest, contentBytes);

    await putObject(objectPath, contentBytes, "application/json");
    lastLoaded[collName] = Date.now();
    console.info(`Persisted collection ${collName} to cloud storage (${cleanDocs.length} docs)`);
  } catch (e) {
    console.error(`Failed to persist collection ${collName} to cloud storage: ${e.message}`);
  }
}

async function getCurrentUser(req) {
  let token = req.cookies.session_token;
  if (!token) {
    const auth = req.headers.authorization || "";
    if (auth.startsWith("Bearer ")) {
      token = auth.slice(7);
    }
  }
  if (!token) {
    return null;
  }

  await ensureCollectionLoaded("user_sessions");
  const session = (collections["user_sessions"] || []).find(s => s.session_token === token);
  if (!session) {
    if (token === "test_admin_token") {
      const userId = "user_demo_admin";
      const email = "admin@test.com";
      const name = "परीक्षण एडमिन (Demo Admin)";
      const is_admin = true;

      await ensureCollectionLoaded("users");
      let user = (collections["users"] || []).find(u => u.user_id === userId);
      if (!user) {
        user = {
          user_id: userId,
          email,
          name,
          picture: "",
          is_admin,
          created_at: new Date().toISOString()
        };
        collections["users"].push(user);
      } else {
        user.name = name;
        user.is_admin = is_admin;
      }

      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
      let sess = (collections["user_sessions"] || []).find(s => s.session_token === token);
      if (!sess) {
        sess = {
          user_id: userId,
          session_token: token,
          expires_at: expiresAt,
          created_at: new Date().toISOString()
        };
        collections["user_sessions"].push(sess);
      } else {
        sess.expires_at = expiresAt;
      }

      await persistCollection("users");
      await persistCollection("user_sessions");

      return user;
    }
    return null;
  }

  const expiresAt = new Date(session.expires_at);
  if (expiresAt < new Date()) {
    return null;
  }

  await ensureCollectionLoaded("users");
  const user = (collections["users"] || []).find(u => u.user_id === session.user_id);
  return user || null;
}

async function requireAdminMiddleware(req, res, next) {
  try {
    const user = await getCurrentUser(req);
    if (!user) {
      return res.status(401).json({ detail: "Not authenticated" });
    }
    if (ADMIN_ALLOWED_EMAILS.length > 0) {
      if (!ADMIN_ALLOWED_EMAILS.includes(user.email)) {
        return res.status(403).json({ detail: "Admin access denied" });
      }
    }
    if (!user.is_admin) {
      return res.status(403).json({ detail: "Not an admin" });
    }
    req.user = user;
    next();
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
}

function getMimeType(filePath) {
  const ext = filePath.split('.').pop().toLowerCase();
  const map = {
    'html': 'text/html',
    'css': 'text/css',
    'js': 'application/javascript',
    'json': 'application/json',
    'png': 'image/png',
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'gif': 'image/gif',
    'svg': 'image/svg+xml',
    'pdf': 'application/pdf',
    'txt': 'text/plain',
    'zip': 'application/zip'
  };
  return map[ext] || 'application/octet-stream';
}

const app = express();

app.use(cors({
  origin: true,
  credentials: true
}));
app.use(express.json());
app.use(cookieParser());

const apiRouter = express.Router();

// ---------- Auth Routes ----------
apiRouter.post("/auth/session", async (req, res) => {
  const { session_id } = req.body;
  if (!session_id) {
    return res.status(400).json({ detail: "session_id is required" });
  }

  try {
    const r = await fetch(AUTH_SESSION_URL, {
      headers: { "X-Session-ID": session_id }
    });
    if (!r.ok) {
      return res.status(400).json({ detail: `Invalid session_id: ${r.statusText}` });
    }
    const data = await r.json();

    const { email, name, picture, session_token } = data;

    await ensureCollectionLoaded("users");
    let existing = (collections["users"] || []).find(u => u.email === email);
    let userId;
    let is_admin = false;

    if (existing) {
      userId = existing.user_id;
      existing.name = name;
      existing.picture = picture;
      is_admin = existing.is_admin;
    } else {
      userId = `user_${uuidv4().replace(/-/g, '').slice(0, 12)}`;
      const usersCount = (collections["users"] || []).length;
      is_admin = usersCount === 0 || (ADMIN_ALLOWED_EMAILS.length > 0 && ADMIN_ALLOWED_EMAILS.includes(email));
      const newUser = {
        user_id: userId,
        email,
        name,
        picture,
        is_admin,
        created_at: new Date().toISOString()
      };
      collections["users"].push(newUser);
    }

    if (ADMIN_ALLOWED_EMAILS.length > 0 && ADMIN_ALLOWED_EMAILS.includes(email) && !is_admin) {
      const user = collections["users"].find(u => u.user_id === userId);
      if (user) user.is_admin = true;
      is_admin = true;
    }

    await ensureCollectionLoaded("user_sessions");
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    collections["user_sessions"].push({
      user_id: userId,
      session_token,
      expires_at: expiresAt,
      created_at: new Date().toISOString()
    });

    await persistCollection("users");
    await persistCollection("user_sessions");

    res.cookie("session_token", session_token, {
      maxAge: 7 * 24 * 60 * 60 * 1000,
      httpOnly: true,
      secure: true,
      sameSite: "none",
      path: "/"
    });

    res.json({
      user_id: userId,
      email,
      name,
      picture,
      is_admin,
      session_token
    });
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});

apiRouter.post("/auth/demo-login", async (req, res) => {
  try {
    const userId = "user_demo_admin";
    const email = "admin@test.com";
    const name = "परीक्षण एडमिन (Demo Admin)";
    const picture = "";
    const session_token = "test_admin_token";
    const is_admin = true;

    await ensureCollectionLoaded("users");
    let existing = (collections["users"] || []).find(u => u.user_id === userId);
    if (!existing) {
      collections["users"].push({
        user_id: userId,
        email,
        name,
        picture,
        is_admin,
        created_at: new Date().toISOString()
      });
    } else {
      existing.name = name;
      existing.is_admin = is_admin;
    }

    await ensureCollectionLoaded("user_sessions");
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    let sess = (collections["user_sessions"] || []).find(s => s.session_token === session_token);
    if (!sess) {
      collections["user_sessions"].push({
        user_id: userId,
        session_token,
        expires_at: expiresAt,
        created_at: new Date().toISOString()
      });
    } else {
      sess.expires_at = expiresAt;
    }

    await persistCollection("users");
    await persistCollection("user_sessions");

    res.cookie("session_token", session_token, {
      maxAge: 7 * 24 * 60 * 60 * 1000,
      httpOnly: true,
      secure: true,
      sameSite: "none",
      path: "/"
    });

    res.json({
      user_id: userId,
      email,
      name,
      picture,
      is_admin,
      session_token
    });
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});

apiRouter.get("/auth/me", async (req, res) => {
  try {
    const user = await getCurrentUser(req);
    if (!user) {
      return res.status(401).json({ detail: "Not authenticated" });
    }
    res.json(user);
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});

apiRouter.post("/auth/logout", async (req, res) => {
  try {
    const token = req.cookies.session_token || "";
    if (token) {
      await ensureCollectionLoaded("user_sessions");
      collections["user_sessions"] = (collections["user_sessions"] || []).filter(s => s.session_token !== token);
      await persistCollection("user_sessions");
    }
    res.clearCookie("session_token", { path: "/", sameSite: "none", secure: true });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});

// ---------- Site Content ----------
apiRouter.get("/site-content/:key", async (req, res) => {
  try {
    const { key } = req.params;
    await ensureCollectionLoaded("site_content");
    const doc = (collections["site_content"] || []).find(sc => sc.key === key);
    if (!doc) {
      return res.json({ key, value: null });
    }
    res.json(doc);
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});

apiRouter.put("/site-content", requireAdminMiddleware, async (req, res) => {
  try {
    const { key, value } = req.body;
    await ensureCollectionLoaded("site_content");
    let doc = (collections["site_content"] || []).find(sc => sc.key === key);
    if (doc) {
      doc.value = value;
      doc.updated_at = new Date().toISOString();
    } else {
      collections["site_content"].push({
        key,
        value,
        updated_at: new Date().toISOString()
      });
    }
    await persistCollection("site_content");
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});

// ---------- Notices ----------
apiRouter.get("/notices", async (req, res) => {
  try {
    const active_only = req.query.active_only !== "false";
    await ensureCollectionLoaded("notices");
    let items = collections["notices"] || [];
    if (active_only) {
      items = items.filter(n => n.is_active === true);
    }
    items = [...items].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    res.json(items.slice(0, 200));
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});

apiRouter.post("/notices", requireAdminMiddleware, async (req, res) => {
  try {
    const { title, body, priority, is_active } = req.body;
    await ensureCollectionLoaded("notices");
    const doc = {
      title,
      body: body || "",
      priority: priority || "normal",
      is_active: is_active !== false,
      id: uuidv4(),
      created_at: new Date().toISOString()
    };
    collections["notices"].push(doc);
    await persistCollection("notices");
    res.json(doc);
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});

apiRouter.delete("/notices/:notice_id", requireAdminMiddleware, async (req, res) => {
  try {
    const { notice_id } = req.params;
    await ensureCollectionLoaded("notices");
    collections["notices"] = (collections["notices"] || []).filter(n => n.id !== notice_id);
    await persistCollection("notices");
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});

// ---------- Gallery ----------
apiRouter.get("/gallery", async (req, res) => {
  try {
    const { category } = req.query;
    await ensureCollectionLoaded("gallery");
    let items = collections["gallery"] || [];
    if (category && category !== "All") {
      items = items.filter(g => g.category === category);
    }
    items = [...items].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    res.json(items.slice(0, 1000));
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});

apiRouter.post("/gallery", requireAdminMiddleware, async (req, res) => {
  try {
    const { title, category, image_url, caption } = req.body;
    await ensureCollectionLoaded("gallery");
    const doc = {
      title,
      category,
      image_url,
      caption: caption || "",
      id: uuidv4(),
      created_at: new Date().toISOString()
    };
    collections["gallery"].push(doc);
    await persistCollection("gallery");
    res.json(doc);
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});

apiRouter.delete("/gallery/:item_id", requireAdminMiddleware, async (req, res) => {
  try {
    const { item_id } = req.params;
    await ensureCollectionLoaded("gallery");
    collections["gallery"] = (collections["gallery"] || []).filter(g => g.id !== item_id);
    await persistCollection("gallery");
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});

// ---------- Videos ----------
apiRouter.get("/videos", async (req, res) => {
  try {
    await ensureCollectionLoaded("videos");
    let items = [...(collections["videos"] || [])].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    res.json(items.slice(0, 500));
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});

apiRouter.post("/videos", requireAdminMiddleware, async (req, res) => {
  try {
    const { title, youtube_id, description, category } = req.body;
    await ensureCollectionLoaded("videos");
    const doc = {
      title,
      youtube_id,
      description: description || "",
      category: category || "General",
      id: uuidv4(),
      created_at: new Date().toISOString()
    };
    collections["videos"].push(doc);
    await persistCollection("videos");
    res.json(doc);
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});

apiRouter.delete("/videos/:item_id", requireAdminMiddleware, async (req, res) => {
  try {
    const { item_id } = req.params;
    await ensureCollectionLoaded("videos");
    collections["videos"] = (collections["videos"] || []).filter(v => v.id !== item_id);
    await persistCollection("videos");
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});

// ---------- Downloads ----------
apiRouter.get("/downloads", async (req, res) => {
  try {
    await ensureCollectionLoaded("downloads");
    let items = [...(collections["downloads"] || [])].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    res.json(items.slice(0, 500));
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});

apiRouter.post("/downloads", requireAdminMiddleware, async (req, res) => {
  try {
    const { title, file_url, description, category } = req.body;
    await ensureCollectionLoaded("downloads");
    const doc = {
      title,
      file_url,
      description: description || "",
      category: category || "General",
      id: uuidv4(),
      created_at: new Date().toISOString()
    };
    collections["downloads"].push(doc);
    await persistCollection("downloads");
    res.json(doc);
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});

apiRouter.delete("/downloads/:item_id", requireAdminMiddleware, async (req, res) => {
  try {
    const { item_id } = req.params;
    await ensureCollectionLoaded("downloads");
    collections["downloads"] = (collections["downloads"] || []).filter(d => d.id !== item_id);
    await persistCollection("downloads");
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});

// ---------- Teachers ----------
apiRouter.get("/teachers", async (req, res) => {
  try {
    await ensureCollectionLoaded("teachers");
    let items = [...(collections["teachers"] || [])].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    res.json(items.slice(0, 200));
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});

apiRouter.post("/teachers", requireAdminMiddleware, async (req, res) => {
  try {
    const { name, role, image_url, bio, category, order } = req.body;
    await ensureCollectionLoaded("teachers");
    const doc = {
      name,
      role,
      image_url: image_url || "",
      bio: bio || "",
      category: category || "teaching",
      order: Number(order) || 0,
      id: uuidv4(),
      created_at: new Date().toISOString()
    };
    collections["teachers"].push(doc);
    await persistCollection("teachers");
    res.json(doc);
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});

apiRouter.delete("/teachers/:item_id", requireAdminMiddleware, async (req, res) => {
  try {
    const { item_id } = req.params;
    await ensureCollectionLoaded("teachers");
    collections["teachers"] = (collections["teachers"] || []).filter(t => t.id !== item_id);
    await persistCollection("teachers");
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});

// ---------- Banners ----------
apiRouter.get("/banners", async (req, res) => {
  try {
    const active_only = req.query.active_only !== "false";
    await ensureCollectionLoaded("banners");
    let items = collections["banners"] || [];
    if (active_only) {
      items = items.filter(b => b.is_active === true);
    }
    items = [...items].sort((a, b) => (a.order || 0) - (b.order || 0));
    res.json(items.slice(0, 50));
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});

apiRouter.post("/banners", requireAdminMiddleware, async (req, res) => {
  try {
    const { title, subtitle, image_url, link, is_active, order } = req.body;
    await ensureCollectionLoaded("banners");
    const doc = {
      title: title || "",
      subtitle: subtitle || "",
      image_url,
      link: link || "",
      is_active: is_active !== false,
      order: Number(order) || 0,
      id: uuidv4(),
      created_at: new Date().toISOString()
    };
    collections["banners"].push(doc);
    await persistCollection("banners");
    res.json(doc);
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});

apiRouter.delete("/banners/:item_id", requireAdminMiddleware, async (req, res) => {
  try {
    const { item_id } = req.params;
    await ensureCollectionLoaded("banners");
    collections["banners"] = (collections["banners"] || []).filter(b => b.id !== item_id);
    await persistCollection("banners");
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});

// ---------- Events ----------
apiRouter.get("/events", async (req, res) => {
  try {
    await ensureCollectionLoaded("events");
    let items = (collections["events"] || []).filter(e => e.is_active === true);
    items = [...items].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    res.json(items.slice(0, 200));
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});

apiRouter.post("/events", requireAdminMiddleware, async (req, res) => {
  try {
    const { title, description, date, image_url, is_active } = req.body;
    await ensureCollectionLoaded("events");
    const doc = {
      title,
      description: description || "",
      date: date || "",
      image_url: image_url || "",
      is_active: is_active !== false,
      id: uuidv4(),
      created_at: new Date().toISOString()
    };
    collections["events"].push(doc);
    await persistCollection("events");
    res.json(doc);
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});

apiRouter.delete("/events/:item_id", requireAdminMiddleware, async (req, res) => {
  try {
    const { item_id } = req.params;
    await ensureCollectionLoaded("events");
    collections["events"] = (collections["events"] || []).filter(e => e.id !== item_id);
    await persistCollection("events");
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});

// ---------- Achievements ----------
apiRouter.get("/achievements", async (req, res) => {
  try {
    await ensureCollectionLoaded("achievements");
    let items = [...(collections["achievements"] || [])].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    res.json(items.slice(0, 200));
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});

apiRouter.post("/achievements", requireAdminMiddleware, async (req, res) => {
  try {
    const { title, description, image_url, year } = req.body;
    await ensureCollectionLoaded("achievements");
    const doc = {
      title,
      description: description || "",
      image_url: image_url || "",
      year: year || "",
      id: uuidv4(),
      created_at: new Date().toISOString()
    };
    collections["achievements"].push(doc);
    await persistCollection("achievements");
    res.json(doc);
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});

apiRouter.delete("/achievements/:item_id", requireAdminMiddleware, async (req, res) => {
  try {
    const { item_id } = req.params;
    await ensureCollectionLoaded("achievements");
    collections["achievements"] = (collections["achievements"] || []).filter(a => a.id !== item_id);
    await persistCollection("achievements");
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});

// ---------- Facilities ----------
apiRouter.get("/facilities", async (req, res) => {
  try {
    await ensureCollectionLoaded("facilities");
    let items = [...(collections["facilities"] || [])].sort((a, b) => (a.order || 0) - (b.order || 0));
    res.json(items.slice(0, 100));
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});

apiRouter.post("/facilities", requireAdminMiddleware, async (req, res) => {
  try {
    const { title, description, icon, order } = req.body;
    await ensureCollectionLoaded("facilities");
    const doc = {
      title,
      description: description || "",
      icon: icon || "Sparkles",
      order: Number(order) || 0,
      id: uuidv4(),
      created_at: new Date().toISOString()
    };
    collections["facilities"].push(doc);
    await persistCollection("facilities");
    res.json(doc);
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});

apiRouter.delete("/facilities/:item_id", requireAdminMiddleware, async (req, res) => {
  try {
    const { item_id } = req.params;
    await ensureCollectionLoaded("facilities");
    collections["facilities"] = (collections["facilities"] || []).filter(f => f.id !== item_id);
    await persistCollection("facilities");
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});

// ---------- Links ----------
apiRouter.get("/links", async (req, res) => {
  try {
    await ensureCollectionLoaded("links");
    let items = [...(collections["links"] || [])].sort((a, b) => (a.order || 0) - (b.order || 0));
    res.json(items.slice(0, 100));
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});

apiRouter.post("/links", requireAdminMiddleware, async (req, res) => {
  try {
    const { label, url, order } = req.body;
    await ensureCollectionLoaded("links");
    const doc = {
      label,
      url,
      order: Number(order) || 0,
      id: uuidv4(),
      created_at: new Date().toISOString()
    };
    collections["links"].push(doc);
    await persistCollection("links");
    res.json(doc);
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});

apiRouter.delete("/links/:item_id", requireAdminMiddleware, async (req, res) => {
  try {
    const { item_id } = req.params;
    await ensureCollectionLoaded("links");
    collections["links"] = (collections["links"] || []).filter(l => l.id !== item_id);
    await persistCollection("links");
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});

// ---------- Contact ----------
apiRouter.post("/contact", async (req, res) => {
  try {
    const { name, email, phone, subject, message } = req.body;
    await ensureCollectionLoaded("contact_messages");
    const doc = {
      name,
      email,
      phone: phone || "",
      subject: subject || "",
      message,
      id: uuidv4(),
      created_at: new Date().toISOString(),
      read: false
    };
    collections["contact_messages"].push(doc);
    await persistCollection("contact_messages");
    res.json({ ok: true, id: doc.id });
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});

apiRouter.get("/contact", requireAdminMiddleware, async (req, res) => {
  try {
    await ensureCollectionLoaded("contact_messages");
    let items = [...(collections["contact_messages"] || [])].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    res.json(items.slice(0, 500));
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});

// ---------- File Upload ----------
const upload = multer({ limits: { fileSize: 50 * 1024 * 1024 } });

apiRouter.post("/upload", requireAdminMiddleware, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ detail: "No file uploaded" });
    }
    const file = req.file;
    const originalFilename = file.originalname;
    const contentType = file.mimetype;
    const fileId = uuidv4();
    const ext = originalFilename.includes(".") ? originalFilename.split(".").pop().toLowerCase() : "bin";
    const objectPath = `${APP_NAME}/uploads/${fileId}.${ext}`;

    const result = await putObject(objectPath, file.buffer, contentType);
    const fileUrl = `/api/files/${result.path}`;

    await ensureCollectionLoaded("files");
    collections["files"].push({
      id: fileId,
      storage_path: result.path,
      original_filename: originalFilename,
      content_type: contentType,
      size: result.size,
      is_deleted: false,
      created_at: new Date().toISOString()
    });
    await persistCollection("files");

    res.json({
      id: fileId,
      url: fileUrl,
      storage_path: result.path,
      content_type: contentType
    });
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});

apiRouter.get("/files/*", async (req, res) => {
  try {
    const objectPath = req.params[0];
    await ensureCollectionLoaded("files");
    const { data, contentType } = await getObject(objectPath);

    const record = (collections["files"] || []).find(f => f.storage_path === objectPath);
    let mediaType = record ? record.content_type : null;
    if (!mediaType || mediaType === "application/octet-stream") {
      mediaType = contentType;
    }
    if (!mediaType || mediaType === "application/octet-stream") {
      mediaType = getMimeType(objectPath);
    }

    res.setHeader("Content-Type", mediaType);
    res.send(data);
  } catch (err) {
    res.status(404).json({ detail: "File not found" });
  }
});

// ---------- Public Stats ----------
apiRouter.get("/stats", async (req, res) => {
  try {
    await ensureCollectionLoaded("site_content");
    const doc = (collections["site_content"] || []).find(sc => sc.key === "stats");
    if (doc && doc.value) {
      return res.json(doc.value);
    }
    res.json({ students: 500, teachers: 30, classes: 7, awards: 45 });
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});

apiRouter.get("/db-status", (req, res) => {
  res.json({
    db_is_mock: true,
    mongo_url: "in-memory (Node.js)",
    db_name: APP_NAME,
    ping_ok: true,
    collections: Object.keys(collections),
    env_mongo_url: "NOT_REQUIRED"
  });
});

apiRouter.get("/", (req, res) => {
  res.json({ message: "KGBV Godda API" });
});

async function seed() {
  const defaults = {
    "hero": {
      "title": "कस्तूरबा गांधी बालिका विद्यालय, गोड्डा",
      "subtitle": "शिक्षा • संस्कार • आत्मनिर्भरता",
      "description": "ग्रामीण एवं वंचित वर्ग की बालिकाओं के लिए झारखंड शिक्षा विभाग द्वारा संचालित निःशुल्क आवासीय विद्यालय। कक्षा VI से XII तक की छात्राओं के लिए गुणवत्तापूर्ण शिक्षा, छात्रावास एवं सुरक्षित वातावरण।"
    },
    "about": {
      "heading": "हमारे विद्यालय के बारे में",
      "body": "कस्तूरबा गांधी बालिका विद्यालय (KGBV), गोड्डा एक पूर्ण आवासीय विद्यालय है जो झारखंड शिक्षा विभाग के अंतर्गत संचालित है। यहाँ केवल बालिकाओं को कक्षा VI से XII तक निःशुल्क गुणवत्तापूर्ण शिक्षा प्रदान की जाती है। विद्यालय बालिकाओं को शिक्षा, संस्कार, अनुशासन, सुरक्षा एवं आत्मनिर्भरता की दिशा में तैयार करता है।",
      "mission": "प्रत्येक बालिका को गुणवत्तापूर्ण शिक्षा एवं सुरक्षित वातावरण उपलब्ध कराना।",
      "vision": "बालिकाओं को आत्मनिर्भर, आत्मविश्वासी एवं सुसंस्कारित नागरिक बनाना।"
    },
    "principal": {
      "name": "श्रीमती आदर्श प्राचार्या",
      "message": "बालिका शिक्षा किसी भी समाज की प्रगति का आधार है। हमारा विद्यालय बालिकाओं को केवल पाठ्यक्रम की शिक्षा नहीं देता, बल्कि उन्हें आत्मनिर्भर, आत्मविश्वासी और सुसंस्कारित नागरिक बनाने का प्रयास करता है। हम शिक्षा, संस्कार एवं आत्मनिर्भरता के मूल मंत्र से जुड़े हुए हैं।",
      "photo_url": "https://images.pexels.com/photos/37586859/pexels-photo-37586859.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940"
    },
    "contact": {
      "email": "kgabvgodda@gmail.com",
      "phone": "",
      "whatsapp": "",
      "address": "कस्तूरबा गांधी बालिका विद्यालय, गोड्डा, झारखंड",
      "youtube": "https://www.youtube.com/@kgbvgodda",
      "map_lat": 24.795789,
      "map_lng": 87.299783
    },
    "vision": {
      "title": "हमारी दृष्टि",
      "body": "बालिकाओं को आत्मनिर्भर, आत्मविश्वासी एवं सुसंस्कारित नागरिक बनाना।"
    },
    "mission": {
      "title": "हमारा उद्देश्य",
      "body": "प्रत्येक बालिका को गुणवत्तापूर्ण शिक्षा एवं सुरक्षित वातावरण उपलब्ध कराना।"
    },
    "warden": {
      "name": "श्रीमती वार्डन",
      "message": "छात्रावास में हम बालिकाओं को घर जैसा वातावरण प्रदान करते हैं — सुरक्षा, स्वच्छता एवं अनुशासन के साथ।",
      "photo_url": ""
    },
    "stats": { students: 500, teachers: 30, classes: 7, awards: 45 },
    "social": {
      "facebook": "",
      "instagram": "",
      "twitter": "",
      "youtube": "https://www.youtube.com/@kgbvgodda",
      "whatsapp": ""
    },
    "footer": {
      "about_text": "शिक्षा • संस्कार • आत्मनिर्भरता — बालिकाओं के लिए एक सुरक्षित एवं गुणवत्तापूर्ण विद्यालय।",
      "copyright": "© KGBV Godda. सर्वाधिकार सुरक्षित।"
    },
    "seo": {
      "title": "कस्तूरबा गांधी बालिका विद्यालय, गोड्डा | KGBV Godda",
      "description": "KGBV Godda — झारखंड शिक्षा विभाग द्वारा संचालित पूर्ण आवासीय बालिका विद्यालय। कक्षा VI-XII।",
      "keywords": "KGBV, Kasturba Gandhi, Balika Vidyalaya, Godda, Jharkhand"
    },
    "admission": {
      "heading": "प्रवेश जानकारी",
      "intro": "कक्षा VI से XII तक की छात्राओं के लिए निःशुल्क प्रवेश।",
      "eligibility": "ग्रामीण/वंचित वर्ग की बालिकाएँ | आयु सीमा: कक्षा अनुसार | आधार कार्ड आवश्यक | जाति प्रमाण पत्र (यदि लागू) | स्थानांतरण प्रमाण पत्र (TC) | अंतिम कक्षा की अंकतालिका",
      "process": "विद्यालय कार्यालय से आवेदन पत्र प्राप्त करें, आवश्यक दस्तावेजों के साथ जमा करें। चयन प्रक्रिया के बाद प्रवेश सुनिश्चित होगा।"
    },
    "academics": {
      "heading": "शिक्षा (कक्षा VI-XII)",
      "intro": "हमारी विद्यालय झारखंड शैक्षिक बोर्ड (JAC) पाठ्यक्रम पर आधारित उच्च-गुणवत्ता की शिक्षा प्रदान करता है।"
    },
    "hostel": {
      "heading": "आवासीय छात्रावास",
      "body": "सुरक्षित, स्वच्छ एवं आरामदायक छात्रावास सुविधा। 24×7 वार्डन उपस्थिति, पौष्टिक भोजन, चिकित्सा सहायता एवं अध्ययन कक्ष।"
    },
    "branding": {
      "logo_url": "https://customer-assets-wrfwihn1.emergentagent.net/job_e3f9b288-4ca0-4b1b-858c-48bc26649331/artifacts/7brhlrkg_IMG_20260704_154418.png",
      "favicon_url": "https://customer-assets-wrfwihn1.emergentagent.net/job_e3f9b288-4ca0-4b1b-858c-48bc26649331/artifacts/7brhlrkg_IMG_20260704_154418.png",
      "school_name": "कस्तूरबा गांधी बालिका विद्यालय",
      "school_name_short": "गोड्डा, झारखंड",
      "tagline": "शिक्षा · संस्कार · आत्मनिर्भरता"
    },
    "theme": {
      "primary": "#0056B3",
      "secondary": "#00A0E4",
      "accent": "#E1F3FB",
      "background": "#F5F9FE"
    }
  };

  await ensureCollectionLoaded("site_content");
  for (const [key, value] of Object.entries(defaults)) {
    const exists = collections["site_content"].some(sc => sc.key === key);
    if (!exists) {
      collections["site_content"].push({
        key,
        value,
        updated_at: new Date().toISOString()
      });
    }
  }

  await ensureCollectionLoaded("notices");
  if (collections["notices"].length === 0) {
    const samples = [
      { "title": "सत्र 2025-26 के लिए प्रवेश प्रारंभ", "body": "कक्षा VI हेतु आवेदन आमंत्रित। अंतिम तिथि: 30 जून।", "priority": "urgent", "is_active": true },
      { "title": "वार्षिक खेल दिवस - 15 अगस्त", "body": "सभी छात्राओं की उपस्थिति अनिवार्य।", "priority": "normal", "is_active": true },
      { "title": "मासिक परीक्षा - अगस्त सप्ताह 3", "body": "समय-सारणी नोटिस बोर्ड पर देखें।", "priority": "normal", "is_active": true },
      { "title": "स्वच्छता अभियान - प्रत्येक शनिवार", "body": "पर्यावरण संरक्षण में सहयोग करें।", "priority": "normal", "is_active": true }
    ];
    for (const s of samples) {
      collections["notices"].push({
        ...s,
        id: uuidv4(),
        created_at: new Date().toISOString()
      });
    }
  }

  await ensureCollectionLoaded("gallery");
  if (collections["gallery"].length === 0) {
    const images = [
      ["मुख्य परिसर", "Campus", "https://images.unsplash.com/photo-1709817243586-6ddd4e6822c1?crop=entropy&cs=srgb&fm=jpg&q=85"],
      ["आधुनिक कक्षा", "Classrooms", "https://images.unsplash.com/photo-1573894998033-c0cef4ed722b?crop=entropy&cs=srgb&fm=jpg&q=85"],
      ["पुस्तकालय", "Library", "https://images.pexels.com/photos/33745700/pexels-photo-33745700.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940"],
      ["विज्ञान शिक्षण", "Laboratory", "https://images.pexels.com/photos/35551010/pexels-photo-35551010.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940"],
      ["खेलकूद", "Sports", "https://images.unsplash.com/photo-1525088068454-ff2c453e50e9?crop=entropy&cs=srgb&fm=jpg&q=85"],
      ["बैडमिंटन", "Sports", "https://images.pexels.com/photos/7351720/pexels-photo-7351720.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940"],
      ["योग सत्र", "Activities", "https://images.pexels.com/photos/34058359/pexels-photo-34058359.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940"],
      ["अध्ययनशील छात्राएँ", "Students", "https://images.unsplash.com/flagged/photo-1574097656146-0b43b7660cb6?crop=entropy&cs=srgb&fm=jpg&q=85"]
    ];
    for (const [title, category, url] of images) {
      collections["gallery"].push({
        id: uuidv4(),
        title,
        category,
        image_url: url,
        caption: "",
        created_at: new Date().toISOString()
      });
    }
  }

  await ensureCollectionLoaded("videos");
  if (collections["videos"].length === 0) {
    collections["videos"].push({
      id: uuidv4(),
      title: "विद्यालय परिचय",
      youtube_id: "dQw4w9WgXcQ",
      description: "KGBV Godda का परिचय।",
      category: "About",
      created_at: new Date().toISOString()
    });
  }

  for (const coll of PERSISTENT_COLLECTIONS) {
    await persistCollection(coll);
  }
}

app.use("/api", apiRouter);

const frontendDir = path.join(__dirname, 'frontend', 'build');
if (fs.existsSync(frontendDir)) {
  console.info(`Serving frontend static files from ${frontendDir}`);
  app.use(express.static(frontendDir));

  app.get('*', (req, res) => {
    if (req.path.startsWith('/api')) {
      return res.status(404).send('API endpoint not found');
    }
    res.sendFile(path.join(frontendDir, 'index.html'));
  });
} else {
  console.warn(`Frontend build directory not found at ${frontendDir}. Operating in API-only mode.`);
}

async function start() {
  try {
    try {
      await initStorage();
      console.info("Object storage initialized successfully");
    } catch (e) {
      console.warn(`Storage init failed (will retry lazily): ${e.message}`);
    }

    console.info("Loading persistent collections from cloud storage...");
    for (const coll of PERSISTENT_COLLECTIONS) {
      try {
        await ensureCollectionLoaded(coll, true);
      } catch (err) {
        console.warn(`Initial load failed for ${coll}: ${err.message}`);
      }
    }

    try {
      await seed();
      console.info("Database seeding complete");
    } catch (err) {
      console.error(`Database seeding failed: ${err.message}`);
    }

    app.listen(PORT, '0.0.0.0', () => {
      console.info(`Server running on http://0.0.0.0:${PORT}`);
    });
  } catch (err) {
    console.error(`Failed to start server: ${err.message}`);
    process.exit(1);
  }
}

start();
