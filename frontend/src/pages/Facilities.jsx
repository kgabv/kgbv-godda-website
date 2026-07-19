import React from "react";
import { Card } from "../components/ui/card";
import { Home, BookOpen, FlaskConical, Cpu, Users, ClipboardList, Utensils, Droplets, Wifi, ShieldCheck, User, Stethoscope, Trophy, Flower2, Beaker, Presentation } from "lucide-react";
import { motion } from "framer-motion";

const ITEMS = [
  { icon: Home, title: "आवासीय छात्रावास", desc: "सुरक्षित, स्वच्छ एवं आरामदायक छात्रावास, 24/7 वार्डन उपस्थिति।" },
  { icon: Presentation, title: "स्मार्ट क्लासरूम", desc: "प्रोजेक्टर एवं डिजिटल शिक्षण से सुसज्जित आधुनिक कक्षाएँ।" },
  { icon: BookOpen, title: "पुस्तकालय", desc: "व्यापक हिंदी/अंग्रेजी पुस्तकें, संदर्भ ग्रंथ एवं समाचार पत्र।" },
  { icon: FlaskConical, title: "विज्ञान प्रयोगशाला", desc: "भौतिकी, रसायन एवं जीवविज्ञान की पूर्ण प्रयोगशाला।" },
  { icon: Beaker, title: "प्रैक्टिकल रूम", desc: "व्यावहारिक शिक्षण हेतु समर्पित प्रैक्टिकल कक्ष।" },
  { icon: Cpu, title: "कंप्यूटर शिक्षा", desc: "आधुनिक कंप्यूटर लैब — डिजिटल साक्षरता कार्यक्रम।" },
  { icon: Users, title: "स्टाफ रूम", desc: "शिक्षकों के लिए सुसज्जित कार्यक्षेत्र।" },
  { icon: ClipboardList, title: "प्रशासनिक कार्यालय", desc: "प्रबंधन, अभिलेख एवं छात्रा सेवाएँ।" },
  { icon: Utensils, title: "भोजनालय एवं रसोई", desc: "पौष्टिक भोजन, स्वच्छ एवं मानक रसोई।" },
  { icon: Droplets, title: "स्वच्छ पेयजल", desc: "RO/फ़िल्टर के साथ शुद्ध पानी।" },
  { icon: Wifi, title: "वाई-फाई कैंपस", desc: "पूरे परिसर में सुरक्षित इंटरनेट।" },
  { icon: ShieldCheck, title: "CCTV सुरक्षा", desc: "24×7 निगरानी।" },
  { icon: User, title: "सुरक्षा गार्ड", desc: "प्रवेश एवं परिसर पर सुरक्षा।" },
  { icon: Stethoscope, title: "मेडिकल सहायता", desc: "प्राथमिक चिकित्सा एवं नियमित स्वास्थ्य जाँच।" },
  { icon: Trophy, title: "खेल का मैदान", desc: "क्रिकेट, बैडमिंटन, दौड़ आदि हेतु मैदान।" },
  { icon: Flower2, title: "बगीचा", desc: "हरित परिसर एवं प्रकृति से जुड़ाव।" },
];

export default function Facilities() {
  return (
    <div className="max-w-7xl mx-auto px-4 py-12" data-testid="facilities-page">
      <h1 className="text-4xl md:text-5xl font-extrabold text-primary">विद्यालय की सुविधाएँ</h1>
      <p className="mt-2 text-muted-foreground">छात्राओं के लिए आधुनिक, सुरक्षित एवं समग्र अवसंरचना।</p>
      <div className="mt-10 grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {ITEMS.map((it, i) => (
          <motion.div key={it.title} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: (i % 6) * 0.05 }}>
            <Card className="p-6 rounded-2xl h-full hover:shadow-xl smooth-color hover:-translate-y-1">
              <div className="h-12 w-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
                <it.icon className="h-6 w-6" />
              </div>
              <h3 className="mt-4 font-extrabold">{it.title}</h3>
              <p className="mt-2 text-sm hindi text-foreground/80">{it.desc}</p>
            </Card>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
