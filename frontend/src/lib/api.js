import axios from "axios";

// Fallback strategy:
// 1. Use REACT_APP_BACKEND_URL if set (build-time env)
// 2. Otherwise use "" — axios treats "" as same-origin relative, so /api/... hits
//    the current host. This works if backend is served from the same domain (Emergent),
//    and gracefully fails on Vercel (frontend-only) without crashing the app.
const RAW = process.env.REACT_APP_BACKEND_URL || "";
export const BACKEND_URL = RAW.replace(/\/$/, "");
export const API = `${BACKEND_URL}/api`;

export const api = axios.create({
  baseURL: API,
  withCredentials: true,
  timeout: 15000,
});

// Suppress noisy console errors — components already handle failures gracefully
api.interceptors.response.use(
  (r) => r,
  (err) => {
    if (process.env.NODE_ENV !== "production") {
      console.warn("API error:", err?.config?.url, err?.message);
    }
    return Promise.reject(err);
  }
);

export const LOGO_URL = "https://customer-assets-wrfwihn1.emergentagent.net/job_e3f9b288-4ca0-4b1b-858c-48bc26649331/artifacts/7brhlrkg_IMG_20260704_154418.png";
