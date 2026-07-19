import React, { useEffect, useState } from "react";
import { api } from "../lib/api";
import { Card } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Textarea } from "../components/ui/textarea";
import { toast } from "sonner";
import { MapPin, Mail, Youtube, Phone } from "lucide-react";

export default function Contact() {
  const [form, setForm] = useState({ name: "", email: "", phone: "", subject: "", message: "" });
  const [sending, setSending] = useState(false);
  const [info, setInfo] = useState(null);
  useEffect(() => { api.get("/site-content/contact").then(r => setInfo(r.data?.value)).catch(() => {}); }, []);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.message) {
      toast.error("कृपया आवश्यक फ़ील्ड भरें");
      return;
    }
    setSending(true);
    try {
      await api.post("/contact", form);
      toast.success("आपका संदेश भेज दिया गया — शुक्रिया!");
      setForm({ name: "", email: "", phone: "", subject: "", message: "" });
    } catch {
      toast.error("त्रुटि — पुनः प्रयास करें");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-12" data-testid="contact-page">
      <h1 className="text-4xl md:text-5xl font-extrabold text-primary">संपर्क करें</h1>
      <p className="mt-2 text-muted-foreground">प्रश्नों एवं जानकारी के लिए हमसे संपर्क करें।</p>

      <div className="mt-8 grid lg:grid-cols-2 gap-8">
        <Card className="p-6 md:p-8 rounded-3xl" data-testid="contact-form-card">
          <h2 className="text-2xl font-bold text-primary">संदेश भेजें</h2>
          <form onSubmit={submit} className="mt-4 grid gap-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <Input data-testid="contact-name" placeholder="आपका नाम *" value={form.name} onChange={set("name")} />
              <Input data-testid="contact-email" placeholder="ईमेल *" value={form.email} onChange={set("email")} type="email" />
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <Input data-testid="contact-phone" placeholder="फ़ोन" value={form.phone} onChange={set("phone")} />
              <Input data-testid="contact-subject" placeholder="विषय" value={form.subject} onChange={set("subject")} />
            </div>
            <Textarea data-testid="contact-message" placeholder="आपका संदेश *" value={form.message} onChange={set("message")} rows={6} />
            <Button type="submit" disabled={sending} data-testid="contact-submit" className="rounded-full">
              {sending ? "भेजा जा रहा है..." : "संदेश भेजें"}
            </Button>
          </form>
        </Card>

        <div className="grid gap-6">
          <Card className="p-6 rounded-3xl">
            <h2 className="text-2xl font-bold text-primary">विद्यालय का पता</h2>
            <ul className="mt-4 space-y-3 text-sm">
              <li className="flex items-start gap-3"><MapPin className="h-5 w-5 mt-0.5 text-secondary"/><span>{info?.address || "कस्तूरबा गांधी बालिका विद्यालय, गोड्डा, झारखंड"}</span></li>
              <li className="flex items-center gap-3"><Mail className="h-5 w-5 text-secondary"/><a href={`mailto:${info?.email || "kgabvgodda@gmail.com"}`} className="hover:underline">{info?.email || "kgabvgodda@gmail.com"}</a></li>
              {info?.phone && <li className="flex items-center gap-3"><Phone className="h-5 w-5 text-secondary"/><a href={`tel:${info.phone}`} className="hover:underline">{info.phone}</a></li>}
              {info?.youtube && <li className="flex items-center gap-3"><Youtube className="h-5 w-5 text-secondary"/><a href={info.youtube} target="_blank" rel="noreferrer" className="hover:underline">YouTube</a></li>}
            </ul>
          </Card>
          <Card className="rounded-3xl overflow-hidden">
            <iframe
              title="school-location"
              src={`https://maps.google.com/maps?q=${info?.map_lat ?? 24.795789},${info?.map_lng ?? 87.299783}&z=15&output=embed`}
              width="100%" height="300" style={{ border: 0 }} loading="lazy" referrerPolicy="no-referrer-when-downgrade"
            />
          </Card>
        </div>
      </div>
    </div>
  );
}
