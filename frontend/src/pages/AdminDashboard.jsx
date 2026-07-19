import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, asArray } from "../lib/api";
import { useAuth } from "../lib/AuthContext";
import { Card } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Textarea } from "../components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../components/ui/tabs";
import { toast } from "sonner";
import { LogOut, Trash2, Upload, Plus } from "lucide-react";

const GAL_CATS = ["Campus", "Classrooms", "Hostel", "Library", "Laboratory", "Activities", "Sports", "Events", "Educational Tours", "Celebrations", "Teachers", "Students", "Infrastructure"];

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
    <div className="max-w-7xl mx-auto px-4 py-10" data-testid="admin-dashboard">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl md:text-4xl font-extrabold text-primary">एडमिन डैशबोर्ड</h1>
          <p className="text-sm text-muted-foreground">स्वागत, {user.name}</p>
        </div>
        <Button variant="outline" onClick={async () => { await logout(); navigate("/"); }} data-testid="admin-logout"><LogOut className="h-4 w-4 mr-2"/>लॉगआउट</Button>
      </div>

      <Tabs defaultValue="notices">
        <TabsList className="flex flex-wrap h-auto gap-2 bg-transparent p-0">
          <TabsTrigger value="notices" data-testid="tab-notices" className="rounded-full data-[state=active]:bg-primary data-[state=active]:text-primary-foreground border">सूचनाएँ</TabsTrigger>
          <TabsTrigger value="gallery" data-testid="tab-gallery" className="rounded-full data-[state=active]:bg-primary data-[state=active]:text-primary-foreground border">गैलरी</TabsTrigger>
          <TabsTrigger value="videos" data-testid="tab-videos" className="rounded-full data-[state=active]:bg-primary data-[state=active]:text-primary-foreground border">वीडियो</TabsTrigger>
          <TabsTrigger value="downloads" data-testid="tab-downloads" className="rounded-full data-[state=active]:bg-primary data-[state=active]:text-primary-foreground border">डाउनलोड</TabsTrigger>
          <TabsTrigger value="content" data-testid="tab-content" className="rounded-full data-[state=active]:bg-primary data-[state=active]:text-primary-foreground border">पृष्ठ सामग्री</TabsTrigger>
          <TabsTrigger value="messages" data-testid="tab-messages" className="rounded-full data-[state=active]:bg-primary data-[state=active]:text-primary-foreground border">संदेश</TabsTrigger>
        </TabsList>

        <TabsContent value="notices" className="mt-6"><NoticesTab /></TabsContent>
        <TabsContent value="gallery" className="mt-6"><GalleryTab /></TabsContent>
        <TabsContent value="videos" className="mt-6"><VideosTab /></TabsContent>
        <TabsContent value="downloads" className="mt-6"><DownloadsTab /></TabsContent>
        <TabsContent value="content" className="mt-6"><ContentTab /></TabsContent>
        <TabsContent value="messages" className="mt-6"><MessagesTab /></TabsContent>
      </Tabs>
    </div>
  );
}

