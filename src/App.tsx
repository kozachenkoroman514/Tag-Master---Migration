import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useEffect } from "react";
import Index from "./pages/Index.tsx";
import IMDPage from "./pages/IMDPage.tsx";
import KioskPage from "./pages/KioskPage.tsx";
import SettingsPage from "./pages/SettingsPage.tsx";
import ReportsPage from "./pages/ReportsPage.tsx";
import BugReportPage from "./pages/BugReportPage.tsx";
import NotFound from "./pages/NotFound.tsx";

const ThemeBoot = () => {
  useEffect(() => {
    const saved = localStorage.getItem("theme");
    if (saved === "dark") document.documentElement.classList.add("dark");
  }, []);
  return null;
};

const App = () => (
  <TooltipProvider>
    <Toaster />
    <Sonner />
    <BrowserRouter>
      <ThemeBoot />
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/imd" element={<IMDPage />} />
        <Route path="/kiosk" element={<KioskPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/reports" element={<ReportsPage />} />
        <Route path="/bug-report" element={<BugReportPage />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  </TooltipProvider>
);

export default App;
