import React, { useEffect, useState } from "react";
import { api } from "../lib/api";
import { Card } from "../components/ui/card";

export default function Principal() {
  const [p, setP] = useState(() => {
    try {
      const cached = localStorage.getItem("kgbv-principal-cache");
      return cached ? JSON.parse(cached) : null;
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(!p);

  useEffect(() => {
    api.get("/site-content/principal")
      .then((r) => {
        if (r.data?.value) {
          setP(r.data.value);
          try {
            localStorage.setItem("kgbv-principal-cache", JSON.stringify(r.data.value));
          } catch {}
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading && !p) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-12 animate-pulse" id="principal-loading-skeleton">
        <div className="h-10 w-1/3 bg-muted rounded-xl mb-8" />
        <div className="grid md:grid-cols-3 gap-8">
          <div className="h-96 bg-muted rounded-3xl" />
          <div className="h-96 bg-muted rounded-3xl md:col-span-2" />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-12" data-testid="principal-page">
      <h1 className="text-4xl md:text-5xl font-extrabold text-primary">प्रधानाचार्या का संदेश</h1>
      <div className="mt-8 grid md:grid-cols-3 gap-8 items-start">
        <Card className="p-4 rounded-3xl overflow-hidden">
          {p?.photo_url ? (
            <img src={p.photo_url} alt="Principal" className="w-full h-72 object-cover rounded-2xl" />
          ) : (
            <div className="w-full h-72 bg-muted rounded-2xl flex items-center justify-center text-muted-foreground text-sm">कोई चित्र नहीं</div>
          )}
          <div className="mt-4 text-center">
            <div className="font-extrabold text-lg">{p?.name || "प्रधानाचार्या"}</div>
            <div className="text-sm text-muted-foreground">KGBV Godda</div>
          </div>
        </Card>
        <Card className="p-6 md:p-8 rounded-3xl md:col-span-2">
          <div className="text-6xl leading-none text-primary/40 font-serif">“</div>
          <p className="hindi text-lg text-foreground/85 -mt-6">{p?.message}</p>
          <div className="mt-6 text-right font-semibold text-primary">— {p?.name}</div>
        </Card>
      </div>
    </div>
  );
}
