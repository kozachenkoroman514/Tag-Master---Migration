import AppSidebar from "@/components/AppSidebar";
import SettingsPanel from "@/components/SettingsPanel";

const SettingsPage = () => (
  <div className="min-h-screen bg-background flex">
    <AppSidebar />
    <main className="flex-1 ml-[100px]">
      <SettingsPanel />
    </main>
  </div>
);

export default SettingsPage;
