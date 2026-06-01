import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useEffect } from "react";
import LabelsPage from "./pages/LabelsPage.tsx";
import SettingsPage from "./pages/SettingsPage.tsx";
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
        <Route path="/" element={<LabelsPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/bug-report" element={<BugReportPage />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  </TooltipProvider>
);

export default App;
