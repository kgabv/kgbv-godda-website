import React, { useEffect, useState } from "react";
import { ArrowUp, MessageCircle } from "lucide-react";

export default function FloatingButtons() {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const on = () => setShow(window.scrollY > 400);
    window.addEventListener("scroll", on);
    return () => window.removeEventListener("scroll", on);
  }, []);
  return (
    <div className="fixed bottom-5 right-5 z-40 flex flex-col gap-3" data-testid="floating-actions">
      <a
        href="https://wa.me/919999999999"
        target="_blank" rel="noreferrer"
        className="h-12 w-12 rounded-full bg-emerald-500 text-white shadow-xl flex items-center justify-center hover:scale-105 smooth-color"
        aria-label="WhatsApp"
        data-testid="whatsapp-button"
      >
        <MessageCircle className="h-6 w-6" />
      </a>
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
