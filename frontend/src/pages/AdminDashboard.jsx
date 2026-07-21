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
import { LogOut, Trash2, Upload, Plus, Save } from "lucide-react";

const GAL_CATS = ["Campus", "Classrooms", "Hostel", "Library", "Laboratory", "Activities", "Sports", "Events", "Educational Tours", "Celebrations", "Teachers", "Students", "Infrastructure"];
const TAB_BTN = "rounded-full data-[state=active]:bg-primary data-[state=active]:text-primary-foreground border px-3 py-1.5 text-sm";

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

function SectionForm({ title, initial, onSave, fields, testId }) {
  const [v, setV] = useState(initial);
  useEffect(() => setV(initial), [initial]);
  const [saving, setSaving] = useState(false);
  const set = (k, isNumber) => (e) => setV({ ...v, [k]: isNumber ? (e.target.value === "" ? "" : Number(e.target.value)) : e.target.value });
  const save = async () => {
    setSaving(true);
    try {
      await onSave(v);
      toast.success("सहेजा गया");
    }
    catch (err) {
      const errMsg = err?.response?.data?.detail || err?.response?.data?.message || err?.message || "त्रुटि";
      toast.error(`त्रुटि: ${errMsg}`);
    }
    finally { setSaving(false); }
  };
  return (
    <Card className="p-5 rounded-2xl" data-testid={testId}>
      <div className="font-bold mb-3 text-primary">{title}</div>
      <div className="grid gap-3">
        {fields.map((f) => (
          <div key={f.key}>
            <label className="text-xs font-medium text-muted-foreground">{f.label}</label>
            {f.type === "textarea" ? (
              <Textarea rows={f.rows || 3} value={v[f.key] ?? ""} onChange={set(f.key, false)} data-testid={`${testId}-${f.key}`}/>
            ) : f.type === "image" ? (
              <div className="flex items-center gap-3">
                <Input value={v[f.key] ?? ""} onChange={set(f.key, false)} placeholder="URL या अपलोड करें" data-testid={`${testId}-${f.key}`}/>
                <UploadInput testId={`${testId}-${f.key}-upload`} onUploaded={(d) => setV(x => ({ ...x, [f.key]: d.absolute_url }))}/>
                {v[f.key] && <img src={v[f.key]} alt="" className="h-10 w-10 rounded object-cover"/>}
              </div>
            ) : f.type === "color" ? (
              <div className="flex items-center gap-2">
                <input type="color" value={/^#[0-9a-fA-F]{6}$/.test(v[f.key] || "") ? v[f.key] : "#0056B3"} onChange={set(f.key, false)} className="h-10 w-14 rounded border border-border bg-transparent cursor-pointer" data-testid={`${testId}-${f.key}-picker`}/>
                <Input value={v[f.key] ?? ""} onChange={set(f.key, false)} placeholder="#RRGGBB" data-testid={`${testId}-${f.key}`}/>
              </div>
            ) : (
              <Input type={f.type || "text"} value={v[f.key] ?? ""} onChange={set(f.key, f.type === "number")} data-testid={`${testId}-${f.key}`}/>
            )}
          </div>
        ))}
      </div>
      <Button onClick={save} disabled={saving} className="mt-4 rounded-full" data-testid={`${testId}-save`}>
        <Save className="h-4 w-4 mr-1"/>{saving ? "सहेजा जा रहा..." : "सहेजें"}
      </Button>
    </Card>
  );
}

/* ---------- Content Tab (Site Settings) ---------- */
function ContentTab() {
  const [data, setData] = useState({});
  const keys = ["branding", "theme", "hero", "about", "vision", "mission", "principal", "warden", "stats", "contact", "social", "footer", "seo", "admission", "academics", "hostel"];
  useEffect(() => {
    (async () => {
      const res = await Promise.all(keys.map(k => api.get(`/site-content/${k}`).then(r => [k, r.data?.value || {}]).catch(() => [k, {}])));
      setData(Object.fromEntries(res));
    })();
    // eslint-disable-next-line
  }, []);
  const save = (key) => async (v) => {
    await api.put("/site-content", { key, value: v });
    setData(d => ({ ...d, [key]: v }));
    // Live-apply theme changes without full reload
    if (key === "theme") {
      window.dispatchEvent(new CustomEvent("kgbv-theme-changed", { detail: v }));
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
      { key: "primary", label: "Primary रंग (मुख्य)", type: "color" },
      { key: "secondary", label: "Secondary रंग (सहायक)", type: "color" },
      { key: "accent", label: "Accent रंग (हल्का)", type: "color" },
      { key: "background", label: "Background रंग", type: "color" },
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
    { key: "hostel", title: "छात्रावास (Hostel) जानकारी", fields: [
      { key: "heading", label: "शीर्षक" },
      { key: "body", label: "विवरण", type: "textarea", rows: 5 },
    ]},
  ];

  return (
    <div className="grid md:grid-cols-2 gap-5">
      {sections.map(s => (
        <SectionForm key={s.key} title={s.title} initial={data[s.key] || {}} onSave={save(s.key)} fields={s.fields} testId={`sec-${s.key}`}/>
      ))}
    </div>
  );
}

/* ---------- Banners ---------- */
function BannersTab() {
  const [items, load] = useList("/banners?active_only=false");
  const [f, setF] = useState({ title: "", subtitle: "", image_url: "", link: "", is_active: true, order: 0 });
  const add = async () => {
    if (!f.image_url) return toast.error("बैनर चित्र आवश्यक");
    await api.post("/banners", f);
    setF({ title: "", subtitle: "", image_url: "", link: "", is_active: true, order: 0 });
    load(); toast.success("जोड़ा गया");
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
        <Button className="mt-3 rounded-full" onClick={add} data-testid="add-ban"><Plus className="h-4 w-4 mr-1"/>जोड़ें</Button>
      </Card>
      <div className="grid grid-cols-2 gap-3">
        {items.map(b => (
          <Card key={b.id} className="rounded-2xl overflow-hidden relative">
            <img src={b.image_url} alt={b.title} className="w-full h-28 object-cover"/>
            <div className="p-2 text-xs truncate">{b.title || "—"}</div>
            <Button size="icon" variant="destructive" className="absolute top-1 right-1 h-7 w-7" onClick={async()=>{await api.delete(`/banners/${b.id}`); load();}} data-testid={`del-ban-${b.id}`}><Trash2 className="h-3 w-3"/></Button>
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
  const add = async () => {
    if (!f.title) return toast.error("शीर्षक आवश्यक");
    await api.post("/notices", f);
    setF({ title: "", body: "", priority: "normal", is_active: true });
    load();
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
        <Button className="mt-3 rounded-full" onClick={add} data-testid="add-notice"><Plus className="h-4 w-4 mr-1"/>जोड़ें</Button>
      </Card>
      <div className="grid gap-3">
        {items.map(n => (
          <Card key={n.id} className="p-4 rounded-2xl flex items-start gap-3">
            <div className="flex-1">
              <div className="font-bold">{n.title} {n.priority === "urgent" && <span className="text-xs text-red-600">[तात्कालिक]</span>}</div>
              <div className="text-sm text-muted-foreground">{n.body}</div>
            </div>
            <Button size="icon" variant="ghost" onClick={async()=>{await api.delete(`/notices/${n.id}`); load();}} data-testid={`del-notice-${n.id}`}><Trash2 className="h-4 w-4"/></Button>
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
  const add = async () => {
    if (!f.title) return toast.error("शीर्षक आवश्यक");
    await api.post("/events", f);
    setF({ title: "", description: "", date: "", image_url: "", is_active: true }); load();
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
        <Button className="mt-3 rounded-full" onClick={add} data-testid="add-ev"><Plus className="h-4 w-4 mr-1"/>जोड़ें</Button>
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
            <Button size="icon" variant="ghost" onClick={async()=>{await api.delete(`/events/${e.id}`); load();}} data-testid={`del-ev-${e.id}`}><Trash2 className="h-4 w-4"/></Button>
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
  const add = async () => {
    if (!f.title) return toast.error("शीर्षक आवश्यक");
    await api.post("/achievements", f);
    setF({ title: "", description: "", image_url: "", year: "" }); load();
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
        <Button className="mt-3 rounded-full" onClick={add} data-testid="add-ach"><Plus className="h-4 w-4 mr-1"/>जोड़ें</Button>
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
            <Button size="icon" variant="ghost" onClick={async()=>{await api.delete(`/achievements/${a.id}`); load();}} data-testid={`del-ach-${a.id}`}><Trash2 className="h-4 w-4"/></Button>
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
  const add = async () => {
    if (!f.title || !f.image_url) return toast.error("शीर्षक व चित्र आवश्यक");
    await api.post("/gallery", f); setF({ title: "", category: "Campus", image_url: "", caption: "" }); load();
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
        <Button className="mt-3 rounded-full" onClick={add} data-testid="add-gal"><Plus className="h-4 w-4 mr-1"/>जोड़ें</Button>
      </Card>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {items.map(g => (
          <Card key={g.id} className="rounded-2xl overflow-hidden relative">
            <img src={g.image_url} alt={g.title} className="w-full h-28 object-cover"/>
            <div className="p-2 text-xs"><div className="font-semibold truncate">{g.title}</div><div className="text-muted-foreground">{g.category}</div></div>
            <Button size="icon" variant="destructive" className="absolute top-1 right-1 h-7 w-7" onClick={async()=>{await api.delete(`/gallery/${g.id}`); load();}} data-testid={`del-gal-${g.id}`}><Trash2 className="h-3 w-3"/></Button>
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
  const parseId = (v) => { const m = v.match(/(?:v=|youtu\.be\/|embed\/)([\w-]{11})/); return m ? m[1] : v; };
  const add = async () => {
    if (!f.title || !f.youtube_id) return toast.error("शीर्षक व YouTube ID/URL आवश्यक");
    await api.post("/videos", { ...f, youtube_id: parseId(f.youtube_id) });
    setF({ title: "", youtube_id: "", description: "", category: "General" }); load();
  };
  return (
    <div className="grid md:grid-cols-2 gap-6">
      <Card className="p-5 rounded-2xl">
        <div className="font-bold mb-3">नया वीडियो</div>
        <Input placeholder="शीर्षक" value={f.title} onChange={e=>setF({...f, title: e.target.value})} data-testid="vid-title"/>
        <Input placeholder="YouTube URL या ID" className="mt-2" value={f.youtube_id} onChange={e=>setF({...f, youtube_id: e.target.value})} data-testid="vid-id"/>
        <Textarea placeholder="विवरण" className="mt-2" value={f.description} onChange={e=>setF({...f, description: e.target.value})}/>
        <Button className="mt-3 rounded-full" onClick={add} data-testid="add-vid"><Plus className="h-4 w-4 mr-1"/>जोड़ें</Button>
      </Card>
      <div className="grid gap-3">
        {items.map(v => (
          <Card key={v.id} className="p-3 rounded-2xl flex gap-3">
            <img src={`https://img.youtube.com/vi/${v.youtube_id}/mqdefault.jpg`} alt="" className="h-20 w-32 object-cover rounded-lg"/>
            <div className="flex-1"><div className="font-semibold">{v.title}</div><div className="text-xs text-muted-foreground">{v.youtube_id}</div></div>
            <Button size="icon" variant="ghost" onClick={async()=>{await api.delete(`/videos/${v.id}`); load();}} data-testid={`del-vid-${v.id}`}><Trash2 className="h-4 w-4"/></Button>
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
  const add = async () => {
    if (!f.title || !f.file_url) return toast.error("शीर्षक व फ़ाइल आवश्यक");
    await api.post("/downloads", f); setF({ title: "", file_url: "", description: "", category: "General" }); load();
  };
  return (
    <div className="grid md:grid-cols-2 gap-6">
      <Card className="p-5 rounded-2xl">
        <div className="font-bold mb-3">नई फ़ाइल</div>
        <Input placeholder="शीर्षक" value={f.title} onChange={e=>setF({...f, title: e.target.value})} data-testid="dl-title"/>
        <Input placeholder="URL या अपलोड करें" className="mt-2" value={f.file_url} onChange={e=>setF({...f, file_url: e.target.value})} data-testid="dl-url"/>
        <div className="mt-2"><UploadInput testId="dl-upload" onUploaded={d=>setF(x=>({...x, file_url: d.url}))}/></div>
        <Textarea placeholder="विवरण" className="mt-2" value={f.description} onChange={e=>setF({...f, description: e.target.value})}/>
        <Button className="mt-3 rounded-full" onClick={add} data-testid="add-dl"><Plus className="h-4 w-4 mr-1"/>जोड़ें</Button>
      </Card>
      <div className="grid gap-3">
        {items.map(d => (
          <Card key={d.id} className="p-4 rounded-2xl flex gap-3 items-center">
            <div className="flex-1"><div className="font-semibold">{d.title}</div><div className="text-xs text-muted-foreground truncate">{d.file_url}</div></div>
            <Button size="icon" variant="ghost" onClick={async()=>{await api.delete(`/downloads/${d.id}`); load();}} data-testid={`del-dl-${d.id}`}><Trash2 className="h-4 w-4"/></Button>
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
  const add = async () => {
    if (!f.name || !f.role) return toast.error("नाम व पद आवश्यक");
    await api.post("/teachers", f); setF({ name: "", role: "", image_url: "", bio: "", category: "teaching", order: 0 }); load();
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
        <Button className="mt-3 rounded-full" onClick={add} data-testid="add-tch"><Plus className="h-4 w-4 mr-1"/>जोड़ें</Button>
      </Card>
      <div className="grid gap-3">
        {items.map(t => (
          <Card key={t.id} className="p-3 rounded-2xl flex gap-3 items-center">
            {t.image_url ? <img src={t.image_url} alt="" className="h-14 w-14 rounded-full object-cover"/> : <div className="h-14 w-14 rounded-full bg-primary/10"/>}
            <div className="flex-1"><div className="font-semibold">{t.name}</div><div className="text-xs text-muted-foreground">{t.role} · {t.category === "teaching" ? "शिक्षक" : "गैर-शिक्षण"}</div></div>
            <Button size="icon" variant="ghost" onClick={async()=>{await api.delete(`/teachers/${t.id}`); load();}} data-testid={`del-tch-${t.id}`}><Trash2 className="h-4 w-4"/></Button>
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
  const add = async () => {
    if (!f.title) return toast.error("शीर्षक आवश्यक");
    await api.post("/facilities", f); setF({ title: "", description: "", icon: "Sparkles", order: 0 }); load();
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
        <Button className="mt-3 rounded-full" onClick={add} data-testid="add-fac"><Plus className="h-4 w-4 mr-1"/>जोड़ें</Button>
      </Card>
      <div className="grid gap-3">
        {items.map(x => (
          <Card key={x.id} className="p-4 rounded-2xl flex gap-3">
            <div className="flex-1"><div className="font-semibold">{x.title}</div><div className="text-xs text-muted-foreground">{x.icon}</div><div className="text-sm mt-1">{x.description}</div></div>
            <Button size="icon" variant="ghost" onClick={async()=>{await api.delete(`/facilities/${x.id}`); load();}} data-testid={`del-fac-${x.id}`}><Trash2 className="h-4 w-4"/></Button>
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
  const add = async () => {
    if (!f.label || !f.url) return toast.error("लेबल व URL आवश्यक");
    await api.post("/links", f); setF({ label: "", url: "", order: 0 }); load();
  };
  return (
    <div className="grid md:grid-cols-2 gap-6">
      <Card className="p-5 rounded-2xl">
        <div className="font-bold mb-3">नया लिंक</div>
        <Input placeholder="लेबल" value={f.label} onChange={e=>setF({...f, label: e.target.value})} data-testid="lnk-label"/>
        <Input placeholder="URL" className="mt-2" value={f.url} onChange={e=>setF({...f, url: e.target.value})}/>
        <Input placeholder="क्रम" type="number" className="mt-2" value={f.order} onChange={e=>setF({...f, order: Number(e.target.value)})}/>
        <Button className="mt-3 rounded-full" onClick={add} data-testid="add-lnk"><Plus className="h-4 w-4 mr-1"/>जोड़ें</Button>
      </Card>
      <div className="grid gap-3">
        {items.map(l => (
          <Card key={l.id} className="p-4 rounded-2xl flex gap-3 items-center">
            <div className="flex-1"><div className="font-semibold">{l.label}</div><a className="text-xs text-primary underline truncate block" href={l.url} target="_blank" rel="noreferrer">{l.url}</a></div>
            <Button size="icon" variant="ghost" onClick={async()=>{await api.delete(`/links/${l.id}`); load();}} data-testid={`del-lnk-${l.id}`}><Trash2 className="h-4 w-4"/></Button>
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