function NoticesTab() {
  const [items, setItems] = useState([]);
  const [form, setForm] = useState({ title: "", body: "", priority: "normal" });
  const load = () => api.get("/notices?active_only=false").then((r) => setItems(asArray(r.data))).catch(() => setItems([]));
  useEffect(() => { load(); }, []);
  const add = async () => {
    if (!form.title) return toast.error("शीर्षक आवश्यक");
    await api.post("/notices", { ...form, is_active: true });
    setForm({ title: "", body: "", priority: "normal" });
    load();
    toast.success("जोड़ी गई");
  };
  const del = async (id) => { await api.delete(`/notices/${id}`); load(); };
  return (
    <div className="grid md:grid-cols-2 gap-6">
      <Card className="p-5 rounded-2xl">
        <div className="font-bold mb-3">नई सूचना</div>
        <Input placeholder="शीर्षक" value={form.title} onChange={(e)=>setForm({...form, title: e.target.value})} data-testid="notice-title" />
        <Textarea placeholder="विवरण" className="mt-2" value={form.body} onChange={(e)=>setForm({...form, body: e.target.value})} data-testid="notice-body"/>
        <select className="mt-2 w-full h-10 rounded-lg border border-border bg-card px-3" value={form.priority} onChange={(e)=>setForm({...form, priority: e.target.value})} data-testid="notice-priority">
          <option value="normal">सामान्य</option>
          <option value="urgent">तात्कालिक</option>
        </select>
        <Button className="mt-3 rounded-full" onClick={add} data-testid="add-notice"><Plus className="h-4 w-4 mr-1"/>जोड़ें</Button>
      </Card>
      <div className="grid gap-3">
        {items.map((n) => (
          <Card key={n.id} className="p-4 rounded-2xl flex items-start gap-3">
            <div className="flex-1">
              <div className="font-bold">{n.title} {n.priority === "urgent" && <span className="text-xs text-red-600">[तात्कालिक]</span>}</div>
              <div className="text-sm text-muted-foreground">{n.body}</div>
            </div>
            <Button size="icon" variant="ghost" onClick={() => del(n.id)} data-testid={`del-notice-${n.id}`}><Trash2 className="h-4 w-4"/></Button>
          </Card>
        ))}
      </div>
    </div>
  );
}

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
      onUploaded(data);
    } catch { toast.error("अपलोड असफल"); }
    finally { setBusy(false); e.target.value = ""; }
  };
  return (
    <div>
      <input ref={inputRef} type="file" className="hidden" onChange={handle} data-testid={testId}/>
      <Button variant="outline" onClick={() => inputRef.current.click()} disabled={busy} className="rounded-full">
        <Upload className="h-4 w-4 mr-1"/>{busy ? "अपलोड..." : "फ़ाइल चुनें"}
      </Button>
    </div>
  );
}

