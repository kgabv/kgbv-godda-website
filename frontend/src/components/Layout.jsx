import React from "react";
import Header from "./Header";
import Footer from "./Footer";
import NewsTicker from "./NewsTicker";
import FloatingButtons from "./FloatingButtons";
import { Outlet, useLocation } from "react-router-dom";

export default function Layout() {
  const location = useLocation();
  const isAdmin = location.pathname.startsWith("/admin");
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      {!isAdmin && <NewsTicker />}
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
      <FloatingButtons />
    </div>
  );
}
