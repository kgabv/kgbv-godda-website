import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Mail, Youtube, MapPin, Facebook, Instagram, Twitter } from "lucide-react";
import { LOGO_URL, api } from "../lib/api";

export default function Footer() {
  const [brand, setBrand] = useState(null);
  const [contact, setContact] = useState(null);
  const [social, setSocial] = useState(null);
  const [footer, setFooter] = useState(null);

  useEffect(() => {
    api.get("/site-content/branding").then(r => setBrand(r.data?.value)).catch(() => {});
    api.get("/site-content/contact").then(r => setContact(r.data?.value)).catch(() => {});
    api.get("/site-content/social").then(r => setSocial(r.data?.value)).catch(() => {});
    api.get("/site-content/footer").then(r => setFooter(r.data?.value)).catch(() => {});
  }, []);

  const logo = brand?.logo_url || LOGO_URL;
  const schoolName = brand?.school_name || "कस्तूरबा गांधी बालिका विद्यालय";
  const location = brand?.school_name_short || "गोड्डा, झारखंड";
  const aboutText = footer?.about_text || "शिक्षा • संस्कार • आत्मनिर्भरता — बालिकाओं के लिए एक सुरक्षित एवं गुणवत्तापूर्ण विद्यालय।";
  const copyright = footer?.copyright || `© ${new Date().getFullYear()} KGBV Godda. सर्वाधिकार सुरक्षित।`;
  const email = contact?.email || "kgabvgodda@gmail.com";
  const address = contact?.address || "कस्तूरबा गांधी बालिका विद्यालय, गोड्डा, झारखंड";
  const youtube = social?.youtube || "https://www.youtube.com/@kgbvgodda";
  const lat = contact?.map_lat ?? 24.795789;
  const lng = contact?.map_lng ?? 87.299783;

  return (
    <footer className="mt-16 border-t border-border bg-primary text-primary-foreground" data-testid="site-footer">
      <div className="max-w-7xl mx-auto px-4 py-12 grid gap-10 md:grid-cols-4">
        <div>
          <div className="flex items-center gap-3">
            <img src={logo} alt="Logo" className="h-14 w-14 rounded-full ring-2 ring-white/40" />
            <div>
              <div className="font-extrabold text-lg">{schoolName}</div>
              <div className="text-xs opacity-80">{location}</div>
            </div>
          </div>
          <p className="mt-4 text-sm opacity-90 hindi">{aboutText}</p>
          <div className="mt-4 flex gap-3">
            {social?.facebook && <a href={social.facebook} target="_blank" rel="noreferrer" aria-label="Facebook" className="hover:opacity-80"><Facebook className="h-5 w-5"/></a>}
            {social?.instagram && <a href={social.instagram} target="_blank" rel="noreferrer" aria-label="Instagram" className="hover:opacity-80"><Instagram className="h-5 w-5"/></a>}
            {social?.twitter && <a href={social.twitter} target="_blank" rel="noreferrer" aria-label="Twitter" className="hover:opacity-80"><Twitter className="h-5 w-5"/></a>}
            {youtube && <a href={youtube} target="_blank" rel="noreferrer" aria-label="YouTube" className="hover:opacity-80"><Youtube className="h-5 w-5"/></a>}
          </div>
        </div>
        <div>
          <h4 className="font-bold mb-3">तेज़ लिंक</h4>
          <ul className="space-y-2 text-sm opacity-90">
            <li><Link to="/about" className="hover:underline">हमारे बारे में</Link></li>
            <li><Link to="/admission" className="hover:underline">प्रवेश</Link></li>
            <li><Link to="/facilities" className="hover:underline">सुविधाएँ</Link></li>
            <li><Link to="/gallery" className="hover:underline">फोटो गैलरी</Link></li>
            <li><Link to="/videos" className="hover:underline">वीडियो गैलरी</Link></li>
            <li><Link to="/downloads" className="hover:underline">डाउनलोड</Link></li>
            <li><Link to="/contact" className="hover:underline">संपर्क</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="font-bold mb-3">संपर्क</h4>
          <ul className="space-y-3 text-sm opacity-95">
            <li className="flex items-start gap-2"><MapPin className="h-4 w-4 mt-0.5 shrink-0" /><span>{address}</span></li>
            <li className="flex items-center gap-2"><Mail className="h-4 w-4" /><a href={`mailto:${email}`} className="hover:underline">{email}</a></li>
            {youtube && <li className="flex items-center gap-2"><Youtube className="h-4 w-4" /><a href={youtube} target="_blank" rel="noreferrer" className="hover:underline">YouTube</a></li>}
          </ul>
        </div>
        <div>
          <h4 className="font-bold mb-3">स्थान</h4>
          <div className="rounded-xl overflow-hidden ring-1 ring-white/20">
            <iframe
              title="school-location"
              src={`https://maps.google.com/maps?q=${lat},${lng}&z=15&output=embed`}
              width="100%" height="160" style={{ border: 0 }} loading="lazy" referrerPolicy="no-referrer-when-downgrade"
            />
          </div>
        </div>
      </div>
      <div className="border-t border-white/15">
        <div className="max-w-7xl mx-auto px-4 py-4 text-xs flex flex-wrap gap-3 items-center justify-between opacity-90">
          <span>{copyright}</span>
          <div className="flex gap-4">
            <Link to="/privacy" className="hover:underline">गोपनीयता नीति</Link>
            <Link to="/terms" className="hover:underline">नियम एवं शर्तें</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
