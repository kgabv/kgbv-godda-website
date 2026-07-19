import React, { useEffect, useState } from "react";
import { api, API, asArray } from "../lib/api";
import { Card } from "../components/ui/card";
import { FileDown, FileText } from "lucide-react";
import { Button } from "../components/ui/button";

export default function Downloads() {
  const [items, setItems] = useState([]);
  useEffect(() => { api.get("/downloads").then((r) => setItems(asArray(r.data))).catch(() => setItems([])); }, []);
  return (
    <div className="max-w-5xl mx-auto px-4 py-12" data-testid="downloads-page">
      <h1 className="text-4xl md:text-5xl font-extrabold text-primary">डाउनलोड</h1>
      <p className="mt-2 text-muted-foreground">विद्यालय के दस्तावेज़ एवं फ़ॉर्म।</p>
      <div className="mt-8 grid md:grid-cols-2 gap-4">
        {items.map((d) => {
          const href = d.file_url.startsWith("http") ? d.file_url : `${API.replace(/\/api$/, "")}${d.file_url}`;
          return (
            <Card key={d.id} className="p-5 rounded-2xl flex items-start gap-4 hover:shadow-lg smooth-color">
              <div className="h-12 w-12 shrink-0 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
                <FileText className="h-6 w-6" />
              </div>
              <div className="flex-1">
                <div className="font-bold">{d.title}</div>
                {d.description && <div className="text-sm mt-1 text-muted-foreground hindi">{d.description}</div>}
                <a href={href} target="_blank" rel="noreferrer" className="inline-block mt-3">
                  <Button size="sm" variant="outline" className="rounded-full" data-testid={`dl-${d.id}`}><FileDown className="h-4 w-4 mr-1"/>डाउनलोड</Button>
                </a>
              </div>
            </Card>
          );
        })}
        {items.length === 0 && <div className="col-span-full text-center text-muted-foreground py-16">कोई फ़ाइल उपलब्ध नहीं।</div>}
      </div>
    </div>
  );
}
