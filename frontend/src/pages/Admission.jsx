import React from "react";
import { Card } from "../components/ui/card";
import { CheckCircle2, FileText } from "lucide-react";

export default function Admission() {
  return (
    <div className="max-w-5xl mx-auto px-4 py-12" data-testid="admission-page">
      <h1 className="text-4xl md:text-5xl font-extrabold text-primary">प्रवेश जानकारी</h1>
      <p className="mt-2 text-muted-foreground">कक्षा VI से XII तक की छात्राओं के लिए निःशुल्क प्रवेश।</p>
      <Card className="mt-8 p-6 md:p-8 rounded-3xl">
        <h2 className="text-2xl font-bold text-primary">पात्रता</h2>
        <ul className="mt-4 grid sm:grid-cols-2 gap-3">
          {[
            "ग्रामीण/वंचित वर्ग की बालिकाएँ",
            "आयु सीमा: कक्षा अनुसार",
            "आधार कार्ड आवश्यक",
            "जाति प्रमाण पत्र (यदि लागू)",
            "स्थानांतरण प्रमाण पत्र (TC)",
            "अंतिम कक्षा की अंकतालिका",
          ].map((t) => (
            <li key={t} className="flex items-start gap-2 hindi">
              <CheckCircle2 className="h-5 w-5 text-secondary shrink-0" /> {t}
            </li>
          ))}
        </ul>
        <div className="mt-8 p-5 rounded-2xl bg-secondary/10 border border-secondary/30">
          <div className="flex items-start gap-3">
            <FileText className="h-6 w-6 text-secondary shrink-0" />
            <div>
              <div className="font-bold">आवेदन प्रक्रिया</div>
              <p className="hindi text-sm mt-1">विद्यालय कार्यालय से आवेदन पत्र प्राप्त करें, आवश्यक दस्तावेजों के साथ जमा करें। चयन प्रक्रिया के बाद प्रवेश सुनिश्चित होगा।</p>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
