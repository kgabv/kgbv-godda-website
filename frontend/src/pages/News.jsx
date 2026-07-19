import React, { useEffect, useState } from "react";
import { api } from "../lib/api";
import { Card } from "../components/ui/card";
import { Bell, Calendar } from "lucide-react";

export default function News() {
  const [items, setItems] = useState([]);
  useEffect(() => { api.get("/notices?active_only=false").then((r) => setItems(r.data)); }, []);
  return (
    <div className="max-w-5xl mx-auto px-4 py-12" data-testid="news-page">
      <h1 className="text-4xl md:text-5xl font-extrabold text-primary">समाचार एवं सूचनाएँ</h1>
      <p className="mt-2 text-muted-foreground">विद्यालय की महत्वपूर्ण घोषणाएँ एवं समाचार।</p>
      <div className="mt-8 grid gap-4">
        {items.map((n) => (
          <Card key={n.id} className={`p-5 rounded-2xl border-l-4 ${n.priority === "urgent" ? "border-l-red-500 bg-red-500/5" : "border-l-secondary"}`} data-testid={`notice-${n.id}`}>
            <div className="flex items-start gap-3">
              <div className={`h-10 w-10 shrink-0 rounded-full flex items-center justify-center ${n.priority === "urgent" ? "bg-red-500/15 text-red-600" : "bg-secondary/15 text-secondary"}`}>
                <Bell className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-lg">{n.title}</h3>
                {n.body && <p className="text-sm mt-1 hindi">{n.body}</p>}
                <div className="mt-2 text-xs text-muted-foreground flex items-center gap-1"><Calendar className="h-3 w-3"/> {new Date(n.created_at).toLocaleDateString("hi-IN")}</div>
              </div>
            </div>
          </Card>
        ))}
        {items.length === 0 && <div className="text-center text-muted-foreground py-16">कोई सूचना उपलब्ध नहीं।</div>}
      </div>
    </div>
  );
}
