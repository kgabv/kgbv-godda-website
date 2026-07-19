# KGBV Godda — Official Website

Premium, Hindi-language website for **कस्तूरबा गांधी बालिका विद्यालय, गोड्डा** with a full admin CMS.

- **Frontend**: React 19 + React Router 7 + Tailwind + Shadcn + Framer Motion
- **Backend**: FastAPI + MongoDB (Motor)
- **Auth**: Emergent Google OAuth
- **Storage**: Emergent Object Storage
- **Theme**: Blue / White / Sky-Blue with dark mode

## Local Development

### Backend
```bash
cd backend
cp .env.example .env    # fill values
pip install -r requirements.txt
uvicorn server:app --host 0.0.0.0 --port 8001 --reload
```

### Frontend
```bash
cd frontend
cp .env.example .env    # set REACT_APP_BACKEND_URL
yarn install
yarn start
```

## Deployment

### Option 1: Emergent (Recommended — full-stack)
Click the **Deploy** button in the Emergent chat interface. Backend + frontend + MongoDB deploy together.

### Option 2: Vercel (frontend only)
- Root Directory: `frontend`
- Framework Preset: `Create React App`
- `vercel.json` is already provided at `frontend/vercel.json`
- **Environment Variables**: set `REACT_APP_BACKEND_URL` in Vercel dashboard to your deployed backend URL
- Deploy backend separately on Railway / Render (both support FastAPI + MongoDB Atlas)

### Backend on Railway
1. Create MongoDB Atlas cluster; get connection string
2. New Railway project → Deploy from GitHub, root `backend/`
3. Set env vars: `MONGO_URL`, `DB_NAME`, `EMERGENT_LLM_KEY`, `APP_NAME`, `CORS_ORIGINS` (put your Vercel URL here)
4. Start command: `uvicorn server:app --host 0.0.0.0 --port $PORT`

## Environment Variables
- Frontend: see `frontend/.env.example`
- Backend: see `backend/.env.example`

## Admin Access
- Visit `/admin/login`
- Sign in with Google
- First user auto-becomes admin. To restrict later, add emails to `ADMIN_ALLOWED_EMAILS` in backend env.

## Features
Home / About / Principal / Academics / Admission / 16 Facilities / 10 Activities /
Photo Gallery (13 categories + lightbox + search) / Video Gallery (YouTube embeds) /
News & Notices (auto-scrolling ticker) / Downloads / Contact form + Google Map /
Dark-Light theme / WhatsApp float / Scroll-to-top / Animated counters / Admin CMS.

## License
© KGBV Godda. All rights reserved.
