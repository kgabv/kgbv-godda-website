import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { GraduationCap, Home as HomeIcon, ShieldCheck, Utensils, Wifi, BookOpen, FlaskConical, Cpu, Camera, Users, Trophy, Sparkles, ArrowRight } from "lucide-react";
import { api, LOGO_URL, asArray } from "../lib/api";
import AnimatedCounter from "../components/AnimatedCounter";
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";

const HERO_IMG = "https://images.unsplash.com/photo-1573894998033-c0cef4ed722b?crop=entropy&cs=srgb&fm=jpg&q=85";
const ABOUT_IMG = "https://images.unsplash.com/flagged/photo-1574097656146-0b43b7660cb6?crop=entropy&cs=srgb&fm=jpg&q=85";

const FAC = [
  { icon: HomeIcon, label: "आवासीय छात्रावास" },
  { icon: BookOpen, label: "स्मार्ट क्लासरूम" },
  { icon: FlaskConical, label: "विज्ञान प्रयोगशाला" },
  { icon: Cpu, label: "कंप्यूटर शिक्षा" },
  { icon: Wifi, label: "वाई-फाई कैंपस" },
  { icon: ShieldCheck, label: "CCTV सुरक्षा" },
  { icon: Utensils, label: "भोजनालय" },
  { icon: Trophy, label: "खेल का मैदान" },
];

