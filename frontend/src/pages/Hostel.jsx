import React, { useEffect, useState } from "react";
import { api, asArray, resolveImageUrl, DEFAULT_FALLBACK_IMAGE } from "../lib/api";
import { Card } from "../components/ui/card";
import { Eye, Image as ImageIcon } from "lucide-react";

export default function Hostel() {
  const [h, setH] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeImage, setActiveImage] = useState(null);

  useEffect(() => {
    setLoading(true);
    api.get("/site-content/hostel")
      .then((r) => {
        const val = r.data?.value;
        if (val) {
          setH(val);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading && !h) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-12 animate-pulse" id="hostel-loading-skeleton">
        <div className="h-10 w-2/3 bg-muted rounded-xl mb-4" />
        <div className="h-4 w-1/3 bg-muted rounded-xl mb-8" />
        <div className="w-full h-[300px] md:h-[450px] bg-muted rounded-3xl mb-10" />
        <div className="h-48 bg-muted rounded-3xl" />
      </div>
    );
  }

  const heading = h?.heading || "आवासीय छात्रावास";
  const subheading = h?.subheading || "कस्तूरबा गांधी बालिका विद्यालय, गोड्डा — सुरक्षित एवं आरामदायक आवास";
  const facilitiesHeading = h?.facilities_heading || "छात्रावास परिचय एवं सुविधाएँ";
  const facilitiesDescription = h?.facilities_description || h?.body || "छात्रावास संबंधी जानकारी शीघ्र उपलब्ध होगी।";
  
  // Filter only visible images
  const images = (h?.images || []).filter(img => img.visible !== false);
  
  // Single Banner Image Resolution
  const rawBanner = h?.main_image || h?.desktop_banner || (images.length > 0 ? images[0].url : "");
  const bannerImage = resolveImageUrl(rawBanner);

  const additionalBlocks = asArray(h?.additional_blocks);

  return (
    <div className="max-w-6xl mx-auto px-4 py-12 animate-fade-in" data-testid="hostel-page">
      {/* Title */}
      <div className="text-center md:text-left mb-8" id="hostel-title-section">
        <h1 className="text-4xl md:text-5xl font-extrabold text-primary tracking-tight" id="hostel-heading">{heading}</h1>
        {subheading && (
          <p className="mt-2 text-muted-foreground text-lg" id="hostel-subheading">{subheading}</p>
        )}
      </div>

      {/* Responsive Main Image Banner */}
      {bannerImage && (
        <div className="relative w-full rounded-3xl shadow-xl overflow-hidden mb-10 bg-black/90 flex items-center justify-center min-h-[220px] sm:min-h-[300px] md:min-h-[420px]" id="hostel-banner-container">
          <img 
            src={bannerImage} 
            alt="" 
            aria-hidden="true" 
            className="absolute inset-0 w-full h-full object-cover blur-2xl opacity-40 scale-110 pointer-events-none" 
            onError={(e) => { e.currentTarget.style.display = 'none'; }}
          />
          <img 
            src={bannerImage} 
            alt={heading} 
            loading="lazy"
            className="relative z-10 max-h-[480px] w-full h-auto object-contain object-center transition-transform duration-700 hover:scale-[1.01]" 
            id="hostel-featured-image"
            onError={(e) => {
              e.currentTarget.onerror = null;
              e.currentTarget.src = DEFAULT_FALLBACK_IMAGE;
            }}
          />
          <div className="absolute inset-0 z-20 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />
          {images.length > 0 && images[0].caption && !h?.main_image && (
            <div className="absolute bottom-6 left-6 z-30 text-white" id="hostel-banner-caption">
              <p className="text-sm bg-primary/80 backdrop-blur-sm px-3 py-1 rounded-full w-fit mb-2 font-medium">विशेष रूप से प्रस्तुत</p>
              <h2 className="text-xl md:text-2xl font-bold">{images[0].caption}</h2>
            </div>
          )}
        </div>
      )}

      {/* Facilities Description card */}
      <Card className="p-6 md:p-10 rounded-3xl border border-primary/10 shadow-lg bg-card/50 backdrop-blur-sm" id="hostel-desc-card">
        <h3 className="text-2xl font-bold text-primary mb-4 flex items-center gap-2" id="hostel-desc-title">
          <span className="h-2 w-2 rounded-full bg-primary inline-block"></span>
          {facilitiesHeading}
        </h3>
        <p className="hindi text-lg leading-relaxed text-foreground/90 whitespace-pre-line" id="hostel-desc-body">{facilitiesDescription}</p>
      </Card>

      {/* Additional Content Blocks */}
      {additionalBlocks.length > 0 && (
        <div className="mt-8 grid md:grid-cols-2 gap-6" id="hostel-additional-blocks">
          {additionalBlocks.map((block, idx) => (
            <Card key={block.id || idx} className="p-6 rounded-3xl border border-primary/10 shadow-md bg-card/50 backdrop-blur-sm">
              <h4 className="text-xl font-bold text-primary mb-2 flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-primary inline-block"></span>
                {block.title}
              </h4>
              <p className="hindi text-base leading-relaxed text-foreground/90 whitespace-pre-line">{block.description}</p>
            </Card>
          ))}
        </div>
      )}

      {/* Gallery section */}
      {images.length > 0 && (
        <div className="mt-16" id="hostel-gallery-section">
          <div className="border-b border-border pb-4 mb-8 flex items-center gap-3">
            <ImageIcon className="h-6 w-6 text-primary" />
            <h3 className="text-2xl md:text-3xl font-extrabold text-foreground" id="hostel-gallery-title">छात्रावास चित्र गैलरी</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6" id="hostel-gallery-grid">
            {images.map((img, idx) => {
              const imgResolved = resolveImageUrl(img.url);
              return (
                <div 
                  key={img.id || idx}
                  id={`hostel-gallery-item-${idx}`}
                  onClick={() => setActiveImage({ ...img, resolvedUrl: imgResolved })}
                  className="group relative cursor-pointer overflow-hidden rounded-2xl bg-muted aspect-[4/3] shadow-md transition-all duration-300 hover:shadow-xl hover:-translate-y-1"
                >
                  <img 
                    src={imgResolved} 
                    alt={img.caption || "Hostel Image"} 
                    loading="lazy"
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    onError={(e) => {
                      e.currentTarget.onerror = null;
                      e.currentTarget.src = DEFAULT_FALLBACK_IMAGE;
                    }}
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-4">
                    <div className="flex items-center gap-2 text-white/90 mb-1 text-sm font-semibold">
                      <Eye className="h-4 w-4" /> बड़ा देखें
                    </div>
                    {img.caption && (
                      <p className="text-white text-sm truncate font-medium">{img.caption}</p>
                    )}
                  </div>
                  {img.caption && (
                    <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 to-transparent p-3 pt-6 group-hover:opacity-0 transition-opacity duration-300">
                      <p className="text-white text-xs truncate font-medium">{img.caption}</p>
                    </div>
                  )}
                </div>
              );
            })}
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
              src={activeImage.resolvedUrl || resolveImageUrl(activeImage.url)} 
              alt={activeImage.caption || "Preview"} 
              className="max-w-full max-h-[75vh] object-contain rounded-lg shadow-2xl"
              id="hostel-lightbox-image"
              onError={(e) => {
                e.currentTarget.onerror = null;
                e.currentTarget.src = DEFAULT_FALLBACK_IMAGE;
              }}
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


