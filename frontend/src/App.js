import React from "react";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { Toaster } from "sonner";
import { ThemeProvider } from "./lib/ThemeContext";
import { AuthProvider } from "./lib/AuthContext";
import Layout from "./components/Layout";
import AuthCallback from "./components/AuthCallback";
import Home from "./pages/Home";
import About from "./pages/About";
import Principal from "./pages/Principal";
import Academics from "./pages/Academics";
import Admission from "./pages/Admission";
import Facilities from "./pages/Facilities";
import Activities from "./pages/Activities";
import Gallery from "./pages/Gallery";
import VideoGallery from "./pages/VideoGallery";
import News from "./pages/News";
import Downloads from "./pages/Downloads";
import Contact from "./pages/Contact";
import AdminLogin from "./pages/AdminLogin";
import AdminDashboard from "./pages/AdminDashboard";
import { Privacy, Terms } from "./pages/Legal";
import "./App.css";

function AppRouter() {
  const location = useLocation();
  // Handle OAuth callback fragment synchronously
  if (location.hash?.includes("session_id=")) {
    return <AuthCallback />;
  }
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Home />} />
        <Route path="/about" element={<About />} />
        <Route path="/principal" element={<Principal />} />
        <Route path="/academics" element={<Academics />} />
        <Route path="/admission" element={<Admission />} />
        <Route path="/facilities" element={<Facilities />} />
        <Route path="/activities" element={<Activities />} />
        <Route path="/gallery" element={<Gallery />} />
        <Route path="/videos" element={<VideoGallery />} />
        <Route path="/news" element={<News />} />
        <Route path="/downloads" element={<Downloads />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/privacy" element={<Privacy />} />
        <Route path="/terms" element={<Terms />} />
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/admin" element={<AdminDashboard />} />
      </Route>
    </Routes>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <AppRouter />
          <Toaster richColors position="top-right" />
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}
