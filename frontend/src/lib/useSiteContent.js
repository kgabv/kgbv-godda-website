import { useCallback, useEffect, useState } from "react";
import { api } from "../lib/api";

// Fetches a single site_content key. Returns [value, setValue, save, loading].
export function useSiteContent(key, defaultValue = {}) {
  const [value, setValue] = useState(defaultValue);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    api.get(`/site-content/${key}`).then((r) => {
      if (cancelled) return;
      if (r.data?.value) setValue(r.data.value);
      setLoading(false);
    }).catch(() => setLoading(false));
    return () => { cancelled = true; };
  }, [key]);

  const save = useCallback(async (v) => {
    await api.put("/site-content", { key, value: v ?? value });
  }, [key, value]);

  return [value, setValue, save, loading];
}
