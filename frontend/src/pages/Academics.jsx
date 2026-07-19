import React from "react";
import { Card } from "../components/ui/card";
import { BookOpen } from "lucide-react";

const CLASSES = [
  { klass: "VI", subjects: "हिंदी, अंग्रेजी, गणित, विज्ञान, सामाजिक अध्ययन, संस्कृत" },
  { klass: "VII", subjects: "हिंदी, अंग्रेजी, गणित, विज्ञान, सामाजिक अध्ययन, संस्कृत" },
  { klass: "VIII", subjects: "हिंदी, अंग्रेजी, गणित, विज्ञान, सामाजिक अध्ययन, संस्कृत" },
  { klass: "IX", subjects: "हिंदी, अंग्रेजी, गणित, विज्ञान, सामाजिक विज्ञान" },
  { klass: "X (मैट्रिक)", subjects: "बोर्ड परीक्षा हेतु विशेष तैयारी - JAC झारखंड" },
  { klass: "XI (कला/विज्ञान)", subjects: "स्ट्रीम आधारित विषय समूह" },
  { klass: "XII (इंटरमीडिएट)", subjects: "बोर्ड परीक्षा हेतु विशेष तैयारी - JAC झारखंड" },
];

export default function Academics() {
  return (
    <div className="max-w-6xl mx-auto px-4 py-12" data-testid="academics-page">
      <h1 className="text-4xl md:text-5xl font-extrabold text-primary">शिक्षा (कक्षा VI-XII)</h1>
      <p className="mt-2 text-muted-foreground">हमारी विद्यालय झारखंड शैक्षिक बोर्ड (JAC) पाठ्यक्रम पर आधारित उच्च-गुणवत्ता की शिक्षा प्रदान करता है।</p>
      <div className="mt-8 grid md:grid-cols-2 gap-5">
        {CLASSES.map((c) => (
          <Card key={c.klass} className="p-6 rounded-2xl hover:shadow-lg smooth-color">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                <BookOpen className="h-6 w-6" />
              </div>
              <div className="font-extrabold text-lg">कक्षा {c.klass}</div>
            </div>
            <p className="mt-3 hindi text-sm text-foreground/85">{c.subjects}</p>
          </Card>
        ))}
      </div>
    </div>
  );
}
