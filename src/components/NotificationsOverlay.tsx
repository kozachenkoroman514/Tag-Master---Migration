import { Bell, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface Props {
  open: boolean;
  onClose: () => void;
}

const NotificationsOverlay = ({ open, onClose }: Props) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex" onClick={onClose}>
      <div className="absolute inset-0 bg-background/60 backdrop-blur-sm" />
      <aside
        className="relative ml-[100px] w-[420px] h-full bg-card border-r border-border shadow-2xl flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-center justify-between px-4 py-3 border-b border-border">
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5" />
            <h2 className="font-bold uppercase tracking-wide text-sm">Notifications</h2>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </header>
        <Tabs defaultValue="alerts" className="flex-1 flex flex-col">
          <TabsList className="m-3">
            <TabsTrigger value="alerts">Alerts</TabsTrigger>
            <TabsTrigger value="errors">Error Log</TabsTrigger>
          </TabsList>
          <TabsContent value="alerts" className="flex-1 px-4 py-8 text-center text-sm text-muted-foreground">
            No alerts.
          </TabsContent>
          <TabsContent value="errors" className="flex-1 px-4 py-8 text-center text-sm text-muted-foreground">
            No errors logged.
          </TabsContent>
        </Tabs>
      </aside>
    </div>
  );
};

export default NotificationsOverlay;
