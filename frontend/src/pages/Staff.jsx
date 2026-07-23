import React, { useEffect, useState } from "react";
import { api, asArray, resolveImageUrl, DEFAULT_FALLBACK_IMAGE } from "../lib/api";
import { Card } from "../components/ui/card";

export default function Staff() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { 
    setLoading(true);
    api.get("/teachers")
      .then(r => setItems(asArray(r.data)))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, []);

  const teaching = items.filter(t => t.category !== "non_teaching");
  const nonTeaching = items.filter(t => t.category === "non_teaching");

  const Section = ({ title, list }) => list.length > 0 && (
    <div className="mt-10">
      <h2 className="text-2xl md:text-3xl font-bold text-primary mb-6">{title}</h2>
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {list.map(t => (
          <Card key={t.id} className="p-4 rounded-2xl text-center hover:shadow-xl smooth-color">
            {t.image_url ? (
              <img 
                src={resolveImageUrl(t.image_url)} 
                alt={t.name} 
                className="h-32 w-32 mx-auto rounded-full object-cover ring-2 ring-primary/20"
                onError={(e) => {
                  e.currentTarget.onerror = null;
                  e.currentTarget.src = DEFAULT_FALLBACK_IMAGE;
                }}
              />
            ) : (
              <div className="h-32 w-32 mx-auto rounded-full bg-primary/10 flex items-center justify-center text-3xl text-primary font-bold">{t.name?.[0] || "—"}</div>
            )}
            <div className="mt-3 font-bold">{t.name}</div>
            <div className="text-xs text-muted-foreground">{t.role}</div>
            {t.bio && <div className="text-xs mt-2 text-foreground/70 hindi">{t.bio}</div>}
          </Card>
        ))}
      </div>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto px-4 py-12" data-testid="staff-page">
      <h1 className="text-4xl md:text-5xl font-extrabold text-primary">शिक्षक एवं स्टाफ</h1>
      <p className="mt-2 text-muted-foreground">विद्यालय की शिक्षिकाएँ एवं गैर-शिक्षण कर्मचारी।</p>
      
      {loading ? (
        <div className="mt-10 grid sm:grid-cols-2 lg:grid-cols-4 gap-5 animate-pulse">
          {[...Array(4)].map((_, idx) => (
            <div key={idx} className="h-48 bg-muted rounded-2xl" />
          ))}
        </div>
      ) : (
        <>
          {items.length === 0 && <div className="mt-16 text-center text-muted-foreground">कोई विवरण उपलब्ध नहीं। एडमिन पैनल से जोड़ें।</div>}
          <Section title="शिक्षिकाएँ" list={teaching}/>
          <Section title="गैर-शिक्षण कर्मचारी" list={nonTeaching}/>
        </>
      )}
    </div>
  );
}
