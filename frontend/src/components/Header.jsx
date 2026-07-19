import React, { useEffect, useState } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { Menu, X, Sun, Moon } from "lucide-react";
import { useTheme } from "../lib/ThemeContext";
import { LOGO_URL, api } from "../lib/api";
import { Button } from "./ui/button";

const NAV = [
  { to: "/", label: "मुख्य पृष्ठ" },
  { to: "/about", label: "विद्यालय" },
  { to: "/principal", label: "प्रधानाचार्या" },
  { to: "/academics", label: "शिक्षा" },
  { to: "/admission", label: "प्रवेश" },
  { to: "/facilities", label: "सुविधाएँ" },
  { to: "/hostel", label: "छात्रावास" },
  { to: "/staff", label: "शिक्षक" },
  { to: "/activities", label: "गतिविधियाँ" },
  { to: "/gallery", label: "गैलरी" },
  { to: "/videos", label: "वीडियो" },
  { to: "/news", label: "समाचार" },
  { to: "/downloads", label: "डाउनलोड" },
  { to: "/contact", label: "संपर्क" },
];

export default function Header() {
  const { theme, toggle } = useTheme();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [brand, setBrand] = useState(null);
  const [contact, setContact] = useState(null);
  const location = useLocation();

  useEffect(() => setOpen(false), [location.pathname]);
  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 12);
    window.addEventListener("scroll", on);
    return () => window.removeEventListener("scroll", on);
  }, []);
  useEffect(() => {
    api.get("/site-content/branding").then(r => setBrand(r.data?.value)).catch(() => {});
    api.get("/site-content/contact").then(r => setContact(r.data?.value)).catch(() => {});
  }, []);

  const logo = brand?.logo_url || LOGO_URL;
  const name = brand?.school_name || "कस्तूरबा गांधी बालिका विद्यालय";
  const subName = brand?.school_name_short || "गोड्डा, झारखंड · शिक्षा · संस्कार · आत्मनिर्भरता";
  const tagline = brand?.tagline || "";
  const email = contact?.email || "kgabvgodda@gmail.com";

  return (
    <header
      data-testid="site-header"
      className={`sticky top-0 z-50 smooth-color ${scrolled ? "shadow-lg" : ""}`}
    >
      {/* Top strip */}
      <div className="bg-primary text-primary-foreground text-xs md:text-sm">
        <div className="max-w-7xl mx-auto px-4 py-1.5 flex items-center justify-between">
          <span>झारखंड शिक्षा विभाग | पूर्ण आवासीय बालिका विद्यालय</span>
          <span className="hidden md:inline">📧 {email}</span>
        </div>
      </div>
      <div className={`glass ${scrolled ? "py-2" : "py-3"} smooth-color`}>
        <div className="max-w-7xl mx-auto px-4 flex items-center gap-3">
          <Link to="/" className="flex items-center gap-3" data-testid="nav-logo">
            <img src={logo} alt="Logo" className="h-14 w-14 rounded-full object-cover ring-2 ring-primary/20" />
            <div className="leading-tight">
              <div className="text-primary font-extrabold text-base md:text-xl">{name}</div>
              <div className="text-xs md:text-sm text-muted-foreground">{subName}{tagline ? ` · ${tagline}` : ""}</div>
            </div>
          </Link>
          <div className="ml-auto flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggle}
              aria-label="Toggle theme"
              data-testid="theme-toggle"
              className="rounded-full"
            >
              {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </Button>
            <Link to="/admin/login" className="hidden md:inline">
              <Button variant="outline" size="sm" data-testid="header-admin-login">एडमिन</Button>
            </Link>
            <Button
              variant="ghost" size="icon"
              className="md:hidden rounded-full"
              onClick={() => setOpen((v) => !v)}
              data-testid="mobile-menu-toggle"
              aria-label="Toggle menu"
            >
              {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </Button>
          </div>
        </div>
        {/* Desktop nav */}
        <nav className="hidden md:block border-t border-border/40">
          <div className="max-w-7xl mx-auto px-4 flex flex-wrap gap-x-1 gap-y-1 py-2">
            {NAV.map((n) => (
              <NavLink
                key={n.to}
                to={n.to}
                end={n.to === "/"}
                data-testid={`nav-${n.to.replace(/\//g, "") || "home"}`}
                className={({ isActive }) =>
                  `px-3 py-1.5 rounded-full text-sm font-medium smooth-color ${
                    isActive
                      ? "bg-primary text-primary-foreground shadow"
                      : "text-foreground/80 hover:text-primary hover:bg-primary/10"
                  }`
                }
              >
                {n.label}
              </NavLink>
            ))}
          </div>
        </nav>
        {/* Mobile nav */}
        {open && (
          <nav className="md:hidden border-t border-border/40" data-testid="mobile-nav">
            <div className="max-w-7xl mx-auto px-4 py-3 flex flex-col gap-1">
              {NAV.map((n) => (
                <NavLink
                  key={n.to}
                  to={n.to}
                  end={n.to === "/"}
                  className={({ isActive }) =>
                    `px-3 py-2 rounded-lg text-sm font-medium smooth-color ${
                      isActive ? "bg-primary text-primary-foreground" : "hover:bg-primary/10"
                    }`
                  }
                >
                  {n.label}
                </NavLink>
              ))}
              <Link to="/admin/login" className="px-3 py-2 rounded-lg text-sm font-medium border border-border">एडमिन लॉगिन</Link>
            </div>
          </nav>
        )}
      </div>
    </header>
  );
}
