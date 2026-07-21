import React, { useEffect, useState } from "react";
import { api } from "../lib/api";
import { Card } from "../components/ui/card";
import { Eye, Image as ImageIcon } from "lucide-react";

export default function Hostel() {
  const [h, setH] = useState(null);
  const [activeImage, setActiveImage] = useState(null);

  useEffect(() => {
    api.get("/site-content/hostel")
      .then((r) => setH(r.data?.value))
      .catch(() => {});
  }, []);

  const heading = h?.heading || "आवासीय छात्रावास";
  const body = h?.body || "छात्रावास संबंधी जानकारी शीघ्र उपलब्ध होगी।";
  
  // Filter only visible images
  const images = (h?.images || []).filter(img => img.visible !== false);
  
  // Main featured image is the first visible image, or a default fallback
  const featuredImage = images.length > 0 
    ? images[0].url 
    : "https://images.unsplash.com/photo-1573894998033-c0cef4ed722b?crop=entropy&cs=srgb&fm=jpg&q=85";

  return (
    <div className="max-w-6xl mx-auto px-4 py-12 animate-fade-in" data-testid="hostel-page">
      {/* Title */}
      <div className="text-center md:text-left mb-8" id="hostel-title-section">
        <h1 className="text-4xl md:text-5xl font-extrabold text-primary tracking-tight" id="hostel-heading">{heading}</h1>
        <p className="mt-2 text-muted-foreground" id="hostel-subheading">कस्तूरबा गांधी बालिका विद्यालय, गोड्डा — सुरक्षित एवं आरामदायक आवास</p>
      </div>

      {/* Main Image Banner with gradient overlay */}
      <div className="relative w-full h-[300px] md:h-[450px] rounded-3xl shadow-xl overflow-hidden group" id="hostel-banner-container">
        <img 
          src={featuredImage} 
          alt={heading} 
          loading="lazy"
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" 
          id="hostel-featured-image"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />
        {images.length > 0 && images[0].caption && (
          <div className="absolute bottom-6 left-6 text-white" id="hostel-banner-caption">
            <p className="text-sm bg-primary/80 backdrop-blur-sm px-3 py-1 rounded-full w-fit mb-2 font-medium">विशेष रूप से प्रस्तुत</p>
            <h2 className="text-xl md:text-2xl font-bold">{images[0].caption}</h2>
          </div>
        )}
      </div>

      {/* Description card */}
      <Card className="mt-10 p-6 md:p-10 rounded-3xl border border-primary/10 shadow-lg bg-card/50 backdrop-blur-sm" id="hostel-desc-card">
        <h3 className="text-2xl font-bold text-primary mb-4 flex items-center gap-2" id="hostel-desc-title">
          <span className="h-2 w-2 rounded-full bg-primary inline-block"></span>
          छात्रावास परिचय एवं सुविधाएँ
        </h3>
        <p className="hindi text-lg leading-relaxed text-foreground/90 whitespace-pre-line" id="hostel-desc-body">{body}</p>
      </Card>

      {/* Gallery section */}
      {images.length > 0 && (
        <div className="mt-16" id="hostel-gallery-section">
          <div className="border-b border-border pb-4 mb-8 flex items-center gap-3">
            <ImageIcon className="h-6 w-6 text-primary" />
            <h3 className="text-2xl md:text-3xl font-extrabold text-foreground" id="hostel-gallery-title">छात्रावास चित्र गैलरी</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6" id="hostel-gallery-grid">
            {images.map((img, idx) => (
              <div 
                key={img.id || idx}
                id={`hostel-gallery-item-${idx}`}
                onClick={() => setActiveImage(img)}
                className="group relative cursor-pointer overflow-hidden rounded-2xl bg-muted aspect-[4/3] shadow-md transition-all duration-300 hover:shadow-xl hover:-translate-y-1"
              >
                <img 
                  src={img.url} 
                  alt={img.caption || "Hostel Image"} 
                  loading="lazy"
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
                {/* Hover overlay */}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-4">
                  <div className="flex items-center gap-2 text-white/90 mb-1 text-sm font-semibold">
                    <Eye className="h-4 w-4" /> बड़ा देखें
                  </div>
                  {img.caption && (
                    <p className="text-white text-sm truncate font-medium">{img.caption}</p>
                  )}
                </div>
                {/* Static caption on bottom for small screens/touch without hover */}
                {img.caption && (
                  <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 to-transparent p-3 pt-6 group-hover:opacity-0 transition-opacity duration-300">
                    <p className="text-white text-xs truncate font-medium">{img.caption}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Lightbox / Image Preview Modal */}
      {activeImage && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 p-4 animate-fade-in"
          onClick={() => setActiveImage(null)}
          id="hostel-lightbox-modal"
        >
          <div className="relative max-w-4xl w-full max-h-[85vh] flex flex-col items-center" onClick={(e) => e.stopPropagation()}>
            <button 
              onClick={() => setActiveImage(null)}
              className="absolute -top-12 right-0 text-white hover:text-gray-300 text-4xl font-bold focus:outline-none"
              aria-label="Close"
              id="hostel-lightbox-close"
            >
              &times;
            </button>
            <img 
              src={activeImage.url} 
              alt={activeImage.caption || "Preview"} 
              className="max-w-full max-h-[75vh] object-contain rounded-lg shadow-2xl"
              id="hostel-lightbox-image"
            />
            {activeImage.caption && (
              <p className="text-white text-center mt-4 text-lg font-medium bg-black/50 px-4 py-2 rounded-full backdrop-blur-md" id="hostel-lightbox-caption">
                {activeImage.caption}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

