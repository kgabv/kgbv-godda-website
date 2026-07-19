import React, { useEffect, useState } from "react";
import { api } from "../lib/api";
import { Card } from "../components/ui/card";

export default function About() {
  const [about, setAbout] = useState(null);
  useEffect(() => { api.get("/site-content/about").then((r) => setAbout(r.data.value)); }, []);
  return (
    <div className="max-w-6xl mx-auto px-4 py-12" data-testid="about-page">
      <h1 className="text-4xl md:text-5xl font-extrabold text-primary">विद्यालय परिचय</h1>
      <p className="mt-2 text-muted-foreground">कस्तूरबा गांधी बालिका विद्यालय, गोड्डा — झारखंड शिक्षा विभाग</p>
      <img src="https://images.unsplash.com/photo-1709817243586-6ddd4e6822c1?crop=entropy&cs=srgb&fm=jpg&q=85" alt="Campus" className="mt-8 w-full h-72 md:h-96 object-cover rounded-3xl shadow-lg" />
      <div className="mt-8 grid md:grid-cols-3 gap-6">
        <Card className="p-6 rounded-2xl md:col-span-2">
          <h2 className="text-2xl font-bold text-primary">{about?.heading || "हमारे विद्यालय के बारे में"}</h2>
          <p className="mt-3 hindi text-foreground/85">{about?.body}</p>
        </Card>
        <div className="grid gap-4">
          <Card className="p-6 rounded-2xl bg-secondary/10">
            <div className="font-bold text-primary">हमारा उद्देश्य</div>
            <p className="text-sm mt-2 hindi">{about?.mission}</p>
          </Card>
          <Card className="p-6 rounded-2xl bg-accent/40">
            <div className="font-bold text-primary">हमारी दृष्टि</div>
            <p className="text-sm mt-2 hindi">{about?.vision}</p>
          </Card>
        </div>
      </div>
    </div>
  );
}
