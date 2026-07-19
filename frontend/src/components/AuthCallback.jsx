import React, { useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { api } from "../lib/api";
import { useAuth } from "../lib/AuthContext";

// REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
export default function AuthCallback() {
  const navigate = useNavigate();
  const location = useLocation();
  const { setUser } = useAuth();
  const done = useRef(false);

  useEffect(() => {
    if (done.current) return;
    done.current = true;
    const hash = location.hash || window.location.hash;
    const params = new URLSearchParams(hash.replace(/^#/, ""));
    const sid = params.get("session_id");
    if (!sid) { navigate("/"); return; }
    (async () => {
      try {
        const { data } = await api.post("/auth/session", { session_id: sid });
        setUser(data);
        navigate("/admin", { replace: true, state: { user: data } });
      } catch (e) {
        console.error("Auth session error", e);
        navigate("/admin/login?error=1", { replace: true });
      }
    })();
  }, [location.hash, navigate, setUser]);

  return (
    <div className="flex min-h-screen items-center justify-center" data-testid="auth-callback">
      <div className="glass rounded-2xl p-8 text-center">
        <div className="h-10 w-10 mx-auto animate-spin rounded-full border-4 border-primary border-t-transparent" />
        <p className="mt-4 text-lg">प्रवेश किया जा रहा है...</p>
      </div>
    </div>
  );
}
