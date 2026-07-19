import React, { useEffect, useState } from "react";
import { ArrowUp, MessageCircle } from "lucide-react";
import { api } from "../lib/api";

export default function FloatingButtons() {
  const [show, setShow] = useState(false);
  const [wa, setWa] = useState("");
  useEffect(() => {
    const on = () => setShow(window.scrollY > 400);
    window.addEventListener("scroll", on);
    return () => window.removeEventListener("scroll", on);
  }, []);
  useEffect(() => {
    api.get("/site-content/contact").then((r) => {
      const num = (r.data?.value?.whatsapp || "").replace(/[^\d]/g, "");
      if (num) setWa(num);
    }).catch(() => {});
  }, []);
  return (
    <div className="fixed bottom-5 right-5 z-40 flex flex-col gap-3" data-testid="floating-actions">
      {wa && (
        <a
          href={`https://wa.me/${wa}`}
          target="_blank" rel="noreferrer"
          className="h-12 w-12 rounded-full bg-emerald-500 text-white shadow-xl flex items-center justify-center hover:scale-105 smooth-color"
          aria-label="WhatsApp"
          data-testid="whatsapp-button"
        >
          <MessageCircle className="h-6 w-6" />
        </a>
      )}
      {show && (
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          className="h-12 w-12 rounded-full bg-primary text-primary-foreground shadow-xl flex items-center justify-center hover:scale-105 smooth-color"
          aria-label="Top"
          data-testid="scroll-top-button"
        >
          <ArrowUp className="h-6 w-6" />
        </button>
      )}
    </div>
  );
}
