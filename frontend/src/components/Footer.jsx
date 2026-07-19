import React from "react";
import { Link } from "react-router-dom";
import { Mail, Youtube, MapPin, Phone } from "lucide-react";
import { LOGO_URL } from "../lib/api";

export default function Footer() {
  return (
    <footer className="mt-16 border-t border-border bg-primary text-primary-foreground" data-testid="site-footer">
      <div className="max-w-7xl mx-auto px-4 py-12 grid gap-10 md:grid-cols-4">
        <div>
          <div className="flex items-center gap-3">
            <img src={LOGO_URL} alt="Logo" className="h-14 w-14 rounded-full ring-2 ring-white/40" />
            <div>
              <div className="font-extrabold text-lg">कस्तूरबा गांधी बा. वि.</div>
              <div className="text-xs opacity-80">गोड्डा, झारखंड</div>
            </div>
          </div>
          <p className="mt-4 text-sm opacity-90 hindi">शिक्षा • संस्कार • आत्मनिर्भरता — बालिकाओं के लिए एक सुरक्षित एवं गुणवत्तापूर्ण विद्यालय।</p>
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
            <li className="flex items-start gap-2"><MapPin className="h-4 w-4 mt-0.5 shrink-0" /><span>कस्तूरबा गांधी बालिका विद्यालय, गोड्डा, झारखंड</span></li>
            <li className="flex items-center gap-2"><Mail className="h-4 w-4" /><a href="mailto:kgabvgodda@gmail.com" className="hover:underline">kgabvgodda@gmail.com</a></li>
            <li className="flex items-center gap-2"><Youtube className="h-4 w-4" /><a href="https://www.youtube.com/@kgbvgodda" target="_blank" rel="noreferrer" className="hover:underline">@kgbvgodda</a></li>
          </ul>
        </div>
        <div>
          <h4 className="font-bold mb-3">स्थान</h4>
          <div className="rounded-xl overflow-hidden ring-1 ring-white/20">
            <iframe
              title="school-location"
              src="https://maps.google.com/maps?q=24.795789,87.299783&z=15&output=embed"
              width="100%" height="160" style={{ border: 0 }} loading="lazy" referrerPolicy="no-referrer-when-downgrade"
            />
          </div>
        </div>
      </div>
      <div className="border-t border-white/15">
        <div className="max-w-7xl mx-auto px-4 py-4 text-xs flex flex-wrap gap-3 items-center justify-between opacity-90">
          <span>© {new Date().getFullYear()} KGBV Godda. सर्वाधिकार सुरक्षित।</span>
          <div className="flex gap-4">
            <Link to="/privacy" className="hover:underline">गोपनीयता नीति</Link>
            <Link to="/terms" className="hover:underline">नियम एवं शर्तें</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
