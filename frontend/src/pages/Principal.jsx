import React, { useEffect, useState } from "react";
import { api } from "../lib/api";
import { Card } from "../components/ui/card";

export default function Principal() {
  const [p, setP] = useState(null);
  useEffect(() => { api.get("/site-content/principal").then((r) => setP(r.data.value)); }, []);
  return (
    <div className="max-w-6xl mx-auto px-4 py-12" data-testid="principal-page">
      <h1 className="text-4xl md:text-5xl font-extrabold text-primary">प्रधानाचार्या का संदेश</h1>
      <div className="mt-8 grid md:grid-cols-3 gap-8 items-start">
        <Card className="p-4 rounded-3xl overflow-hidden">
          <img src={p?.photo_url} alt="Principal" className="w-full h-72 object-cover rounded-2xl" />
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
