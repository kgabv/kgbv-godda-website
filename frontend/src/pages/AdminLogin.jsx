import React from "react";
import { Card } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { LOGO_URL } from "../lib/api";
import { useSearchParams } from "react-router-dom";

// REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
export default function AdminLogin() {
  const [params] = useSearchParams();
  const error = params.get("error");

  const handleLogin = () => {
    const redirectUrl = window.location.origin + "/admin";
    window.location.href = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
  };

  return (
    <div className="max-w-md mx-auto px-4 py-20" data-testid="admin-login-page">
      <Card className="p-8 rounded-3xl text-center">
        <img src={LOGO_URL} alt="Logo" className="h-20 w-20 mx-auto rounded-full ring-2 ring-primary/30" />
        <h1 className="mt-6 text-3xl font-extrabold text-primary">एडमिन लॉगिन</h1>
        <p className="mt-2 text-sm text-muted-foreground">Google खाते के माध्यम से सुरक्षित लॉगिन करें।</p>
        {error && <div className="mt-4 p-3 rounded-lg bg-red-500/10 text-red-600 text-sm">लॉगिन असफल — पुनः प्रयास करें।</div>}
        <Button onClick={handleLogin} data-testid="admin-google-login" className="mt-8 w-full rounded-full h-12 text-base font-semibold">
          Google से लॉगिन करें
        </Button>
        <p className="mt-6 text-xs text-muted-foreground">सिर्फ अधिकृत उपयोगकर्ता ही एडमिन पैनल एक्सेस कर सकते हैं।</p>
      </Card>
    </div>
  );
}
