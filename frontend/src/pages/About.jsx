import React, { useEffect, useState } from "react";
import { api } from "../lib/api";
import { Card } from "../components/ui/card";

export default function About() {
  const [about, setAbout] = useState(() => {
    try {
      const cached = localStorage.getItem("kgbv-about-cache");
      return cached ? JSON.parse(cached) : null;
    } catch {
      return null;
    }
  });
  const [vidyalayaParichay, setVidyalayaParichay] = useState(() => {
    try {
      const cached = localStorage.getItem("kgbv-parichay-cache");
      return cached ? JSON.parse(cached) : null;
    } catch {
      return null;
    }
  });
  const [vision, setVision] = useState(() => {
    try {
      const cached = localStorage.getItem("kgbv-vision-cache");
      return cached ? JSON.parse(cached) : null;
    } catch {
      return null;
    }
  });
  const [mission, setMission] = useState(() => {
    try {
      const cached = localStorage.getItem("kgbv-mission-cache");
      return cached ? JSON.parse(cached) : null;
    } catch {
      return null;
    }
  });

  const [loading, setLoading] = useState(!about && !vidyalayaParichay);

  useEffect(() => {
    const p1 = api.get("/site-content/about").then((r) => {
      if (r.data?.value) {
        setAbout(r.data.value);
        try {
          localStorage.setItem("kgbv-about-cache", JSON.stringify(r.data.value));
        } catch {}
      }
    }).catch(() => {});

    const p2 = api.get("/site-content/vidyalaya_parichay").then((r) => {
      if (r.data?.value) {
        setVidyalayaParichay(r.data.value);
        try {
          localStorage.setItem("kgbv-parichay-cache", JSON.stringify(r.data.value));
        } catch {}
      }
    }).catch(() => {});

    const p3 = api.get("/site-content/vision").then((r) => {
      if (r.data?.value) {
        setVision(r.data.value);
        try {
          localStorage.setItem("kgbv-vision-cache", JSON.stringify(r.data.value));
        } catch {}
      }
    }).catch(() => {});

    const p4 = api.get("/site-content/mission").then((r) => {
      if (r.data?.value) {
        setMission(r.data.value);
        try {
          localStorage.setItem("kgbv-mission-cache", JSON.stringify(r.data.value));
        } catch {}
      }
    }).catch(() => {});

    Promise.allSettled([p1, p2, p3, p4]).finally(() => {
      setLoading(false);
    });
  }, []);

  if (loading && !about && !vidyalayaParichay) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-12 animate-pulse" id="about-loading-skeleton">
        <div className="h-10 w-1/3 bg-muted rounded-xl mb-2" />
        <div className="h-4 w-1/4 bg-muted rounded-xl mb-8" />
        <div className="w-full h-72 md:h-96 bg-muted rounded-3xl mb-8" />
        <div className="grid md:grid-cols-3 gap-6">
          <div className="h-64 bg-muted rounded-3xl md:col-span-2" />
          <div className="space-y-4">
            <div className="h-28 bg-muted rounded-3xl" />
            <div className="h-28 bg-muted rounded-3xl" />
          </div>
        </div>
      </div>
    );
  }

  const heading = vidyalayaParichay?.heading || about?.heading || "हमारे विद्यालय के बारे में";
  const body = vidyalayaParichay?.body || about?.body || "";
  const imageUrl = vidyalayaParichay?.image_url || about?.image_url || "https://images.unsplash.com/photo-1709817243586-6ddd4e6822c1?crop=entropy&cs=srgb&fm=jpg&q=85";

  return (
    <div className="max-w-6xl mx-auto px-4 py-12" data-testid="about-page">
      <h1 className="text-4xl md:text-5xl font-extrabold text-primary">विद्यालय परिचय</h1>
      <p className="mt-2 text-muted-foreground">कस्तूरबा गांधी बालिका विद्यालय, गोड्डा — झारखंड शिक्षा विभाग</p>
      <img src={imageUrl} alt="Campus" className="mt-8 w-full h-72 md:h-96 object-cover rounded-3xl shadow-lg" />
      <div className="mt-8 grid md:grid-cols-3 gap-6">
        <Card className="p-6 rounded-2xl md:col-span-2">
          <h2 className="text-2xl font-bold text-primary">{heading}</h2>
          <p className="mt-3 hindi text-foreground/85">{body}</p>
        </Card>
        <div className="grid gap-4">
          <Card className="p-6 rounded-2xl bg-secondary/10">
            <div className="font-bold text-primary">{mission?.title || "हमारा उद्देश्य"}</div>
            <p className="text-sm mt-2 hindi">{mission?.body || about?.mission}</p>
          </Card>
          <Card className="p-6 rounded-2xl bg-accent/40">
            <div className="font-bold text-primary">{vision?.title || "हमारी दृष्टि"}</div>
            <p className="text-sm mt-2 hindi">{vision?.body || about?.vision}</p>
          </Card>
        </div>
      </div>
    </div>
  );
}
