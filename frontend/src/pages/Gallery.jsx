import React, { useEffect, useState, useMemo } from "react";
import { api } from "../lib/api";
import Lightbox from "../components/Lightbox";
import { motion } from "framer-motion";
import { Search } from "lucide-react";

const CATS = ["All", "Campus", "Classrooms", "Hostel", "Library", "Laboratory", "Activities", "Sports", "Events", "Educational Tours", "Celebrations", "Teachers", "Students", "Infrastructure"];

export default function Gallery() {
  const [items, setItems] = useState([]);
  const [cat, setCat] = useState("All");
  const [q, setQ] = useState("");
  const [box, setBox] = useState(null);

  useEffect(() => { api.get("/gallery").then((r) => setItems(r.data)); }, []);

  const filtered = useMemo(() => items.filter(i =>
    (cat === "All" || i.category === cat) &&
    (i.title.toLowerCase().includes(q.toLowerCase()) || (i.caption || "").toLowerCase().includes(q.toLowerCase()))
  ), [items, cat, q]);

  return (
    <div className="max-w-7xl mx-auto px-4 py-12" data-testid="gallery-page">
      <h1 className="text-4xl md:text-5xl font-extrabold text-primary">फोटो गैलरी</h1>
      <p className="mt-2 text-muted-foreground">विद्यालय के महत्वपूर्ण क्षण एवं गतिविधियाँ।</p>

      <div className="mt-8 flex flex-wrap items-center gap-3">
        <div className="relative">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            data-testid="gallery-search"
            className="pl-9 pr-3 py-2 rounded-full border border-border bg-card"
            placeholder="खोजें..."
            value={q} onChange={(e)=>setQ(e.target.value)}
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {CATS.map((c) => (
            <button
              key={c}
              onClick={() => setCat(c)}
              data-testid={`gallery-cat-${c.replace(/\s/g, "-").toLowerCase()}`}
              className={`px-3 py-1.5 rounded-full text-sm font-medium border smooth-color ${
                cat === c ? "bg-primary text-primary-foreground border-primary" : "bg-card hover:bg-primary/10 border-border"
              }`}
            >{c === "All" ? "सभी" : c}</button>
          ))}
        </div>
      </div>

      <div className="mt-8 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {filtered.map((g, i) => (
          <motion.button
            key={g.id}
            onClick={() => setBox(g.image_url)}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: (i % 8) * 0.03 }}
            className="group relative rounded-2xl overflow-hidden shadow-md focus:outline-none focus:ring-4 focus:ring-primary/40"
            data-testid={`gallery-item-${g.id}`}
          >
            <img src={g.image_url} alt={g.title} loading="lazy" className="w-full h-40 md:h-48 object-cover group-hover:scale-105 smooth-color" />
            <div className="absolute inset-x-0 bottom-0 p-2 bg-gradient-to-t from-black/70 to-transparent text-white text-xs text-left">
              <div className="font-semibold">{g.title}</div>
              <div className="opacity-80">{g.category}</div>
            </div>
          </motion.button>
        ))}
        {filtered.length === 0 && <div className="col-span-full text-center text-muted-foreground py-16">कोई चित्र उपलब्ध नहीं।</div>}
      </div>

      <Lightbox src={box} onClose={() => setBox(null)} />
    </div>
  );
}
