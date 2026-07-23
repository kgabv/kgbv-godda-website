import React, { useEffect, useRef, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { api, asArray, API } from "../lib/api";
import { useAuth } from "../lib/AuthContext";
import { Card } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Textarea } from "../components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../components/ui/tabs";
import { toast } from "sonner";
import { LogOut, Trash2, Upload, Plus, Save, Eye, EyeOff, GripVertical, Info, Bell } from "lucide-react";

const GAL_CATS = ["Campus", "Classrooms", "Hostel", "Library", "Laboratory", "Activities", "Sports", "Events", "Educational Tours", "Celebrations", "Teachers", "Students", "Infrastructure"];
const TAB_BTN = "rounded-full data-[state=active]:bg-primary data-[state=active]:text-primary-foreground border px-3 py-1.5 text-sm";

const clearSiteCache = () => {
  try {
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith("kgbv-") && key.endsWith("-cache")) {
        localStorage.removeItem(key);
      }
    });
  } catch (e) {
    console.warn("Could not clear site cache", e);
  }
};

export default function AdminDashboard() {
  const { user, loading, logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) navigate("/admin/login", { replace: true });
    if (!loading && user && !user.is_admin) toast.error("आपको एडमिन अधिकार नहीं है");
  }, [loading, user, navigate]);

  if (loading || !user) return <div className="py-20 text-center" data-testid="admin-loading">लोड हो रहा है...</div>;
  if (!user.is_admin) return <div className="py-20 text-center text-red-600" data-testid="admin-no-access">एडमिन एक्सेस अस्वीकृत</div>;

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 md:py-10" data-testid="admin-dashboard">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl md:text-4xl font-extrabold text-primary">एडमिन डैशबोर्ड</h1>
          <p className="text-sm text-muted-foreground">स्वागत, {user.name}</p>
        </div>
        <Button variant="outline" onClick={async () => { await logout(); navigate("/"); }} data-testid="admin-logout"><LogOut className="h-4 w-4 mr-2"/>लॉगआउट</Button>
      </div>

      <Tabs defaultValue="content">
        <div className="overflow-x-auto -mx-4 px-4 pb-2">
          <TabsList className="flex flex-nowrap md:flex-wrap gap-2 bg-transparent p-0 h-auto w-max md:w-full">
            <TabsTrigger value="content" data-testid="tab-content" className={TAB_BTN}>साइट सामग्री</TabsTrigger>
            <TabsTrigger value="banners" data-testid="tab-banners" className={TAB_BTN}>बैनर</TabsTrigger>
            <TabsTrigger value="notices" data-testid="tab-notices" className={TAB_BTN}>सूचनाएँ</TabsTrigger>
            <TabsTrigger value="events" data-testid="tab-events" className={TAB_BTN}>कार्यक्रम</TabsTrigger>
            <TabsTrigger value="achievements" data-testid="tab-achievements" className={TAB_BTN}>उपलब्धियाँ</TabsTrigger>
            <TabsTrigger value="gallery" data-testid="tab-gallery" className={TAB_BTN}>गैलरी</TabsTrigger>
            <TabsTrigger value="videos" data-testid="tab-videos" className={TAB_BTN}>वीडियो</TabsTrigger>
            <TabsTrigger value="downloads" data-testid="tab-downloads" className={TAB_BTN}>डाउनलोड</TabsTrigger>
            <TabsTrigger value="teachers" data-testid="tab-teachers" className={TAB_BTN}>शिक्षक/स्टाफ</TabsTrigger>
            <TabsTrigger value="facilities" data-testid="tab-facilities" className={TAB_BTN}>सुविधाएँ</TabsTrigger>
            <TabsTrigger value="hostel" data-testid="tab-hostel" className={TAB_BTN}>छात्रावास</TabsTrigger>
            <TabsTrigger value="links" data-testid="tab-links" className={TAB_BTN}>महत्वपूर्ण लिंक</TabsTrigger>
            <TabsTrigger value="messages" data-testid="tab-messages" className={TAB_BTN}>संदेश</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="content" className="mt-6"><ContentTab /></TabsContent>
        <TabsContent value="banners" className="mt-6"><BannersTab /></TabsContent>
        <TabsContent value="notices" className="mt-6"><NoticesTab /></TabsContent>
        <TabsContent value="events" className="mt-6"><EventsTab /></TabsContent>
        <TabsContent value="achievements" className="mt-6"><AchievementsTab /></TabsContent>
        <TabsContent value="gallery" className="mt-6"><GalleryTab /></TabsContent>
        <TabsContent value="videos" className="mt-6"><VideosTab /></TabsContent>
        <TabsContent value="downloads" className="mt-6"><DownloadsTab /></TabsContent>
        <TabsContent value="teachers" className="mt-6"><TeachersTab /></TabsContent>
        <TabsContent value="facilities" className="mt-6"><FacilitiesTab /></TabsContent>
        <TabsContent value="hostel" className="mt-6"><HostelTab /></TabsContent>
        <TabsContent value="links" className="mt-6"><LinksTab /></TabsContent>
        <TabsContent value="messages" className="mt-6"><MessagesTab /></TabsContent>
      </Tabs>
    </div>
  );
}

/* ---------- Reusable ---------- */
function UploadInput({ onUploaded, testId }) {
  const inputRef = useRef();
  const [busy, setBusy] = useState(false);
  const handle = async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setBusy(true);
    try {
      const fd = new FormData(); fd.append("file", f);
      const { data } = await api.post("/upload", fd, { headers: { "Content-Type": "multipart/form-data" } });
      const abs = data.url.startsWith("http") ? data.url : `${API.replace(/\/api$/, "")}${data.url}`;
      onUploaded({ ...data, absolute_url: abs });
    } catch (err) {
      const errMsg = err?.response?.data?.detail || err?.response?.data?.message || err?.message || "अपलोड असफल";
      toast.error(`अपलोड असफल: ${errMsg}`);
    }
    finally { setBusy(false); e.target.value = ""; }
  };
  return (
    <>
      <input ref={inputRef} type="file" className="hidden" onChange={handle} data-testid={testId}/>
      <Button type="button" variant="outline" onClick={() => inputRef.current.click()} disabled={busy} className="rounded-full">
        <Upload className="h-4 w-4 mr-1"/>{busy ? "अपलोड..." : "फ़ाइल चुनें"}
      </Button>
    </>
  );
}

function useList(path) {
  const [items, setItems] = useState([]);
  const load = useCallback(() => {
    api.get(path).then((r) => setItems(asArray(r.data))).catch(() => setItems([]));
  }, [path]);
  useEffect(() => {
    load();
  }, [load]);
  return [items, load];
}

