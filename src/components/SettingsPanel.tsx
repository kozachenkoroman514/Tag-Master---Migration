import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Settings as SettingsIcon } from "lucide-react";

const PlaceholderPanel = ({ title }: { title: string }) => (
  <div className="bg-card border border-border rounded-lg p-8 text-center">
    <h3 className="text-base font-semibold mb-1">{title}</h3>
    <p className="text-sm text-muted-foreground">UI shell — settings will go here.</p>
  </div>
);

const SettingsPanel = () => (
  <div className="p-6 space-y-4">
    <div className="flex items-center gap-2">
      <SettingsIcon className="w-5 h-5" />
      <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
    </div>

    <Tabs defaultValue="defaults" className="space-y-4">
      <TabsList>
        <TabsTrigger value="defaults">Defaults</TabsTrigger>
        <TabsTrigger value="notifications">Notifications</TabsTrigger>
        <TabsTrigger value="users">Users</TabsTrigger>
        <TabsTrigger value="about">About</TabsTrigger>
      </TabsList>
      <TabsContent value="defaults"><PlaceholderPanel title="Defaults" /></TabsContent>
      <TabsContent value="notifications"><PlaceholderPanel title="Notifications" /></TabsContent>
      <TabsContent value="users"><PlaceholderPanel title="Users" /></TabsContent>
      <TabsContent value="about"><PlaceholderPanel title="About" /></TabsContent>
    </Tabs>
  </div>
);

export default SettingsPanel;
