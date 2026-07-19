import React, { useEffect, useState } from "react";
import { api } from "../lib/api";
import { Card } from "../components/ui/card";

export default function VideoGallery() {
  const [videos, setVideos] = useState([]);
  useEffect(() => { api.get("/videos").then((r) => setVideos(r.data)); }, []);
  return (
    <div className="max-w-7xl mx-auto px-4 py-12" data-testid="videos-page">
      <h1 className="text-4xl md:text-5xl font-extrabold text-primary">वीडियो गैलरी</h1>
      <p className="mt-2 text-muted-foreground">YouTube चैनल: <a href="https://www.youtube.com/@kgbvgodda" target="_blank" rel="noreferrer" className="underline text-primary">@kgbvgodda</a></p>
      <div className="mt-8 grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {videos.map((v) => (
          <Card key={v.id} className="rounded-2xl overflow-hidden hover:shadow-xl smooth-color" data-testid={`video-${v.id}`}>
            <div className="aspect-video w-full">
              <iframe
                title={v.title}
                className="w-full h-full"
                src={`https://www.youtube.com/embed/${v.youtube_id}?mute=1&rel=0`}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
            <div className="p-4">
              <div className="font-bold">{v.title}</div>
              {v.description && <div className="text-sm mt-1 text-muted-foreground hindi">{v.description}</div>}
            </div>
          </Card>
        ))}
        {videos.length === 0 && <div className="col-span-full text-center text-muted-foreground py-16">कोई वीडियो उपलब्ध नहीं।</div>}
      </div>
    </div>
  );
}