function SectionForm({ title, initial, onSave, fields, testId, keyName }) {
  const [v, setV] = useState(initial);
  useEffect(() => setV(initial), [initial]);
  const [saving, setSaving] = useState(false);

  const set = (k, isNumber) => (e) => {
    const val = isNumber ? (e.target.value === "" ? "" : Number(e.target.value)) : e.target.value;
    const next = { ...v, [k]: val };
    setV(next);
    if (keyName === "theme") {
      window.dispatchEvent(new CustomEvent("kgbv-theme-changed", { detail: next }));
    }
  };

  const save = async () => {
    setSaving(true);
    try {
      await onSave(v);
      clearSiteCache();
      toast.success("सफलतापूर्वक सहेजा गया");
    }
    catch (err) {
      const errMsg = err?.response?.data?.detail || err?.response?.data?.message || err?.message || "त्रुटि";
      toast.error(`सहेजने में त्रुटि: ${errMsg}`);
    }
    finally { setSaving(false); }
  };
  return (
    <Card className="p-5 rounded-2xl" data-testid={testId}>
      <div className="font-bold mb-3 text-primary">{title}</div>
      <div className="grid gap-3">
        {fields.map((f, idx) => (
          <div key={f.key || f.label || idx}>
            {f.type === "heading" ? (
              <div className="font-semibold text-xs text-primary pt-3 pb-1 border-t border-border uppercase tracking-wider">
                {f.label}
              </div>
            ) : (
              <>
                <label className="text-xs font-medium text-muted-foreground">{f.label}</label>
                {f.type === "textarea" ? (
                  <Textarea rows={f.rows || 3} value={v[f.key] ?? ""} onChange={set(f.key, false)} data-testid={`${testId}-${f.key}`}/>
                ) : f.type === "image" ? (
                  <div className="flex items-center gap-3">
                    <Input value={v[f.key] ?? ""} onChange={set(f.key, false)} placeholder="URL या अपलोड करें" data-testid={`${testId}-${f.key}`}/>
                    <UploadInput testId={`${testId}-${f.key}-upload`} onUploaded={(d) => {
                      const next = { ...v, [f.key]: d.absolute_url };
                      setV(next);
                      if (keyName === "theme") window.dispatchEvent(new CustomEvent("kgbv-theme-changed", { detail: next }));
                    }}/>
                    {v[f.key] && <img src={v[f.key]} alt="" className="h-10 w-10 rounded object-cover"/>}
                  </div>
                ) : f.type === "color" ? (
                  <div className="flex items-center gap-2">
                    <input 
                      type="color" 
                      value={/^#[0-9a-fA-F]{6}$/.test(v[f.key] || "") ? v[f.key] : (f.default || "#0056B3")} 
                      onChange={set(f.key, false)} 
                      className="h-10 w-14 rounded border border-border bg-transparent cursor-pointer" 
                      data-testid={`${testId}-${f.key}-picker`}
                    />
                    <Input 
                      value={v[f.key] ?? ""} 
                      onChange={set(f.key, false)} 
                      placeholder={f.default || "#RRGGBB"} 
                      data-testid={`${testId}-${f.key}`}
                    />
                  </div>
                ) : (
                  <Input type={f.type || "text"} value={v[f.key] ?? ""} onChange={set(f.key, f.type === "number")} data-testid={`${testId}-${f.key}`}/>
                )}
              </>
            )}
          </div>
        ))}
      </div>

      {keyName === "theme" && (
        <div className="mt-4 pt-3 border-t border-border space-y-2">
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
            <Bell className="h-3.5 w-3.5 text-primary" />
            सूचना पट्टी पूर्वावलोकन (Announcement Bar Live Preview)
          </div>
          <div 
            className="rounded-xl p-3 flex items-center gap-3 border transition-all duration-200 shadow-sm overflow-hidden"
            style={{
              backgroundColor: v.ticker_bg || "#E6F4FA",
              borderColor: v.ticker_border || "#B3E0F2",
              color: v.ticker_text || "#003D82"
            }}
            id="admin-ticker-live-preview"
            data-testid="admin-ticker-preview"
          >
            <div 
              className="shrink-0 flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold text-white shadow-sm transition-colors"
              style={{
                backgroundColor: v.ticker_icon || "#00A0E4",
                color: "#ffffff"
              }}
            >
              <Bell className="h-3.5 w-3.5 text-white" /> ताज़ा सूचनाएँ
            </div>
            <div className="text-xs font-medium truncate flex-1 flex items-center gap-3">
              <span style={{ color: v.ticker_text || "#003D82" }}>
                • कस्तूरबा गांधी बालिका विद्यालय, गोड्डा — नया सत्र पंजीकरण खुला है
              </span>
              <span 
                className="text-[11px] px-2 py-0.5 rounded font-semibold transition-colors shrink-0 hidden sm:inline-block"
                style={{ 
                  color: v.ticker_hover || "#002B5C",
                  backgroundColor: "rgba(0,0,0,0.05)"
                }}
              >
                होवर: {v.ticker_hover || "#002B5C"}
              </span>
            </div>
          </div>
        </div>
      )}

      <Button onClick={save} disabled={saving} className="mt-4 rounded-full" data-testid={`${testId}-save`}>
        <Save className="h-4 w-4 mr-1"/>{saving ? "सहेजा जा रहा..." : "सहेजें"}
      </Button>
    </Card>
  );
}

/* ---------- Content Tab (Site Settings) ---------- */
function ContentTab() {
  const [data, setData] = useState({});
  const keys = ["branding", "theme", "hero", "about", "vidyalaya_parichay", "vision", "mission", "principal", "warden", "stats", "contact", "social", "footer", "seo", "admission", "academics"];
  useEffect(() => {
    (async () => {
      const res = await Promise.all(keys.map(k => api.get(`/site-content/${k}`).then(r => [k, r.data?.value || {}]).catch(() => [k, {}])));
      setData(Object.fromEntries(res));
    })();
    // eslint-disable-next-line
  }, []);
  const save = (key) => async (v) => {
    try {
      await api.put("/site-content", { key, value: v });
      setData(d => ({ ...d, [key]: v }));
      clearSiteCache();
      // Live-apply theme changes without full reload
      if (key === "theme") {
        window.dispatchEvent(new CustomEvent("kgbv-theme-changed", { detail: v }));
      }
    } catch (err) {
      const errMsg = err?.response?.data?.detail || err?.response?.data?.message || err?.message || "सहेजने में त्रुटि";
      throw new Error(errMsg);
    }
  };

  const sections = [
    { key: "branding", title: "स्कूल ब्रांडिंग (लोगो / नाम / टैगलाइन)", fields: [
      { key: "logo_url", label: "लोगो URL", type: "image" },
      { key: "favicon_url", label: "फैविकॉन URL", type: "image" },
      { key: "school_name", label: "विद्यालय का नाम" },
      { key: "school_name_short", label: "स्थान (हेडर के नीचे)" },
      { key: "tagline", label: "टैगलाइन" },
    ]},
    { key: "theme", title: "थीम रंग (Website Colors)", fields: [
      { key: "primary", label: "Primary रंग (मुख्य)", type: "color", default: "#0056B3" },
      { key: "secondary", label: "Secondary रंग (सहायक)", type: "color", default: "#00A0E4" },
      { key: "accent", label: "Accent रंग (हल्का)", type: "color", default: "#E1F3FB" },
      { key: "background", label: "Background रंग", type: "color", default: "#F5F9FE" },
      { key: "heading_ticker", type: "heading", label: "सूचना पट्टी रंग (Announcement Bar Colors)" },
      { key: "ticker_bg", label: "बैकग्राउंड रंग (Background)", type: "color", default: "#E6F4FA" },
      { key: "ticker_text", label: "टेक्स्ट रंग (Text)", type: "color", default: "#003D82" },
      { key: "ticker_icon", label: "आइकन व बैज रंग (Icon & Badge)", type: "color", default: "#00A0E4" },
      { key: "ticker_border", label: "बॉर्डर रंग (Border)", type: "color", default: "#B3E0F2" },
      { key: "ticker_hover", label: "होवर रंग (Hover Text)", type: "color", default: "#002B5C" },
    ]},
    { key: "hero", title: "होम - हीरो सेक्शन", fields: [
      { key: "title", label: "मुख्य शीर्षक" },
      { key: "subtitle", label: "उप-शीर्षक (टैगलाइन)" },
      { key: "description", label: "विवरण", type: "textarea", rows: 4 },
    ]},
    { key: "stats", title: "आँकड़े (Home Counters)", fields: [
      { key: "students", label: "छात्राएँ", type: "number" },
      { key: "teachers", label: "शिक्षक/स्टाफ", type: "number" },
      { key: "classes", label: "कक्षाएँ", type: "number" },
      { key: "awards", label: "पुरस्कार", type: "number" },
    ]},
    { key: "about", title: "About School", fields: [
      { key: "heading", label: "शीर्षक" },
      { key: "body", label: "पूरा विवरण", type: "textarea", rows: 6 },
      { key: "image_url", label: "चित्र URL", type: "image" },
    ]},
    { key: "vidyalaya_parichay", title: "विद्यालय परिचय (About Page)", fields: [
      { key: "heading", label: "शीर्षक" },
      { key: "body", label: "पूरा विवरण", type: "textarea", rows: 6 },
      { key: "image_url", label: "चित्र URL", type: "image" },
    ]},
    { key: "vision", title: "हमारी दृष्टि (Vision)", fields: [
      { key: "title", label: "शीर्षक" },
      { key: "body", label: "विवरण", type: "textarea" },
    ]},
    { key: "mission", title: "हमारा उद्देश्य (Mission)", fields: [
      { key: "title", label: "शीर्षक" },
      { key: "body", label: "विवरण", type: "textarea" },
    ]},
    { key: "principal", title: "प्रधानाचार्या", fields: [
      { key: "name", label: "नाम" },
      { key: "photo_url", label: "फोटो", type: "image" },
      { key: "message", label: "संदेश", type: "textarea", rows: 6 },
    ]},
    { key: "warden", title: "वार्डन", fields: [
      { key: "name", label: "नाम" },
      { key: "photo_url", label: "फोटो", type: "image" },
      { key: "message", label: "संदेश", type: "textarea", rows: 4 },
    ]},
    { key: "contact", title: "संपर्क विवरण एवं Google Map", fields: [
      { key: "email", label: "ईमेल" },
      { key: "phone", label: "फ़ोन" },
      { key: "whatsapp", label: "WhatsApp नंबर (देश कोड सहित, +91xxx)" },
      { key: "address", label: "पता", type: "textarea" },
      { key: "map_lat", label: "Map Latitude" },
      { key: "map_lng", label: "Map Longitude" },
    ]},
    { key: "social", title: "सोशल मीडिया लिंक", fields: [
      { key: "facebook", label: "Facebook URL" },
      { key: "instagram", label: "Instagram URL" },
      { key: "twitter", label: "Twitter/X URL" },
      { key: "youtube", label: "YouTube URL" },
    ]},
    { key: "footer", title: "फ़ूटर सामग्री", fields: [
      { key: "about_text", label: "फ़ूटर परिचय", type: "textarea" },
      { key: "copyright", label: "कॉपीराइट टेक्स्ट" },
    ]},
    { key: "seo", title: "SEO सेटिंग्स", fields: [
      { key: "title", label: "Page Title" },
      { key: "description", label: "Meta Description", type: "textarea" },
      { key: "keywords", label: "Meta Keywords" },
    ]},
    { key: "admission", title: "प्रवेश जानकारी", fields: [
      { key: "heading", label: "शीर्षक" },
      { key: "intro", label: "परिचय" },
      { key: "eligibility", label: "पात्रता (| से अलग करें)", type: "textarea" },
      { key: "process", label: "आवेदन प्रक्रिया", type: "textarea" },
    ]},
    { key: "academics", title: "शैक्षणिक जानकारी", fields: [
      { key: "heading", label: "शीर्षक" },
      { key: "intro", label: "परिचय", type: "textarea" },
    ]},
  ];

  return (
    <div className="grid md:grid-cols-2 gap-5">
      {sections.map(s => (
        <SectionForm key={s.key} keyName={s.key} title={s.title} initial={data[s.key] || {}} onSave={save(s.key)} fields={s.fields} testId={`sec-${s.key}`}/>
      ))}
    </div>
  );
}

/* ---------- Banners ---------- */
function BannersTab() {
  const [items, load] = useList("/banners?active_only=false");
  const [f, setF] = useState({ title: "", subtitle: "", image_url: "", link: "", is_active: true, order: 0 });
  const [adding, setAdding] = useState(false);

  const add = async () => {
    if (!f.image_url) return toast.error("बैनर चित्र आवश्यक");
    setAdding(true);
    try {
      await api.post("/banners", f);
      setF({ title: "", subtitle: "", image_url: "", link: "", is_active: true, order: 0 });
      clearSiteCache();
      toast.success("बैनर सफलतापूर्व जोड़ा गया!");
      load();
    } catch (err) {
      const errMsg = err?.response?.data?.detail || err?.response?.data?.message || err?.message || "बैनर जोड़ने में विफल";
      toast.error(`त्रुटि: ${errMsg}`);
    } finally {
      setAdding(false);
    }
  };

  const remove = async (id) => {
    try {
      await api.delete(`/banners/${id}`);
      clearSiteCache();
      toast.success("बैनर हटाया गया!");
      load();
    } catch (err) {
      toast.error(`हटाने में त्रुटि: ${err?.message || "विफल"}`);
    }
  };

  return (
    <div className="grid lg:grid-cols-2 gap-6">
      <Card className="p-5 rounded-2xl">
        <div className="font-bold mb-3">नया बैनर</div>
        <Input placeholder="शीर्षक (वैकल्पिक)" value={f.title} onChange={e=>setF({...f, title:e.target.value})} data-testid="ban-title"/>
        <Input placeholder="उप-शीर्षक" className="mt-2" value={f.subtitle} onChange={e=>setF({...f, subtitle:e.target.value})}/>
        <Input placeholder="चित्र URL" className="mt-2" value={f.image_url} onChange={e=>setF({...f, image_url:e.target.value})} data-testid="ban-url"/>
        <div className="mt-2 flex items-center gap-3">
          <UploadInput testId="ban-upload" onUploaded={d=>setF(x=>({...x, image_url: d.absolute_url}))}/>
          {f.image_url && <img src={f.image_url} alt="" className="h-12 w-16 rounded object-cover"/>}
        </div>
        <Input placeholder="लिंक (वैकल्पिक)" className="mt-2" value={f.link} onChange={e=>setF({...f, link:e.target.value})}/>
        <Input placeholder="क्रम (order)" type="number" className="mt-2" value={f.order} onChange={e=>setF({...f, order: Number(e.target.value)})}/>
        <Button className="mt-3 rounded-full" onClick={add} disabled={adding} data-testid="add-ban"><Plus className="h-4 w-4 mr-1"/>{adding ? "जोड़ा जा रहा..." : "जोड़ें"}</Button>
      </Card>
      <div className="grid grid-cols-2 gap-3">
        {items.map(b => (
          <Card key={b.id} className="rounded-2xl overflow-hidden relative">
            <img src={b.image_url} alt={b.title} className="w-full h-28 object-cover"/>
            <div className="p-2 text-xs truncate">{b.title || "—"}</div>
            <Button size="icon" variant="destructive" className="absolute top-1 right-1 h-7 w-7" onClick={() => remove(b.id)} data-testid={`del-ban-${b.id}`}><Trash2 className="h-3 w-3"/></Button>
          </Card>
        ))}
      </div>
    </div>
  );
}

/* ---------- Notices ---------- */
function NoticesTab() {
  const [items, load] = useList("/notices?active_only=false");
  const [f, setF] = useState({ title: "", body: "", priority: "normal", is_active: true });
  const [adding, setAdding] = useState(false);

  const add = async () => {
    if (!f.title) return toast.error("शीर्षक आवश्यक");
    setAdding(true);
    try {
      await api.post("/notices", f);
      setF({ title: "", body: "", priority: "normal", is_active: true });
      clearSiteCache();
      toast.success("सूचना सफलतापूर्वक जोड़ी गई!");
      load();
    } catch (err) {
      toast.error(`त्रुटि: ${err?.message || "विफल"}`);
    } finally {
      setAdding(false);
    }
  };

  const remove = async (id) => {
    try {
      await api.delete(`/notices/${id}`);
      clearSiteCache();
      toast.success("सूचना हटाई गई!");
      load();
    } catch (err) {
      toast.error(`हटाने में त्रुटि: ${err?.message || "विफल"}`);
    }
  };

  return (
    <div className="grid md:grid-cols-2 gap-6">
      <Card className="p-5 rounded-2xl">
        <div className="font-bold mb-3">नई सूचना</div>
        <Input placeholder="शीर्षक" value={f.title} onChange={e=>setF({...f, title: e.target.value})} data-testid="notice-title"/>
        <Textarea placeholder="विवरण" className="mt-2" value={f.body} onChange={e=>setF({...f, body: e.target.value})} data-testid="notice-body"/>
        <select className="mt-2 w-full h-10 rounded-lg border border-border bg-card px-3" value={f.priority} onChange={e=>setF({...f, priority: e.target.value})} data-testid="notice-priority">
          <option value="normal">सामान्य</option>
          <option value="urgent">तात्कालिक</option>
        </select>
        <Button className="mt-3 rounded-full" onClick={add} disabled={adding} data-testid="add-notice"><Plus className="h-4 w-4 mr-1"/>{adding ? "जोड़ा जा रहा..." : "जोड़ें"}</Button>
      </Card>
      <div className="grid gap-3">
        {items.map(n => (
          <Card key={n.id} className="p-4 rounded-2xl flex items-start gap-3">
            <div className="flex-1">
              <div className="font-bold">{n.title} {n.priority === "urgent" && <span className="text-xs text-red-600">[तात्कालिक]</span>}</div>
              <div className="text-sm text-muted-foreground">{n.body}</div>
            </div>
            <Button size="icon" variant="ghost" onClick={() => remove(n.id)} data-testid={`del-notice-${n.id}`}><Trash2 className="h-4 w-4"/></Button>
          </Card>
        ))}
      </div>
    </div>
  );
}

/* ---------- Events ---------- */
function EventsTab() {
  const [items, load] = useList("/events");
  const [f, setF] = useState({ title: "", description: "", date: "", image_url: "", is_active: true });
  const [adding, setAdding] = useState(false);

  const add = async () => {
    if (!f.title) return toast.error("शीर्षक आवश्यक");
    setAdding(true);
    try {
      await api.post("/events", f);
      setF({ title: "", description: "", date: "", image_url: "", is_active: true });
      clearSiteCache();
      toast.success("कार्यक्रम सफलतापूर्वक जोड़ा गया!");
      load();
    } catch (err) {
      toast.error(`त्रुटि: ${err?.message || "विफल"}`);
    } finally {
      setAdding(false);
    }
  };

  const remove = async (id) => {
    try {
      await api.delete(`/events/${id}`);
      clearSiteCache();
      toast.success("कार्यक्रम हटाया गया!");
      load();
    } catch (err) {
      toast.error(`हटाने में त्रुटि: ${err?.message || "विफल"}`);
    }
  };

  return (
    <div className="grid md:grid-cols-2 gap-6">
      <Card className="p-5 rounded-2xl">
        <div className="font-bold mb-3">नया कार्यक्रम</div>
        <Input placeholder="शीर्षक" value={f.title} onChange={e=>setF({...f, title: e.target.value})} data-testid="ev-title"/>
        <Input type="date" className="mt-2" value={f.date} onChange={e=>setF({...f, date: e.target.value})}/>
        <Textarea placeholder="विवरण" className="mt-2" value={f.description} onChange={e=>setF({...f, description: e.target.value})}/>
        <Input placeholder="चित्र URL" className="mt-2" value={f.image_url} onChange={e=>setF({...f, image_url: e.target.value})}/>
        <div className="mt-2"><UploadInput testId="ev-upload" onUploaded={d=>setF(x=>({...x, image_url: d.absolute_url}))}/></div>
        <Button className="mt-3 rounded-full" onClick={add} disabled={adding} data-testid="add-ev"><Plus className="h-4 w-4 mr-1"/>{adding ? "जोड़ा जा रहा..." : "जोड़ें"}</Button>
      </Card>
      <div className="grid gap-3">
        {items.map(e => (
          <Card key={e.id} className="p-4 rounded-2xl flex gap-3 items-start">
            {e.image_url && <img src={e.image_url} alt="" className="h-16 w-16 rounded-lg object-cover"/>}
            <div className="flex-1">
              <div className="font-bold">{e.title}</div>
              <div className="text-xs text-muted-foreground">{e.date}</div>
              <div className="text-sm mt-1">{e.description}</div>
            </div>
            <Button size="icon" variant="ghost" onClick={() => remove(e.id)} data-testid={`del-ev-${e.id}`}><Trash2 className="h-4 w-4"/></Button>
          </Card>
        ))}
      </div>
    </div>
  );
}

/* ---------- Achievements ---------- */
function AchievementsTab() {
  const [items, load] = useList("/achievements");
  const [f, setF] = useState({ title: "", description: "", image_url: "", year: "" });
  const [adding, setAdding] = useState(false);

  const add = async () => {
    if (!f.title) return toast.error("शीर्षक आवश्यक");
    setAdding(true);
    try {
      await api.post("/achievements", f);
      setF({ title: "", description: "", image_url: "", year: "" });
      clearSiteCache();
      toast.success("उपलब्धि सफलतापूर्वक जोड़ी गई!");
      load();
    } catch (err) {
      toast.error(`त्रुटि: ${err?.message || "विफल"}`);
    } finally {
      setAdding(false);
    }
  };

  const remove = async (id) => {
    try {
      await api.delete(`/achievements/${id}`);
      clearSiteCache();
      toast.success("उपलब्धि हटाई गई!");
      load();
    } catch (err) {
      toast.error(`हटाने में त्रुटि: ${err?.message || "विफल"}`);
    }
  };

  return (
    <div className="grid md:grid-cols-2 gap-6">
      <Card className="p-5 rounded-2xl">
        <div className="font-bold mb-3">नई उपलब्धि</div>
        <Input placeholder="शीर्षक" value={f.title} onChange={e=>setF({...f, title: e.target.value})} data-testid="ach-title"/>
        <Input placeholder="वर्ष" className="mt-2" value={f.year} onChange={e=>setF({...f, year: e.target.value})}/>
        <Textarea placeholder="विवरण" className="mt-2" value={f.description} onChange={e=>setF({...f, description: e.target.value})}/>
        <Input placeholder="चित्र URL" className="mt-2" value={f.image_url} onChange={e=>setF({...f, image_url: e.target.value})}/>
        <div className="mt-2"><UploadInput testId="ach-upload" onUploaded={d=>setF(x=>({...x, image_url: d.absolute_url}))}/></div>
        <Button className="mt-3 rounded-full" onClick={add} disabled={adding} data-testid="add-ach"><Plus className="h-4 w-4 mr-1"/>{adding ? "जोड़ा जा रहा..." : "जोड़ें"}</Button>
      </Card>
      <div className="grid gap-3">
        {items.map(a => (
          <Card key={a.id} className="p-4 rounded-2xl flex gap-3 items-start">
            {a.image_url && <img src={a.image_url} alt="" className="h-16 w-16 rounded-lg object-cover"/>}
            <div className="flex-1">
              <div className="font-bold">{a.title}</div>
              <div className="text-xs text-muted-foreground">{a.year}</div>
              <div className="text-sm mt-1">{a.description}</div>
            </div>
            <Button size="icon" variant="ghost" onClick={() => remove(a.id)} data-testid={`del-ach-${a.id}`}><Trash2 className="h-4 w-4"/></Button>
          </Card>
        ))}
      </div>
    </div>
  );
}

/* ---------- Gallery ---------- */
function GalleryTab() {
  const [items, load] = useList("/gallery");
  const [f, setF] = useState({ title: "", category: "Campus", image_url: "", caption: "" });
  const [adding, setAdding] = useState(false);

  const add = async () => {
    if (!f.title || !f.image_url) return toast.error("शीर्षक व चित्र आवश्यक");
    setAdding(true);
    try {
      await api.post("/gallery", f);
      setF({ title: "", category: "Campus", image_url: "", caption: "" });
      clearSiteCache();
      toast.success("गैलरी में चित्र जोड़ा गया!");
      load();
    } catch (err) {
      toast.error(`त्रुटि: ${err?.message || "चित्र जोड़ने में विफल"}`);
    } finally {
      setAdding(false);
    }
  };

  const remove = async (id) => {
    try {
      await api.delete(`/gallery/${id}`);
      clearSiteCache();
      toast.success("चित्र हटाया गया!");
      load();
    } catch (err) {
      toast.error(`हटाने में त्रुटि: ${err?.message || "विफल"}`);
    }
  };

  return (
    <div className="grid lg:grid-cols-2 gap-6">
      <Card className="p-5 rounded-2xl">
        <div className="font-bold mb-3">नई तस्वीर</div>
        <Input placeholder="शीर्षक" value={f.title} onChange={e=>setF({...f, title: e.target.value})} data-testid="gal-title"/>
        <select className="mt-2 w-full h-10 rounded-lg border border-border bg-card px-3" value={f.category} onChange={e=>setF({...f, category: e.target.value})} data-testid="gal-cat">
          {GAL_CATS.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <Input placeholder="चित्र URL या नीचे से अपलोड" className="mt-2" value={f.image_url} onChange={e=>setF({...f, image_url: e.target.value})} data-testid="gal-url"/>
        <div className="mt-2 flex items-center gap-3">
          <UploadInput testId="gal-upload" onUploaded={d=>setF(x=>({...x, image_url: d.absolute_url}))}/>
          {f.image_url && <img src={f.image_url} alt="" className="h-12 w-12 rounded object-cover"/>}
        </div>
        <Input placeholder="कैप्शन" className="mt-2" value={f.caption} onChange={e=>setF({...f, caption: e.target.value})}/>
        <Button className="mt-3 rounded-full" onClick={add} disabled={adding} data-testid="add-gal"><Plus className="h-4 w-4 mr-1"/>{adding ? "जोड़ा जा रहा..." : "जोड़ें"}</Button>
      </Card>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {items.map(g => (
          <Card key={g.id} className="rounded-2xl overflow-hidden relative">
            <img 
              src={g.image_url} 
              alt={g.title} 
              className="w-full h-28 object-cover bg-muted"
              onError={(e) => {
                e.currentTarget.onerror = null;
                e.currentTarget.src = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='200' height='150' viewBox='0 0 200 150' fill='%23e2e8f0'><rect width='200' height='150' fill='%23f1f5f9'/><text x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-family='sans-serif' font-size='12' fill='%2394a3b8'>चित्र उपलब्ध नहीं</text></svg>";
              }}
            />
            <div className="p-2 text-xs"><div className="font-semibold truncate">{g.title}</div><div className="text-muted-foreground">{g.category}</div></div>
            <Button size="icon" variant="destructive" className="absolute top-1 right-1 h-7 w-7" onClick={() => remove(g.id)} data-testid={`del-gal-${g.id}`}><Trash2 className="h-3 w-3"/></Button>
          </Card>
        ))}
      </div>
    </div>
  );
}

/* ---------- Videos ---------- */
function VideosTab() {
  const [items, load] = useList("/videos");
  const [f, setF] = useState({ title: "", youtube_id: "", description: "", category: "General" });
  const [adding, setAdding] = useState(false);

  const parseId = (v) => { const m = v.match(/(?:v=|youtu\.be\/|embed\/)([\w-]{11})/); return m ? m[1] : v; };
  const add = async () => {
    if (!f.title || !f.youtube_id) return toast.error("शीर्षक व YouTube ID/URL आवश्यक");
    setAdding(true);
    try {
      await api.post("/videos", { ...f, youtube_id: parseId(f.youtube_id) });
      setF({ title: "", youtube_id: "", description: "", category: "General" });
      clearSiteCache();
      toast.success("वीडियो सफलतापूर्वक जोड़ा गया!");
      load();
    } catch (err) {
      toast.error(`त्रुटि: ${err?.message || "विफल"}`);
    } finally {
      setAdding(false);
    }
  };

  const remove = async (id) => {
    try {
      await api.delete(`/videos/${id}`);
      clearSiteCache();
      toast.success("वीडियो हटाया गया!");
      load();
    } catch (err) {
      toast.error(`हटाने में त्रुटि: ${err?.message || "विफल"}`);
    }
  };

  return (
    <div className="grid md:grid-cols-2 gap-6">
      <Card className="p-5 rounded-2xl">
        <div className="font-bold mb-3">नया वीडियो</div>
        <Input placeholder="शीर्षक" value={f.title} onChange={e=>setF({...f, title: e.target.value})} data-testid="vid-title"/>
        <Input placeholder="YouTube URL या ID" className="mt-2" value={f.youtube_id} onChange={e=>setF({...f, youtube_id: e.target.value})} data-testid="vid-id"/>
        <Textarea placeholder="विवरण" className="mt-2" value={f.description} onChange={e=>setF({...f, description: e.target.value})}/>
        <Button className="mt-3 rounded-full" onClick={add} disabled={adding} data-testid="add-vid"><Plus className="h-4 w-4 mr-1"/>{adding ? "जोड़ा जा रहा..." : "जोड़ें"}</Button>
      </Card>
      <div className="grid gap-3">
        {items.map(v => (
          <Card key={v.id} className="p-3 rounded-2xl flex gap-3">
            <img src={`https://img.youtube.com/vi/${v.youtube_id}/mqdefault.jpg`} alt="" className="h-20 w-32 object-cover rounded-lg"/>
            <div className="flex-1"><div className="font-semibold">{v.title}</div><div className="text-xs text-muted-foreground">{v.youtube_id}</div></div>
            <Button size="icon" variant="ghost" onClick={() => remove(v.id)} data-testid={`del-vid-${v.id}`}><Trash2 className="h-4 w-4"/></Button>
          </Card>
        ))}
      </div>
    </div>
  );
}

/* ---------- Downloads ---------- */
function DownloadsTab() {
  const [items, load] = useList("/downloads");
  const [f, setF] = useState({ title: "", file_url: "", description: "", category: "General" });
  const [adding, setAdding] = useState(false);

  const add = async () => {
    if (!f.title || !f.file_url) return toast.error("शीर्षक व फ़ाइल आवश्यक");
    setAdding(true);
    try {
      await api.post("/downloads", f);
      setF({ title: "", file_url: "", description: "", category: "General" });
      clearSiteCache();
      toast.success("फ़ाइल सफलतापूर्वक जोड़ी गई!");
      load();
    } catch (err) {
      toast.error(`त्रुटि: ${err?.message || "विफल"}`);
    } finally {
      setAdding(false);
    }
  };

  const remove = async (id) => {
    try {
      await api.delete(`/downloads/${id}`);
      clearSiteCache();
      toast.success("फ़ाइल हटाई गई!");
      load();
    } catch (err) {
      toast.error(`हटाने में त्रुटि: ${err?.message || "विफल"}`);
    }
  };

  return (
    <div className="grid md:grid-cols-2 gap-6">
      <Card className="p-5 rounded-2xl">
        <div className="font-bold mb-3">नई फ़ाइल</div>
        <Input placeholder="शीर्षक" value={f.title} onChange={e=>setF({...f, title: e.target.value})} data-testid="dl-title"/>
        <Input placeholder="URL या अपलोड करें" className="mt-2" value={f.file_url} onChange={e=>setF({...f, file_url: e.target.value})} data-testid="dl-url"/>
        <div className="mt-2"><UploadInput testId="dl-upload" onUploaded={d=>setF(x=>({...x, file_url: d.url}))}/></div>
        <Textarea placeholder="विवरण" className="mt-2" value={f.description} onChange={e=>setF({...f, description: e.target.value})}/>
        <Button className="mt-3 rounded-full" onClick={add} disabled={adding} data-testid="add-dl"><Plus className="h-4 w-4 mr-1"/>{adding ? "जोड़ा जा रहा..." : "जोड़ें"}</Button>
      </Card>
      <div className="grid gap-3">
        {items.map(d => (
          <Card key={d.id} className="p-4 rounded-2xl flex gap-3 items-center">
            <div className="flex-1"><div className="font-semibold">{d.title}</div><div className="text-xs text-muted-foreground truncate">{d.file_url}</div></div>
            <Button size="icon" variant="ghost" onClick={() => remove(d.id)} data-testid={`del-dl-${d.id}`}><Trash2 className="h-4 w-4"/></Button>
          </Card>
        ))}
      </div>
    </div>
  );
}

/* ---------- Teachers / Staff ---------- */
function TeachersTab() {
  const [items, load] = useList("/teachers");
  const [f, setF] = useState({ name: "", role: "", image_url: "", bio: "", category: "teaching", order: 0 });
  const [adding, setAdding] = useState(false);

  const add = async () => {
    if (!f.name || !f.role) return toast.error("नाम व पद आवश्यक");
    setAdding(true);
    try {
      await api.post("/teachers", f);
      setF({ name: "", role: "", image_url: "", bio: "", category: "teaching", order: 0 });
      clearSiteCache();
      toast.success("शिक्षक/स्टाफ सफलतापूर्वक जोड़ा गया!");
      load();
    } catch (err) {
      toast.error(`त्रुटि: ${err?.message || "विफल"}`);
    } finally {
      setAdding(false);
    }
  };

  const remove = async (id) => {
    try {
      await api.delete(`/teachers/${id}`);
      clearSiteCache();
      toast.success("रिकॉर्ड हटाया गया!");
      load();
    } catch (err) {
      toast.error(`हटाने में त्रुटि: ${err?.message || "विफल"}`);
    }
  };

  return (
    <div className="grid md:grid-cols-2 gap-6">
      <Card className="p-5 rounded-2xl">
        <div className="font-bold mb-3">नया शिक्षक/स्टाफ</div>
        <Input placeholder="नाम" value={f.name} onChange={e=>setF({...f, name: e.target.value})} data-testid="tch-name"/>
        <Input placeholder="पद (जैसे गणित शिक्षिका)" className="mt-2" value={f.role} onChange={e=>setF({...f, role: e.target.value})}/>
        <select className="mt-2 w-full h-10 rounded-lg border border-border bg-card px-3" value={f.category} onChange={e=>setF({...f, category: e.target.value})}>
          <option value="teaching">शिक्षक</option>
          <option value="non_teaching">गैर-शिक्षण स्टाफ</option>
        </select>
        <Input placeholder="चित्र URL" className="mt-2" value={f.image_url} onChange={e=>setF({...f, image_url: e.target.value})}/>
        <div className="mt-2"><UploadInput testId="tch-upload" onUploaded={d=>setF(x=>({...x, image_url: d.absolute_url}))}/></div>
        <Textarea placeholder="संक्षिप्त परिचय" className="mt-2" value={f.bio} onChange={e=>setF({...f, bio: e.target.value})}/>
        <Button className="mt-3 rounded-full" onClick={add} disabled={adding} data-testid="add-tch"><Plus className="h-4 w-4 mr-1"/>{adding ? "जोड़ा जा रहा..." : "जोड़ें"}</Button>
      </Card>
      <div className="grid gap-3">
        {items.map(t => (
          <Card key={t.id} className="p-3 rounded-2xl flex gap-3 items-center">
            {t.image_url ? <img src={t.image_url} alt="" className="h-14 w-14 rounded-full object-cover"/> : <div className="h-14 w-14 rounded-full bg-primary/10"/>}
            <div className="flex-1"><div className="font-semibold">{t.name}</div><div className="text-xs text-muted-foreground">{t.role} · {t.category === "teaching" ? "शिक्षक" : "गैर-शिक्षण"}</div></div>
            <Button size="icon" variant="ghost" onClick={() => remove(t.id)} data-testid={`del-tch-${t.id}`}><Trash2 className="h-4 w-4"/></Button>
          </Card>
        ))}
      </div>
    </div>
  );
}

/* ---------- Facilities ---------- */
function FacilitiesTab() {
  const [items, load] = useList("/facilities");
  const [f, setF] = useState({ title: "", description: "", icon: "Sparkles", order: 0 });
  const [adding, setAdding] = useState(false);

  const add = async () => {
    if (!f.title) return toast.error("शीर्षक आवश्यक");
    setAdding(true);
    try {
      await api.post("/facilities", f);
      setF({ title: "", description: "", icon: "Sparkles", order: 0 });
      clearSiteCache();
      toast.success("सुविधा सफलतापूर्वक जोड़ी गई!");
      load();
    } catch (err) {
      toast.error(`त्रुटि: ${err?.message || "विफल"}`);
    } finally {
      setAdding(false);
    }
  };

  const remove = async (id) => {
    try {
      await api.delete(`/facilities/${id}`);
      clearSiteCache();
      toast.success("सुविधा हटाई गई!");
      load();
    } catch (err) {
      toast.error(`हटाने में त्रुटि: ${err?.message || "विफल"}`);
    }
  };

  const ICON_HINTS = ["Home", "BookOpen", "FlaskConical", "Cpu", "Users", "Utensils", "Droplets", "Wifi", "ShieldCheck", "Stethoscope", "Trophy", "Flower2", "Beaker", "Presentation", "ClipboardList", "User"];
  return (
    <div className="grid md:grid-cols-2 gap-6">
      <Card className="p-5 rounded-2xl">
        <div className="font-bold mb-3">नई सुविधा</div>
        <Input placeholder="शीर्षक" value={f.title} onChange={e=>setF({...f, title: e.target.value})} data-testid="fac-title"/>
        <Textarea placeholder="विवरण" className="mt-2" value={f.description} onChange={e=>setF({...f, description: e.target.value})}/>
        <select className="mt-2 w-full h-10 rounded-lg border border-border bg-card px-3" value={f.icon} onChange={e=>setF({...f, icon: e.target.value})}>
          {ICON_HINTS.map(i => <option key={i} value={i}>{i}</option>)}
        </select>
        <Input placeholder="क्रम" type="number" className="mt-2" value={f.order} onChange={e=>setF({...f, order: Number(e.target.value)})}/>
        <Button className="mt-3 rounded-full" onClick={add} disabled={adding} data-testid="add-fac"><Plus className="h-4 w-4 mr-1"/>{adding ? "जोड़ा जा रहा..." : "जोड़ें"}</Button>
      </Card>
      <div className="grid gap-3">
        {items.map(x => (
          <Card key={x.id} className="p-4 rounded-2xl flex gap-3">
            <div className="flex-1"><div className="font-semibold">{x.title}</div><div className="text-xs text-muted-foreground">{x.icon}</div><div className="text-sm mt-1">{x.description}</div></div>
            <Button size="icon" variant="ghost" onClick={() => remove(x.id)} data-testid={`del-fac-${x.id}`}><Trash2 className="h-4 w-4"/></Button>
          </Card>
        ))}
      </div>
    </div>
  );
}

/* ---------- Important Links ---------- */
function LinksTab() {
  const [items, load] = useList("/links");
  const [f, setF] = useState({ label: "", url: "", order: 0 });
  const [adding, setAdding] = useState(false);

  const add = async () => {
    if (!f.label || !f.url) return toast.error("लेबल व URL आवश्यक");
    setAdding(true);
    try {
      await api.post("/links", f);
      setF({ label: "", url: "", order: 0 });
      clearSiteCache();
      toast.success("लिंक सफलतापूर्वक जोड़ा गया!");
      load();
    } catch (err) {
      toast.error(`त्रुटि: ${err?.message || "विफल"}`);
    } finally {
      setAdding(false);
    }
  };

  const remove = async (id) => {
    try {
      await api.delete(`/links/${id}`);
      clearSiteCache();
      toast.success("लिंक हटाया गया!");
      load();
    } catch (err) {
      toast.error(`हटाने में त्रुटि: ${err?.message || "विफल"}`);
    }
  };

  return (
    <div className="grid md:grid-cols-2 gap-6">
      <Card className="p-5 rounded-2xl">
        <div className="font-bold mb-3">नया लिंक</div>
        <Input placeholder="लेबल" value={f.label} onChange={e=>setF({...f, label: e.target.value})} data-testid="lnk-label"/>
        <Input placeholder="URL" className="mt-2" value={f.url} onChange={e=>setF({...f, url: e.target.value})}/>
        <Input placeholder="क्रम" type="number" className="mt-2" value={f.order} onChange={e=>setF({...f, order: Number(e.target.value)})}/>
        <Button className="mt-3 rounded-full" onClick={add} disabled={adding} data-testid="add-lnk"><Plus className="h-4 w-4 mr-1"/>{adding ? "जोड़ा जा रहा..." : "जोड़ें"}</Button>
      </Card>
      <div className="grid gap-3">
        {items.map(l => (
          <Card key={l.id} className="p-4 rounded-2xl flex gap-3 items-center">
            <div className="flex-1"><div className="font-semibold">{l.label}</div><a className="text-xs text-primary underline truncate block" href={l.url} target="_blank" rel="noreferrer">{l.url}</a></div>
            <Button size="icon" variant="ghost" onClick={() => remove(l.id)} data-testid={`del-lnk-${l.id}`}><Trash2 className="h-4 w-4"/></Button>
          </Card>
        ))}
      </div>
    </div>
  );
}

/* ---------- Messages ---------- */
function MessagesTab() {
  const [items, setItems] = useState([]);
  useEffect(() => { api.get("/contact").then(r => setItems(asArray(r.data))).catch(() => setItems([])); }, []);
  return (
    <div className="grid gap-3">
      {items.map(m => (
        <Card key={m.id} className="p-4 rounded-2xl">
          <div className="flex justify-between text-sm text-muted-foreground"><span>{m.name} — {m.email}</span><span>{new Date(m.created_at).toLocaleString("hi-IN")}</span></div>
          {m.subject && <div className="font-semibold mt-1">{m.subject}</div>}
          <p className="mt-2 hindi text-sm">{m.message}</p>
          {m.phone && <div className="mt-1 text-xs">📞 {m.phone}</div>}
        </Card>
      ))}
      {items.length === 0 && <div className="text-center text-muted-foreground py-10">कोई संदेश नहीं</div>}
    </div>
  );
}

/* ---------- Hostel Management ---------- */
function HostelTab() {
  const [data, setData] = useState({
    heading: "आवासीय छात्रावास",
    subheading: "कस्तूरबा गांधी बालिका विद्यालय, गोड्डा — सुरक्षित एवं आरामदायक आवास",
    main_image: "",
    facilities_heading: "छात्रावास परिचय एवं सुविधाएँ",
    facilities_description: "",
    body: "",
    additional_blocks: [],
    images: []
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState(null);
  
  const replaceInputRefs = useRef({});
  const mainImageInputRef = useRef(null);

  useEffect(() => {
    api.get("/site-content/hostel")
      .then(r => {
        const val = r.data?.value;
        if (val) {
          const banner = val.main_image || val.desktop_banner || "";
          setData({
            heading: val.heading || "आवासीय छात्रावास",
            subheading: val.subheading || "कस्तूरबा गांधी बालिका विद्यालय, गोड्डा — सुरक्षित एवं आरामदायक आवास",
            main_image: banner,
            facilities_heading: val.facilities_heading || "छात्रावास परिचय एवं सुविधाएँ",
            facilities_description: val.facilities_description || val.body || "",
            body: val.body || val.facilities_description || "",
            additional_blocks: asArray(val.additional_blocks),
            images: asArray(val.images)
          });
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {
        ...data,
        main_image: data.main_image,
        desktop_banner: data.main_image,
        mobile_banner: "",
        body: data.facilities_description || data.body
      };
      await api.put("/site-content", { key: "hostel", value: payload });
      clearSiteCache();
      toast.success("छात्रावास सेटिंग्स सफलतापूर्वक सहेजी गईं!");
    } catch (err) {
      const errMsg = err?.response?.data?.detail || err?.response?.data?.message || err.message;
      toast.error("सहेजने में विफल: " + errMsg);
    } finally {
      setSaving(false);
    }
  };

  const validateFile = (file) => {
    const validTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    if (!validTypes.includes(file.type)) {
      toast.error("कृपया केवल JPG, PNG, या WebP चित्र अपलोड करें।");
      return false;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("चित्र का आकार 5MB से कम होना चाहिए।");
      return false;
    }
    return true;
  };

  const handleMainImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!validateFile(file)) return;

    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const { data: resData } = await api.post("/upload", fd, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      const absUrl = resData.url.startsWith("http") ? resData.url : `${API.replace(/\/api$/, "")}${resData.url}`;
      setData(prev => ({ ...prev, main_image: absUrl }));
      toast.success("मुख्य बैनर चित्र सफलतापूर्व अपलोड किया गया!");
    } catch (err) {
      toast.error("अपलोड विफल: " + err.message);
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const handleAddBlock = () => {
    const newBlock = {
      id: "block-" + Date.now(),
      title: "नया विवरण शीर्षक",
      description: "नया विवरण यहाँ दर्ज करें..."
    };
    setData(prev => ({
      ...prev,
      additional_blocks: [...(prev.additional_blocks || []), newBlock]
    }));
  };

  const handleUpdateBlock = (id, field, value) => {
    setData(prev => ({
      ...prev,
      additional_blocks: (prev.additional_blocks || []).map(b => b.id === id ? { ...b, [field]: value } : b)
    }));
  };

  const handleDeleteBlock = (id) => {
    setData(prev => ({
      ...prev,
      additional_blocks: (prev.additional_blocks || []).filter(b => b.id !== id)
    }));
  };

  const handleAddImage = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!validateFile(file)) return;

    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const { data: resData } = await api.post("/upload", fd, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      const absUrl = resData.url.startsWith("http") ? resData.url : `${API.replace(/\/api$/, "")}${resData.url}`;
      
      const newImg = {
        id: "img-" + Date.now() + "-" + Math.random().toString(36).substr(2, 9),
        url: absUrl,
        caption: file.name.split('.')[0] || "छात्रावास चित्र",
        visible: true
      };

      setData(prev => ({
        ...prev,
        images: [...prev.images, newImg]
      }));
      toast.success("नया चित्र गैलरी में जोड़ा गया!");
    } catch (err) {
      toast.error("अपलोड विफल: " + err.message);
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const handleReplaceImage = async (id, file) => {
    if (!file) return;
    if (!validateFile(file)) return;

    toast.loading("चित्र प्रतिस्थापित किया जा रहा है...");
    try {
      const fd = new FormData();
      fd.append("file", file);
      const { data: resData } = await api.post("/upload", fd, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      const absUrl = resData.url.startsWith("http") ? resData.url : `${API.replace(/\/api$/, "")}${resData.url}`;

      setData(prev => ({
        ...prev,
        images: prev.images.map(img => img.id === id ? { ...img, url: absUrl } : img)
      }));
      toast.dismiss();
      toast.success("चित्र प्रतिस्थापित किया गया!");
    } catch (err) {
      toast.dismiss();
      toast.error("प्रतिस्थापन विफल: " + err.message);
    }
  };

  const handleDeleteImage = (id) => {
    if (window.confirm("क्या आप वाकई इस चित्र को हटाना चाहते हैं?")) {
      setData(prev => ({
        ...prev,
        images: prev.images.filter(img => img.id !== id)
      }));
      toast.success("चित्र सूची से हटा दिया गया।");
    }
  };

  const toggleVisibility = (id) => {
    setData(prev => ({
      ...prev,
      images: prev.images.map(img => img.id === id ? { ...img, visible: img.visible === false ? true : false } : img)
    }));
  };

  const handleCaptionChange = (id, caption) => {
    setData(prev => ({
      ...prev,
      images: prev.images.map(img => img.id === id ? { ...img, caption } : img)
    }));
  };

  // Drag & Drop reordering
  const handleDragStart = (e, index) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e, index) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;
  };

  const handleDrop = (e, targetIndex) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === targetIndex) return;

    const list = [...data.images];
    const [draggedItem] = list.splice(draggedIndex, 1);
    list.splice(targetIndex, 0, draggedItem);

    setData(prev => ({ ...prev, images: list }));
    setDraggedIndex(null);
  };

  if (loading) {
    return <div className="p-10 text-center text-muted-foreground animate-pulse">छात्रावास डेटा लोड हो रहा है...</div>;
  }

  return (
    <div className="space-y-6 animate-fade-in" id="hostel-tab-container">
      {/* Header and save button */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <h2 className="text-xl font-bold text-foreground">छात्रावास प्रबंधन (Hostel Management)</h2>
          <p className="text-sm text-muted-foreground">शीर्षक, उप-शीर्षक, मुख्य बैनर चित्र, सुविधा विवरण, अतिरिक्त ब्लॉक एवं चित्र गैलरी संपादित करें।</p>
        </div>
        <Button 
          onClick={handleSave} 
          disabled={saving} 
          className="rounded-full shadow-md hover:shadow-lg transition-all"
          id="hostel-save-btn"
          data-testid="hostel-save-btn"
        >
          <Save className="h-4 w-4 mr-2" />
          {saving ? "सहेजा जा रहा है..." : "बदलाव सहेजें"}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column: Text content & Main Banner Image */}
        <div className="lg:col-span-1 space-y-6">
          {/* Header & Main Image Card */}
          <Card className="p-5 rounded-2xl border border-border bg-card/60 backdrop-blur-sm space-y-4">
            <h3 className="font-bold text-lg text-primary">पेज शीर्षक व मुख्य बैनर</h3>
            
            <div className="space-y-2">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">छात्रावास पेज शीर्षक</label>
              <Input 
                value={data.heading || ""} 
                onChange={e => setData(prev => ({ ...prev, heading: e.target.value }))}
                placeholder="उदा. आवासीय छात्रावास"
                className="rounded-xl"
                id="hostel-input-heading"
                data-testid="hostel-heading-input"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">उप-शीर्षक (Subtitle)</label>
              <Input 
                value={data.subheading || ""} 
                onChange={e => setData(prev => ({ ...prev, subheading: e.target.value }))}
                placeholder="उदा. कस्तूरबा गांधी बालिका विद्यालय..."
                className="rounded-xl"
                id="hostel-input-subheading"
                data-testid="hostel-subheading-input"
              />
            </div>

            {/* Main Banner Image Upload */}
            <div className="space-y-2 pt-3 border-t border-border">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">मुख्य बैनर चित्र (Main Banner Image)</label>
              </div>
              
              {data.main_image ? (
                <div className="relative rounded-2xl overflow-hidden border border-border bg-muted group h-40">
                  <img src={data.main_image} alt="Main Banner" className="w-full h-full object-contain bg-black/80" />
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <Button 
                      size="sm" 
                      variant="secondary" 
                      onClick={() => mainImageInputRef.current?.click()}
                      className="rounded-full text-xs"
                      id="hostel-main-replace-btn"
                    >
                      चित्र बदलें
                    </Button>
                    <Button 
                      size="sm" 
                      variant="destructive" 
                      onClick={() => setData(prev => ({ ...prev, main_image: "" }))}
                      className="rounded-full text-xs"
                      id="hostel-main-delete-btn"
                    >
                      हटाएं
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="border-2 border-dashed border-border rounded-2xl p-4 text-center space-y-2 bg-muted/30">
                  <p className="text-xs text-muted-foreground">कोई मुख्य बैनर सेट नहीं है (गैलरी का पहला चित्र प्रदर्शित होगा)</p>
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => mainImageInputRef.current?.click()}
                    disabled={uploading}
                    className="rounded-full text-xs"
                    id="hostel-main-upload-btn"
                  >
                    <Upload className="h-3.5 w-3.5 mr-1" />
                    {uploading ? "अपलोड हो रहा है..." : "मुख्य बैनर चित्र अपलोड करें"}
                  </Button>
                </div>
              )}
              <input 
                type="file" 
                ref={mainImageInputRef}
                accept="image/jpeg,image/png,image/webp"
                onChange={handleMainImageUpload}
                className="hidden" 
                id="hostel-main-file-input"
              />
            </div>
          </Card>

          {/* Facilities Heading & Description Card */}
          <Card className="p-5 rounded-2xl border border-border bg-card/60 backdrop-blur-sm space-y-4">
            <h3 className="font-bold text-lg text-primary">सुविधा विवरण (Facilities)</h3>
            
            <div className="space-y-2">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">सुविधाएँ शीर्षक</label>
              <Input 
                value={data.facilities_heading || ""} 
                onChange={e => setData(prev => ({ ...prev, facilities_heading: e.target.value }))}
                placeholder="उदा. छात्रावास परिचय एवं सुविधाएँ"
                className="rounded-xl"
                id="hostel-input-fac-heading"
                data-testid="hostel-fac-heading-input"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">सुविधाओं का विस्तृत विवरण</label>
              <Textarea 
                value={data.facilities_description || data.body || ""} 
                onChange={e => setData(prev => ({ ...prev, facilities_description: e.target.value, body: e.target.value }))}
                placeholder="छात्रावास की व्यवस्था, स्वच्छता, सुरक्षा, भोजन आदि का विवरण लिखें..."
                rows={6}
                className="rounded-xl resize-y font-sans leading-relaxed text-sm"
                id="hostel-input-body"
                data-testid="hostel-body-input"
              />
            </div>
          </Card>

          {/* Additional Content Blocks Card */}
          <Card className="p-5 rounded-2xl border border-border bg-card/60 backdrop-blur-sm space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-lg text-primary">अतिरिक्त विवरण ब्लॉक</h3>
              <Button 
                type="button" 
                size="sm" 
                variant="outline" 
                onClick={handleAddBlock}
                className="rounded-full text-xs"
                id="hostel-add-block-btn"
              >
                <Plus className="h-3.5 w-3.5 mr-1" /> ब्लॉक जोड़ें
              </Button>
            </div>

            {(data.additional_blocks || []).length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4 border border-dashed rounded-xl">
                कोई अतिरिक्त ब्लॉक नहीं है। "ब्लॉक जोड़ें" बटन दबाएँ।
              </p>
            ) : (
              <div className="space-y-3">
                {(data.additional_blocks || []).map((block, bIdx) => (
                  <div key={block.id || bIdx} className="p-3 border rounded-xl bg-card space-y-2 relative">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-muted-foreground">ब्लॉक #{bIdx + 1}</span>
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        onClick={() => handleDeleteBlock(block.id)}
                        className="h-6 px-1 text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                    <Input 
                      value={block.title || ""} 
                      onChange={e => handleUpdateBlock(block.id, "title", e.target.value)}
                      placeholder="ब्लॉक शीर्षक (उदा. सुरक्षा एवं नियम)"
                      className="h-8 text-xs rounded-lg font-medium"
                    />
                    <Textarea 
                      value={block.description || ""} 
                      onChange={e => handleUpdateBlock(block.id, "description", e.target.value)}
                      placeholder="ब्लॉक विवरण दर्ज करें..."
                      rows={2}
                      className="text-xs rounded-lg font-sans resize-y"
                    />
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* Right column: Image gallery manager */}
        <div className="lg:col-span-2 space-y-4">
          <Card className="p-5 rounded-2xl border border-border bg-card/60 backdrop-blur-sm space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-3">
              <div>
                <h3 className="font-bold text-lg text-primary">छात्रावास चित्र गैलरी</h3>
                <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                  <Info className="h-3.5 w-3.5" />
                  चित्रों को री-ऑर्डर करने के लिए ड्रैग एंड ड्रॉप करें।
                </p>
              </div>

              {/* Add image button */}
              <div className="relative">
                <input 
                  type="file" 
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleAddImage}
                  disabled={uploading}
                  className="hidden" 
                  id="hostel-add-image-input"
                />
                <Button 
                  onClick={() => document.getElementById("hostel-add-image-input").click()}
                  disabled={uploading}
                  variant="outline"
                  className="rounded-full border-primary/20 hover:border-primary/50 text-primary bg-primary/5"
                  id="hostel-add-image-btn"
                  data-testid="hostel-add-image-btn"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  {uploading ? "अपलोड हो रहा है..." : "नया चित्र अपलोड करें"}
                </Button>
              </div>
            </div>

            {/* List of images */}
            {data.images.length === 0 ? (
              <div className="border border-dashed border-border rounded-2xl p-10 text-center text-muted-foreground">
                <p className="text-sm">कोई चित्र नहीं है। कृपया नया चित्र अपलोड करें।</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4" id="hostel-images-list">
                {data.images.map((img, index) => (
                  <div 
                    key={img.id || index}
                    draggable
                    onDragStart={(e) => handleDragStart(e, index)}
                    onDragOver={(e) => handleDragOver(e, index)}
                    onDrop={(e) => handleDrop(e, index)}
                    className={`relative flex flex-col justify-between border rounded-2xl p-3 bg-card shadow-sm transition-all duration-300 hover:shadow-md cursor-grab active:cursor-grabbing ${
                      img.visible === false ? "opacity-60 border-orange-200 bg-orange-50/5" : "border-border"
                    } ${draggedIndex === index ? "ring-2 ring-primary scale-[0.98]" : ""}`}
                    id={`hostel-img-card-${index}`}
                    data-testid={`hostel-img-card-${index}`}
                  >
                    {/* Header: drag handle and image name/status */}
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <GripVertical className="h-4 w-4 cursor-grab" />
                        <span className="text-xs font-semibold">क्रम #{index + 1}</span>
                      </div>
                      {img.visible === false ? (
                        <span className="text-[10px] bg-orange-100 text-orange-700 font-bold px-2 py-0.5 rounded-full">वेबसाइट पर छिपा हुआ</span>
                      ) : (
                        <span className="text-[10px] bg-green-100 text-green-700 font-bold px-2 py-0.5 rounded-full">वेबसाइट पर दृश्यमान</span>
                      )}
                    </div>

                    {/* Image and Caption form row */}
                    <div className="flex gap-3">
                      {/* Left: Thumbnail with click replacement */}
                      <div className="relative h-20 w-24 rounded-lg overflow-hidden bg-muted flex-shrink-0 group">
                        <img src={img.url} alt="" className="h-full w-full object-cover" />
                        <button 
                          onClick={() => replaceInputRefs.current[img.id]?.click()}
                          className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-[10px] text-white font-medium"
                          title="बदलें"
                        >
                          बदलें
                        </button>
                        <input 
                          type="file"
                          accept="image/jpeg,image/png,image/webp"
                          ref={el => replaceInputRefs.current[img.id] = el}
                          onChange={(e) => handleReplaceImage(img.id, e.target.files?.[0])}
                          className="hidden"
                        />
                      </div>

                      {/* Right: Caption input */}
                      <div className="flex-1 flex flex-col justify-center space-y-1">
                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">कैप्शन (Caption)</span>
                        <Input 
                          value={img.caption || ""} 
                          onChange={(e) => handleCaptionChange(img.id, e.target.value)}
                          placeholder="उदा. हॉस्टल रूम"
                          className="h-8 text-xs rounded-lg"
                          data-testid={`hostel-img-caption-${index}`}
                        />
                      </div>
                    </div>

                    {/* Bottom actions bar */}
                    <div className="flex items-center justify-end gap-1.5 mt-3 border-t border-border/60 pt-2">
                      <Button 
                        size="sm" 
                        type="button"
                        variant="ghost" 
                        onClick={() => toggleVisibility(img.id)}
                        className={`h-8 px-2 rounded-lg text-xs font-medium ${
                          img.visible === false ? "text-orange-600 hover:text-orange-700 bg-orange-50 hover:bg-orange-100/50" : "text-muted-foreground"
                        }`}
                        title={img.visible === false ? "दिखाएं" : "छिपाएं"}
                        data-testid={`hostel-img-toggle-visible-${index}`}
                      >
                        {img.visible === false ? (
                          <><EyeOff className="h-3.5 w-3.5 mr-1" /> छिपा हुआ</>
                        ) : (
                          <><Eye className="h-3.5 w-3.5 mr-1" /> दृश्यमान</>
                        )}
                      </Button>

                      <Button 
                        size="sm" 
                        type="button"
                        variant="ghost" 
                        onClick={() => handleDeleteImage(img.id)}
                        className="h-8 px-2 rounded-lg text-xs font-medium text-red-600 hover:text-red-700 hover:bg-red-50"
                        title="हटाएं"
                        data-testid={`hostel-img-delete-${index}`}
                      >
                        <Trash2 className="h-3.5 w-3.5 mr-1" />
                        हटाएं
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
