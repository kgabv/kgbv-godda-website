import React from "react";
import { Card } from "../components/ui/card";
import { Bike, Music, Sunrise, TreePine, HeartHandshake, Palette, Trophy, Rocket, HelpCircle, Flag } from "lucide-react";
import { motion } from "framer-motion";

const ITEMS = [
  { icon: Rocket, title: "शैक्षिक भ्रमण", desc: "ज्ञान वर्धक स्थानों की यात्रा।" },
  { icon: Trophy, title: "खेलकूद", desc: "अंतर-सदन एवं जिला स्तरीय प्रतियोगिताएँ।" },
  { icon: HeartHandshake, title: "योग", desc: "प्रतिदिन योग एवं ध्यान अभ्यास।" },
  { icon: Music, title: "सांस्कृतिक कार्यक्रम", desc: "नृत्य, संगीत एवं नाटक।" },
  { icon: Flag, title: "राष्ट्रीय पर्व", desc: "स्वतंत्रता दिवस, गणतंत्र दिवस उत्सव।" },
  { icon: Rocket, title: "विज्ञान प्रदर्शनी", desc: "छात्राओं के मॉडल एवं प्रयोग।" },
  { icon: TreePine, title: "पौधारोपण अभियान", desc: "पर्यावरण के प्रति जागरूकता।" },
  { icon: HelpCircle, title: "क्विज़ प्रतियोगिता", desc: "सामान्य ज्ञान एवं विषयगत क्विज़।" },
  { icon: Palette, title: "चित्रकला एवं पेंटिंग", desc: "रचनात्मक अभिव्यक्ति।" },
  { icon: Sunrise, title: "प्रातःकालीन सभा", desc: "प्रेरणादायी विचार एवं समाचार।" },
];

export default function Activities() {
  return (
    <div className="max-w-7xl mx-auto px-4 py-12" data-testid="activities-page">
      <h1 className="text-4xl md:text-5xl font-extrabold text-primary">गतिविधियाँ</h1>
      <p className="mt-2 text-muted-foreground">शिक्षण के साथ-साथ सांस्कृतिक, खेल एवं वैज्ञानिक विकास।</p>
      <div className="mt-10 grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {ITEMS.map((it, i) => (
          <motion.div key={it.title} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: (i % 6) * 0.05 }}>
            <Card className="p-6 rounded-2xl h-full hover:shadow-xl smooth-color hover:-translate-y-1 border-l-4 border-l-secondary">
              <div className="h-12 w-12 rounded-2xl bg-secondary/15 text-secondary flex items-center justify-center">
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