export default function Home() {
  const [hero, setHero] = useState(null);
  const [about, setAbout] = useState(null);
  const [gallery, setGallery] = useState([]);
  const [banners, setBanners] = useState([]);
  const [stats, setStats] = useState({ students: 500, teachers: 30, classes: 7, awards: 45 });
  const [bIdx, setBIdx] = useState(0);

  useEffect(() => {
    api.get("/site-content/hero").then((r) => setHero(r.data.value)).catch(() => {});
    api.get("/site-content/about").then((r) => setAbout(r.data.value)).catch(() => {});
    api.get("/gallery").then((r) => setGallery(asArray(r.data).slice(0, 6))).catch(() => setGallery([]));
    api.get("/banners").then((r) => setBanners(asArray(r.data))).catch(() => setBanners([]));
    api.get("/stats").then((r) => setStats(r.data)).catch(() => {});
  }, []);

  useEffect(() => {
    if (banners.length < 2) return;
    const t = setInterval(() => setBIdx((i) => (i + 1) % banners.length), 5000);
    return () => clearInterval(t);
  }, [banners.length]);

  const heroBg = banners[bIdx]?.image_url || HERO_IMG;

  return (
    <div data-testid="home-page">
      {/* Hero */}
      <section className="relative overflow-hidden bg-slate-950 min-h-[350px] sm:min-h-[500px] md:min-h-[550px] lg:min-h-[600px] flex flex-col justify-center">
        {/* Ambient background blur using the same banner image to pad non-standard aspect ratios beautifully */}
        <img src={heroBg} alt="" className="absolute inset-0 h-full w-full object-cover filter blur-2xl opacity-25 scale-105" />
        
        {/* Full non-cropped main banner image (using object-contain for full visibility without cropping) */}
        <img src={heroBg} alt="" className="absolute inset-0 h-full w-full object-contain" loading="eager" />
        
        {/* Overlays for depth and text legibility */}
        <div className="absolute inset-0 bg-black/45 hero-overlay" />
        
        <div className="relative max-w-7xl mx-auto px-4 py-24 md:py-36 text-white w-full z-10">
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }}>
            <img src={LOGO_URL} alt="Logo" className="h-24 w-24 rounded-full ring-4 ring-white/30 shadow-2xl" />
            <h1 className="mt-6 text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight max-w-3xl drop-shadow-md">
              {hero?.title || "कस्तूरबा गांधी बालिका विद्यालय, गोड्डा"}
            </h1>
            <div className="mt-4 inline-block px-4 py-1.5 rounded-full bg-white/15 backdrop-blur border border-white/25 text-base md:text-lg font-semibold shadow-md">
              {hero?.subtitle || "शिक्षा • संस्कार • आत्मनिर्भरता"}
            </div>
            <p className="mt-6 max-w-2xl text-base md:text-lg text-white/95 hindi drop-shadow">
              {hero?.description || "ग्रामीण एवं वंचित वर्ग की बालिकाओं के लिए झारखंड शिक्षा विभाग द्वारा संचालित पूर्ण आवासीय विद्यालय।"}
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/admission"><Button size="lg" className="rounded-full shadow-lg" data-testid="hero-admission-btn">प्रवेश जानकारी<ArrowRight className="ml-2 h-4 w-4"/></Button></Link>
              <Link to="/about"><Button size="lg" variant="outline" className="rounded-full bg-white/10 text-white border-white/40 hover:bg-white/20 shadow-lg" data-testid="hero-about-btn">विद्यालय के बारे में</Button></Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Stats */}
      <section className="max-w-7xl mx-auto px-4 py-12" data-testid="stats-section">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <AnimatedCounter end={Number(stats.students) || 0} label="छात्राएँ" testId="counter-students" />
          <AnimatedCounter end={Number(stats.teachers) || 0} label="शिक्षक/स्टाफ" testId="counter-teachers" />
          <AnimatedCounter end={Number(stats.classes) || 0} label="कक्षाएँ (VI-XII)" suffix="" testId="counter-classes" />
          <AnimatedCounter end={Number(stats.awards) || 0} label="पुरस्कार व सम्मान" testId="counter-awards" />
        </div>
      </section>

      {/* About preview */}
      <section className="max-w-7xl mx-auto px-4 py-16 grid md:grid-cols-2 gap-10 items-center" data-testid="about-preview">
        <img src={ABOUT_IMG} alt="Students" className="rounded-3xl shadow-xl object-cover w-full h-[380px]" />
        <div>
          <div className="inline-flex items-center gap-2 text-sm font-semibold text-primary bg-primary/10 px-3 py-1 rounded-full">
            <Sparkles className="h-4 w-4" /> हमारे बारे में
          </div>
          <h2 className="mt-3 text-3xl md:text-4xl font-extrabold">बालिकाओं के सर्वांगीण विकास का केंद्र</h2>
          <p className="mt-4 hindi text-foreground/85">{about?.body || "कस्तूरबा गांधी बालिका विद्यालय, गोड्डा एक पूर्ण आवासीय विद्यालय है जो बालिकाओं को कक्षा VI से XII तक निःशुल्क गुणवत्तापूर्ण शिक्षा प्रदान करता है।"}</p>
          <div className="mt-6 grid sm:grid-cols-2 gap-4">
            <Card className="p-4 rounded-2xl">
              <div className="font-bold text-primary">हमारा उद्देश्य</div>
              <div className="text-sm mt-1 hindi">{about?.mission}</div>
            </Card>
            <Card className="p-4 rounded-2xl">
              <div className="font-bold text-primary">हमारी दृष्टि</div>
              <div className="text-sm mt-1 hindi">{about?.vision}</div>
            </Card>
          </div>
          <Link to="/about" className="inline-flex items-center gap-2 mt-6 text-primary font-semibold">और जानें <ArrowRight className="h-4 w-4"/></Link>
        </div>
      </section>

      {/* Facilities preview */}
      <section className="bg-accent/40 py-16" data-testid="facilities-preview">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center">
            <h2 className="text-3xl md:text-4xl font-extrabold">विश्वस्तरीय सुविधाएँ</h2>
            <p className="mt-2 text-muted-foreground">छात्राओं के सुरक्षित एवं समग्र विकास हेतु आधुनिक व्यवस्थाएँ</p>
          </div>
          <div className="mt-10 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {FAC.map((f, i) => (
              <motion.div key={f.label} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.05 }}>
                <Card className="p-5 rounded-2xl h-full hover:shadow-xl smooth-color hover:-translate-y-1">
                  <f.icon className="h-8 w-8 text-secondary" />
                  <div className="mt-3 font-semibold">{f.label}</div>
                </Card>
              </motion.div>
            ))}
          </div>
          <div className="text-center mt-8">
            <Link to="/facilities"><Button variant="outline" className="rounded-full" data-testid="see-all-facilities">सभी सुविधाएँ देखें</Button></Link>
          </div>
        </div>
      </section>

      {/* Gallery preview */}
      <section className="max-w-7xl mx-auto px-4 py-16" data-testid="gallery-preview">
        <div className="flex items-end justify-between flex-wrap gap-4">
          <div>
            <h2 className="text-3xl md:text-4xl font-extrabold">विद्यालय के क्षण</h2>
            <p className="mt-2 text-muted-foreground">हमारी छात्राओं की उपलब्धियाँ एवं गतिविधियाँ</p>
          </div>
          <Link to="/gallery"><Button variant="ghost" className="rounded-full">पूरी गैलरी <ArrowRight className="h-4 w-4 ml-1"/></Button></Link>
        </div>
        <div className="mt-8 grid grid-cols-2 md:grid-cols-3 gap-3">
          {asArray(gallery).map((g, i) => (
            <motion.img
              key={g.id}
              src={g.image_url}
              alt={g.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.05 }}
              className={`w-full object-cover rounded-2xl shadow-md ${i % 5 === 0 ? "h-64 md:col-span-2" : "h-40 md:h-56"}`}
              loading="lazy"
            />
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-7xl mx-auto px-4 pb-16">
        <div className="rounded-3xl bg-primary text-primary-foreground p-8 md:p-12 flex flex-col md:flex-row items-center gap-6 justify-between">
          <div>
            <h3 className="text-2xl md:text-3xl font-extrabold">विद्यालय भ्रमण की योजना बनाएं</h3>
            <p className="opacity-90 mt-2">अभिभावकों एवं छात्राओं के लिए विद्यालय दर्शन उपलब्ध है।</p>
          </div>
          <Link to="/contact"><Button size="lg" variant="secondary" className="rounded-full" data-testid="cta-contact">संपर्क करें</Button></Link>
        </div>
      </section>
    </div>
  );
}
