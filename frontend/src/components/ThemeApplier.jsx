import React, { useEffect } from "react";
import { api } from "../lib/api";

// Convert hex color (#RRGGBB) to CSS "H S% L%" (no wrapper hsl()).
function hexToHslParts(hex) {
  if (!hex || !/^#([0-9a-f]{6})$/i.test(hex)) return null;
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
      default: break;
    }
    h /= 6;
  }
  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

const MAP = {
  primary: "--primary",
  secondary: "--secondary",
  accent: "--accent",
  background: "--background",
};

export default function ThemeApplier() {
  useEffect(() => {
    api.get("/site-content/theme").then((r) => {
      const t = r.data?.value;
      if (!t) return;
      const root = document.documentElement;
      Object.entries(MAP).forEach(([k, cssVar]) => {
        const parts = hexToHslParts(t[k]);
        if (parts) root.style.setProperty(cssVar, parts);
      });
    }).catch(() => {});
  }, []);
  return null;
}
