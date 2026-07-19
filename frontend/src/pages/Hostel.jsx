import React, { useEffect, useState } from "react";
import { api } from "../lib/api";
import { Card } from "../components/ui/card";

export default function Hostel() {
  const [h, setH] = useState(null);
  useEffect(() => { api.get("/site-content/hostel").then(r => setH(r.data?.value)).catch(() => {}); }, []);
  return (
    <div className="max-w-6xl mx-auto px-4 py-12" data-testid="hostel-page">
      <h1 className="text-4xl md:text-5xl font-extrabold text-primary">{h?.heading || "आवासीय छात्रावास"}</h1>
      <img src="https://images.unsplash.com/photo-1573894998033-c0cef4ed722b?crop=entropy&cs=srgb&fm=jpg&q=85" alt="Hostel" className="mt-8 w-full h-72 md:h-96 object-cover rounded-3xl shadow-lg" />
      <Card className="mt-8 p-6 md:p-8 rounded-3xl">
        <p className="hindi text-lg text-foreground/85">{h?.body || "छात्रावास संबंधी जानकारी शीघ्र उपलब्ध होगी।"}</p>
      </Card>
    </div>
  );
}
