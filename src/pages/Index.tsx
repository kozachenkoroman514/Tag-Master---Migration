import AppSidebar from "@/components/AppSidebar";
import Dashboard from "@/components/Dashboard";
import { useState } from "react";

const Index = () => {
  const [fullscreen, setFullscreen] = useState(false);

  return (
    <div className="min-h-screen bg-background flex">
      {!fullscreen && <AppSidebar />}
      <main className={`flex-1 ${fullscreen ? "" : "ml-[100px]"}`}>
        <Dashboard fullscreen={fullscreen} onToggleFullscreen={() => setFullscreen((f) => !f)} />
      </main>
    </div>
  );
};

export default Index;
