# KGBV Godda Product Requirements

## Original Problem Statement
Premium, Modern, Fully Responsive, SEO-Optimized Official Website for Kasturba Gandhi Balika Vidyalaya (KGBV), Godda, Jharkhand in Hindi with Blue/White/Sky-Blue theme, glassmorphism, admin CMS.

## User Choices
- Admin auth: Emergent Google Auth
- Storage: Emergent Object Storage
- Contact form: MongoDB only
- Stock/placeholder images (girls education themed)
- News ticker enabled

## Architecture
- Backend: FastAPI + Motor MongoDB + Emergent Auth + Emergent Object Storage
- Frontend: React 19 + React Router 7 + Tailwind + Shadcn + Framer Motion + Sonner
- Fonts: Mukta (headings) + Hind (body) via Google Fonts

## Implemented (Feb 2026)
- Public pages: Home, About, Principal, Academics, Admission, Facilities (16 items), Activities (10 items), Gallery (13 categories, lightbox), Video Gallery (YouTube embed), News, Downloads, Contact
- Admin Panel with Google OAuth (session-based), Tabs for Notices/Gallery/Videos/Downloads/Content/Messages
- File upload via Emergent Object Storage, served through /api/files
- News ticker (auto-scroll marquee)
- Animated counters, WhatsApp button, Scroll-to-top, Image lightbox, Theme toggle (dark/light)
- Google Maps embed (24.795789, 87.299783)
- SEO-friendly semantic HTML, data-testid on all interactive elements
- MongoDB seeded with sample notices, gallery, hero/about/principal content

## Backlog / P1
- SEO meta tags per page + sitemap.xml
- Progressive image loading
- Search across whole site
- Multi-image bulk upload UI
- WhatsApp number configurable via admin content
- Teachers page with images

## Backlog / P2
- Custom domain support
- Newsletter subscription
- Alumni portal
- Achievement highlights carousel
