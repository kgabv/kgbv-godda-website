import React from "react";
import { Card } from "../components/ui/card";

export function Privacy() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-12" data-testid="privacy-page">
      <h1 className="text-4xl font-extrabold text-primary">गोपनीयता नीति</h1>
      <Card className="mt-6 p-6 rounded-2xl">
        <p className="hindi">KGBV Godda आपकी व्यक्तिगत जानकारी की गोपनीयता का सम्मान करता है। हम केवल आवश्यक जानकारी संग्रह करते हैं और उसका उपयोग विद्यालय की सेवाओं के लिए करते हैं। किसी भी तृतीय पक्ष के साथ जानकारी साझा नहीं की जाती।</p>
      </Card>
    </div>
  );
}

export function Terms() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-12" data-testid="terms-page">
      <h1 className="text-4xl font-extrabold text-primary">नियम एवं शर्तें</h1>
      <Card className="mt-6 p-6 rounded-2xl">
        <p className="hindi">इस वेबसाइट का उपयोग विद्यालय संबंधी जानकारी हेतु किया जा सकता है। सामग्री का अनधिकृत उपयोग वर्जित है।</p>
      </Card>
    </div>
  );
}