function GalleryTab() {
  const [items, setItems] = useState([]);
  const [form, setForm] = useState({ title: "", category: "Campus", image_url: "", caption: "" });
  const load = () => api.get("/gallery").then((r) => setItems(asArray(r.data))).catch(() => setItems([]));
  useEffect(() => { load(); }, []);
  const add = async () => {
    if (!form.title || !form.image_url) return toast.error("शीर्षक व चित्र आवश्यक");
    await api.post("/gallery", form);
    setForm({ title: "", category: "Campus", image_url: "", caption: "" });
    load();
    toast.success("जोड़ी गई");
  };
  const del = async (id) => { await api.delete(`/gallery/${id}`); load(); };
  return (
    <div className="grid lg:grid-cols-2 gap-6">
      <Card className="p-5 rounded-2xl">
        <div className="font-bold mb-3">नई तस्वीर</div>
        <Input placeholder="शीर्षक" value={form.title} onChange={(e)=>setForm({...form, title: e.target.value})} data-testid="gal-title"/>
        <select className="mt-2 w-full h-10 rounded-lg border border-border bg-card px-3" value={form.category} onChange={(e)=>setForm({...form, category: e.target.value})} data-testid="gal-cat">
          {GAL_CATS.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <Input placeholder="चित्र URL या नीचे से अपलोड करें" className="mt-2" value={form.image_url} onChange={(e)=>setForm({...form, image_url: e.target.value})} data-testid="gal-url"/>
        <div className="mt-2 flex items-center gap-3">
          <UploadInput testId="gal-upload" onUploaded={(d)=>setForm(f=>({...f, image_url: `${process.env.REACT_APP_BACKEND_URL}${d.url}`}))}/>
          {form.image_url && <img src={form.image_url} alt="preview" className="h-12 w-12 rounded object-cover"/>}
        </div>
        <Input placeholder="कैप्शन (वैकल्पिक)" className="mt-2" value={form.caption} onChange={(e)=>setForm({...form, caption: e.target.value})}/>
        <Button className="mt-3 rounded-full" onClick={add} data-testid="add-gal"><Plus className="h-4 w-4 mr-1"/>जोड़ें</Button>
      </Card>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {items.map(g => (
          <Card key={g.id} className="rounded-2xl overflow-hidden relative group">
            <img src={g.image_url} alt={g.title} className="w-full h-32 object-cover"/>
            <div className="p-2 text-xs">
              <div className="font-semibold truncate">{g.title}</div>
              <div className="text-muted-foreground">{g.category}</div>
            </div>
            <Button size="icon" variant="destructive" className="absolute top-1 right-1 h-7 w-7 opacity-90" onClick={()=>del(g.id)} data-testid={`del-gal-${g.id}`}><Trash2 className="h-3 w-3"/></Button>
          </Card>
        ))}
      </div>
    </div>
  );
}

function VideosTab() {
  const [items, setItems] = useState([]);
  const [form, setForm] = useState({ title: "", youtube_id: "", description: "", category: "General" });
  const load = () => api.get("/videos").then((r) => setItems(asArray(r.data))).catch(() => setItems([]));
  useEffect(() => { load(); }, []);
  const parseId = (v) => {
    const m = v.match(/(?:v=|youtu\.be\/|embed\/)([\w-]{11})/);
    return m ? m[1] : v;
  };
  const add = async () => {
    if (!form.title || !form.youtube_id) return toast.error("शीर्षक व YouTube ID/URL आवश्यक");
    await api.post("/videos", { ...form, youtube_id: parseId(form.youtube_id) });
    setForm({ title: "", youtube_id: "", description: "", category: "General" });
    load();
  };
  const del = async (id) => { await api.delete(`/videos/${id}`); load(); };
  return (
    <div className="grid md:grid-cols-2 gap-6">
      <Card className="p-5 rounded-2xl">
        <div className="font-bold mb-3">नया वीडियो</div>
        <Input placeholder="शीर्षक" value={form.title} onChange={(e)=>setForm({...form, title: e.target.value})} data-testid="vid-title"/>
        <Input placeholder="YouTube URL या ID" className="mt-2" value={form.youtube_id} onChange={(e)=>setForm({...form, youtube_id: e.target.value})} data-testid="vid-id"/>
        <Textarea placeholder="विवरण" className="mt-2" value={form.description} onChange={(e)=>setForm({...form, description: e.target.value})}/>
        <Button className="mt-3 rounded-full" onClick={add} data-testid="add-vid"><Plus className="h-4 w-4 mr-1"/>जोड़ें</Button>
      </Card>
      <div className="grid gap-3">
        {items.map(v => (
          <Card key={v.id} className="p-3 rounded-2xl flex gap-3">
            <img src={`https://img.youtube.com/vi/${v.youtube_id}/mqdefault.jpg`} alt="" className="h-20 w-32 object-cover rounded-lg"/>
            <div className="flex-1"><div className="font-semibold">{v.title}</div><div className="text-xs text-muted-foreground">{v.youtube_id}</div></div>
            <Button size="icon" variant="ghost" onClick={()=>del(v.id)} data-testid={`del-vid-${v.id}`}><Trash2 className="h-4 w-4"/></Button>
          </Card>
        ))}
      </div>
    </div>
  );
}

function DownloadsTab() {
  const [items, setItems] = useState([]);
  const [form, setForm] = useState({ title: "", file_url: "", description: "", category: "General" });
  const load = () => api.get("/downloads").then((r) => setItems(asArray(r.data))).catch(() => setItems([]));
  useEffect(() => { load(); }, []);
  const add = async () => {
    if (!form.title || !form.file_url) return toast.error("शीर्षक व फ़ाइल आवश्यक");
    await api.post("/downloads", form);
    setForm({ title: "", file_url: "", description: "", category: "General" });
    load();
  };
  const del = async (id) => { await api.delete(`/downloads/${id}`); load(); };
  return (
    <div className="grid md:grid-cols-2 gap-6">
      <Card className="p-5 rounded-2xl">
        <div className="font-bold mb-3">नई फ़ाइल</div>
        <Input placeholder="शीर्षक" value={form.title} onChange={(e)=>setForm({...form, title: e.target.value})} data-testid="dl-title"/>
        <Input placeholder="URL या अपलोड करें" className="mt-2" value={form.file_url} onChange={(e)=>setForm({...form, file_url: e.target.value})} data-testid="dl-url"/>
        <div className="mt-2"><UploadInput testId="dl-upload" onUploaded={(d)=>setForm(f=>({...f, file_url: d.url}))}/></div>
        <Textarea placeholder="विवरण" className="mt-2" value={form.description} onChange={(e)=>setForm({...form, description: e.target.value})}/>
        <Button className="mt-3 rounded-full" onClick={add} data-testid="add-dl"><Plus className="h-4 w-4 mr-1"/>जोड़ें</Button>
      </Card>
      <div className="grid gap-3">
        {items.map(d => (
          <Card key={d.id} className="p-4 rounded-2xl flex gap-3 items-center">
            <div className="flex-1"><div className="font-semibold">{d.title}</div><div className="text-xs text-muted-foreground truncate">{d.file_url}</div></div>
            <Button size="icon" variant="ghost" onClick={()=>del(d.id)} data-testid={`del-dl-${d.id}`}><Trash2 className="h-4 w-4"/></Button>
          </Card>
        ))}
      </div>
    </div>
  );
}

function ContentTab() {
  const [hero, setHero] = useState({ title: "", subtitle: "", description: "" });
  const [about, setAbout] = useState({ heading: "", body: "", mission: "", vision: "" });
  const [principal, setPrincipal] = useState({ name: "", message: "", photo_url: "" });

  useEffect(() => {
    api.get("/site-content/hero").then(r => r.data.value && setHero(r.data.value));
    api.get("/site-content/about").then(r => r.data.value && setAbout(r.data.value));
    api.get("/site-content/principal").then(r => r.data.value && setPrincipal(r.data.value));
  }, []);

  const save = async (key, value) => {
    await api.put("/site-content", { key, value });
    toast.success("सहेजा गया");
  };

  return (
    <div className="grid lg:grid-cols-3 gap-6">
      <Card className="p-5 rounded-2xl">
        <div className="font-bold mb-3">हीरो सेक्शन</div>
        <Input placeholder="शीर्षक" value={hero.title} onChange={(e)=>setHero({...hero, title:e.target.value})}/>
        <Input placeholder="टैगलाइन" className="mt-2" value={hero.subtitle} onChange={(e)=>setHero({...hero, subtitle:e.target.value})}/>
        <Textarea placeholder="विवरण" className="mt-2" rows={5} value={hero.description} onChange={(e)=>setHero({...hero, description:e.target.value})}/>
        <Button className="mt-3 rounded-full" onClick={()=>save("hero", hero)} data-testid="save-hero">सहेजें</Button>
      </Card>
      <Card className="p-5 rounded-2xl">
        <div className="font-bold mb-3">About</div>
        <Input placeholder="शीर्षक" value={about.heading} onChange={(e)=>setAbout({...about, heading:e.target.value})}/>
        <Textarea placeholder="बॉडी" className="mt-2" rows={4} value={about.body} onChange={(e)=>setAbout({...about, body:e.target.value})}/>
        <Textarea placeholder="Mission" className="mt-2" rows={2} value={about.mission} onChange={(e)=>setAbout({...about, mission:e.target.value})}/>
        <Textarea placeholder="Vision" className="mt-2" rows={2} value={about.vision} onChange={(e)=>setAbout({...about, vision:e.target.value})}/>
        <Button className="mt-3 rounded-full" onClick={()=>save("about", about)} data-testid="save-about">सहेजें</Button>
      </Card>
      <Card className="p-5 rounded-2xl">
        <div className="font-bold mb-3">प्रधानाचार्या संदेश</div>
        <Input placeholder="नाम" value={principal.name} onChange={(e)=>setPrincipal({...principal, name:e.target.value})}/>
        <Input placeholder="फोटो URL" className="mt-2" value={principal.photo_url} onChange={(e)=>setPrincipal({...principal, photo_url:e.target.value})}/>
        <Textarea placeholder="संदेश" className="mt-2" rows={6} value={principal.message} onChange={(e)=>setPrincipal({...principal, message:e.target.value})}/>
        <Button className="mt-3 rounded-full" onClick={()=>save("principal", principal)} data-testid="save-principal">सहेजें</Button>
      </Card>
    </div>
  );
}

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
