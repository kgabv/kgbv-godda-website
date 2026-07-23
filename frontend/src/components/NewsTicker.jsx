import React, { useEffect, useState } from "react";
import { Bell } from "lucide-react";
import { api } from "../lib/api";

export default function NewsTicker() {
  const [items, setItems] = useState([]);
  useEffect(() => {
    api.get("/notices").then((r) => setItems(Array.isArray(r.data) ? r.data : [])).catch(() => setItems([]));
  }, []);
  const text = items.length ? items : [{ id: "x", title: "स्वागत है — कस्तूरबा गांधी बालिका विद्यालय, गोड्डा" }];
  return (
    <div 
      className="border-y transition-colors duration-200" 
      style={{
        backgroundColor: "var(--ticker-bg, #E6F4FA)",
        borderColor: "var(--ticker-border, #B3E0F2)",
        color: "var(--ticker-text, #003D82)"
      }}
      data-testid="news-ticker"
    >
      <div className="max-w-7xl mx-auto px-4 py-2 flex items-center gap-3 overflow-hidden">
        <div 
          className="shrink-0 flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold text-white shadow-sm transition-colors duration-200"
          style={{
            backgroundColor: "var(--ticker-icon, #00A0E4)",
            color: "#ffffff"
          }}
        >
          <Bell className="h-4 w-4 text-white" /> ताज़ा सूचनाएँ
        </div>
        <div className="relative flex-1 overflow-hidden">
          <div className="ticker-track flex gap-10 whitespace-nowrap will-change-transform">
            {[...text, ...text].map((n, i) => (
              <span 
                key={n.id + "-" + i} 
                className="text-sm font-medium transition-colors duration-150 cursor-pointer ticker-item"
                style={{
                  color: "var(--ticker-text, #003D82)"
                }}
              >
                {n.priority === "urgent" ? "🔔 " : "• "} {n.title}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
