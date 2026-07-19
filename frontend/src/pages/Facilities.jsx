import React, { useEffect, useState } from "react";
import { Card } from "../components/ui/card";
import * as Icons from "lucide-react";
import { motion } from "framer-motion";
import { api, asArray } from "../lib/api";

const DEFAULTS = [
  { icon: "Home", title: "आवासीय छात्रावास", description: "सुरक्षित, स्वच्छ एवं आरामदायक छात्रावास, 24/7 वार्डन उपस्थिति।" },
  { icon: "Presentation", title: "स्मार्ट क्लासरूम", description: "प्रोजेक्टर एवं डिजिटल शिक्षण से सुसज्जित आधुनिक कक्षाएँ।" },
  { icon: "BookOpen", title: "पुस्तकालय", description: "व्यापक हिंदी/अंग्रेजी पुस्तकें, संदर्भ ग्रंथ एवं समाचार पत्र।" },
  { icon: "FlaskConical", title: "विज्ञान प्रयोगशाला", description: "भौतिकी, रसायन एवं जीवविज्ञान की पूर्ण प्रयोगशाला।" },
  { icon: "Beaker", title: "प्रैक्टिकल रूम", description: "व्यावहारिक शिक्षण हेतु समर्पित प्रैक्टिकल कक्ष।" },
  { icon: "Cpu", title: "कंप्यूटर शिक्षा", description: "आधुनिक कंप्यूटर लैब — डिजिटल साक्षरता कार्यक्रम।" },
  { icon: "Users", title: "स्टाफ रूम", description: "शिक्षकों के लिए सुसज्जित कार्यक्षेत्र।" },
  { icon: "ClipboardList", title: "प्रशासनिक कार्यालय", description: "प्रबंधन, अभिलेख एवं छात्रा सेवाएँ।" },
  { icon: "Utensils", title: "भोजनालय एवं रसोई", description: "पौष्टिक भोजन, स्वच्छ एवं मानक रसोई।" },
  { icon: "Droplets", title: "स्वच्छ पेयजल", description: "RO/फ़िल्टर के साथ शुद्ध पानी।" },
  { icon: "Wifi", title: "वाई-फाई कैंपस", description: "पूरे परिसर में सुरक्षित इंटरनेट।" },
  { icon: "ShieldCheck", title: "CCTV सुरक्षा", description: "24×7 निगरानी।" },
  { icon: "User", title: "सुरक्षा गार्ड", description: "प्रवेश एवं परिसर पर सुरक्षा।" },
  { icon: "Stethoscope", title: "मेडिकल सहायता", description: "प्राथमिक चिकित्सा एवं नियमित स्वास्थ्य जाँच।" },
  { icon: "Trophy", title: "खेल का मैदान", description: "क्रिकेट, बैडमिंटन, दौड़ आदि हेतु मैदान।" },
  { icon: "Flower2", title: "बगीचा", description: "हरित परिसर एवं प्रकृति से जुड़ाव।" },
];

export default function Facilities() {
  const [items, setItems] = useState([]);
  useEffect(() => {
    api.get("/facilities").then(r => setItems(asArray(r.data))).catch(() => setItems([]));
  }, []);
  const list = items.length ? items : DEFAULTS;
  return (
    <div className="max-w-7xl mx-auto px-4 py-12" data-testid="facilities-page">
      <h1 className="text-4xl md:text-5xl font-extrabold text-primary">विद्यालय की सुविधाएँ</h1>
      <p className="mt-2 text-muted-foreground">छात्राओं के लिए आधुनिक, सुरक्षित एवं समग्र अवसंरचना।</p>
      <div className="mt-10 grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {list.map((it, i) => {
          const IconComp = Icons[it.icon] || Icons.Sparkles;
          return (
            <motion.div key={it.title + i} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: (i % 6) * 0.05 }}>
              <Card className="p-6 rounded-2xl h-full hover:shadow-xl smooth-color hover:-translate-y-1">
                <div className="h-12 w-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
                  <IconComp className="h-6 w-6" />
                </div>
                <h3 className="mt-4 font-extrabold">{it.title}</h3>
                <p className="mt-2 text-sm hindi text-foreground/80">{it.description}</p>
              </Card>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
