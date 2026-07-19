import React, { useEffect } from "react";
import { X } from "lucide-react";

export default function Lightbox({ src, onClose }) {
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);
  if (!src) return null;
  return (
    <div
      className="fixed inset-0 z-[100] bg-black/85 backdrop-blur-md flex items-center justify-center p-4"
      onClick={onClose}
      data-testid="lightbox"
    >
      <button
        onClick={onClose}
        className="absolute top-5 right-5 h-10 w-10 rounded-full bg-white/10 hover:bg-white/25 text-white flex items-center justify-center"
        aria-label="Close"
        data-testid="lightbox-close"
      >
        <X className="h-5 w-5" />
      </button>
      <img src={src} alt="" className="max-h-[90vh] max-w-[95vw] rounded-2xl shadow-2xl object-contain" onClick={(e)=>e.stopPropagation()} />
    </div>
  );
}
