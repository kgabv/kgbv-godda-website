import axios from "axios";

// Fallback strategy:
// 1. Use REACT_APP_BACKEND_URL if set (build-time env)
// 2. Otherwise use "" — axios treats "" as same-origin relative, so /api/... hits
//    the current host.
const RAW = process.env.REACT_APP_BACKEND_URL || "";
export const BACKEND_URL = RAW.replace(/\/$/, "");
export const API = `${BACKEND_URL}/api`;

export const api = axios.create({
  baseURL: API,
  withCredentials: true,
  timeout: 15000,
});

// Attach authorization header from localStorage if present
api.interceptors.request.use(
  (config) => {
    try {
      const token = localStorage.getItem("session_token");
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (e) {
      console.warn("localStorage not accessible", e);
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor with automatic retries for transient 502/503/network/Non-JSON errors
api.interceptors.response.use(
  (r) => {
    if (r.config?.responseType === "blob" || r.config?.url?.includes("/files/")) {
      return r;
    }
    const ct = (r.headers?.["content-type"] || "").toLowerCase();
    if (ct && !ct.includes("application/json") && typeof r.data === "string") {
      const err = new Error("Non-JSON API response (backend not reachable)");
      err.isNonJson = true;
      return Promise.reject(err);
    }
    return r;
  },
  async (err) => {
    const config = err.config;
    // Maximum 4 retries for GET requests or requests failing due to server starting/502/503/network/non-JSON
    if (config && !config._retryCount) {
      config._retryCount = 0;
    }

    const isRetryableStatus = !err.response || [502, 503, 504, 500].includes(err.response?.status);
    const isRetryableError = err.isNonJson || isRetryableStatus || err.code === "ECONNABORTED" || err.code === "ERR_NETWORK";

    if (config && config._retryCount < 4 && isRetryableError && config.method?.toLowerCase() === "get") {
      config._retryCount += 1;
      const delayMs = Math.min(1000 * Math.pow(1.5, config._retryCount), 4000);
      console.warn(`[API] Retrying request (${config._retryCount}/4) to ${config.url} after ${delayMs}ms due to: ${err.message}`);
      await new Promise((res) => setTimeout(res, delayMs));
      return api(config);
    }

    if (process.env.NODE_ENV !== "production") {
      console.warn("API error:", err?.config?.url, err?.message);
    }
    if (err.response?.data?.detail) {
      err.message = err.response.data.detail;
    } else if (err.response?.data?.message) {
      err.message = err.response.data.message;
    } else if (typeof err.response?.data === "string" && err.response.data.length < 200) {
      err.message = err.response.data;
    }
    return Promise.reject(err);
  }
);

// Helper: safe array extraction
export const asArray = (x) => (Array.isArray(x) ? x : []);

export const LOGO_URL = "https://customer-assets-wrfwihn1.emergentagent.net/job_e3f9b288-4ca0-4b1b-858c-48bc26649331/artifacts/7brhlrkg_IMG_20260704_154418.png";

export const DEFAULT_FALLBACK_IMAGE = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='800' height='600' viewBox='0 0 800 600' fill='%23e2e8f0'><rect width='800' height='600' fill='%23f1f5f9'/><text x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-family='sans-serif' font-size='20' fill='%2394a3b8'>चित्र उपलब्ध नहीं</text></svg>";

export function resolveImageUrl(url, fallback = DEFAULT_FALLBACK_IMAGE) {
  if (!url || typeof url !== "string") return fallback;
  const trimmed = url.trim();
  if (!trimmed) return fallback;

  // External absolute URLs
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    if (trimmed.includes("/api/files/")) {
      const parts = trimmed.split("/api/files/");
      const relPath = parts[parts.length - 1];
      return `${API}/files/${relPath}`;
    }
    return trimmed;
  }

  if (trimmed.startsWith("data:")) return trimmed;

  // Normalize relative paths
  if (trimmed.startsWith("/api/files/")) return `${BACKEND_URL}${trimmed}`;
  if (trimmed.startsWith("api/files/")) return `${BACKEND_URL}/${trimmed}`;
  if (trimmed.startsWith("/files/")) return `${API}${trimmed}`;
  if (trimmed.startsWith("files/")) return `${API}/${trimmed}`;
  
  if (trimmed.startsWith("kgbv-godda/uploads/")) return `${API}/files/${trimmed}`;
  if (trimmed.startsWith("/kgbv-godda/uploads/")) return `${API}/files${trimmed}`;
  if (trimmed.startsWith("uploads/")) return `${API}/files/kgbv-godda/${trimmed}`;
  if (trimmed.startsWith("/uploads/")) return `${API}/files/kgbv-godda${trimmed}`;

  if (trimmed.startsWith("/")) return `${BACKEND_URL}${trimmed}`;
  
  return `${API}/files/kgbv-godda/uploads/${trimmed}`;
}

