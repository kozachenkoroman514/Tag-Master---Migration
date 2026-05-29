import { useState } from "react";
import AppSidebar from "@/components/AppSidebar";
import { Bug, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useBugReportsStore, type BugUrgency } from "@/store/bugReportsStore";
import { toast } from "sonner";

const LOCATIONS = ["Dashboard", "Settings", "Reports", "Bug Report", "Other"];

const BugReportPage = () => {
  const reports = useBugReportsStore((s) => s.reports);
  const add = useBugReportsStore((s) => s.add);
  const remove = useBugReportsStore((s) => s.remove);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [urgency, setUrgency] = useState<BugUrgency>("medium");
  const [location, setLocation] = useState("Dashboard");

  const submit = () => {
    if (!title.trim()) {
      toast.error("Title is required");
      return;
    }
    add({ title: title.trim(), description: description.trim(), urgency, location });
    setTitle("");
    setDescription("");
    setUrgency("medium");
    setLocation("Dashboard");
    toast.success("Bug report submitted");
  };

  return (
    <div className="min-h-screen bg-background flex">
      <AppSidebar />
      <main className="flex-1 ml-[100px] p-6 space-y-6">
        <div className="flex items-center gap-2">
          <Bug className="w-5 h-5" />
          <h1 className="text-2xl font-bold tracking-tight">Bug Report</h1>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          <section className="bg-card border border-border rounded-lg p-5 space-y-4">
            <h2 className="font-semibold">Submit a bug</h2>
            <div className="space-y-1">
              <Label className="text-xs uppercase tracking-wide">Title</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Short summary" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs uppercase tracking-wide">Urgency</Label>
                <Select value={urgency} onValueChange={(v) => setUrgency(v as BugUrgency)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs uppercase tracking-wide">Location</Label>
                <Select value={location} onValueChange={setLocation}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {LOCATIONS.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs uppercase tracking-wide">Description</Label>
              <Textarea
                rows={5}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Steps to reproduce, expected vs actual…"
              />
            </div>
            <Button onClick={submit} className="w-full">Submit</Button>
          </section>

          <section className="bg-card border border-border rounded-lg p-5 space-y-3">
            <h2 className="font-semibold">Active Errors</h2>
            {reports.length === 0 && (
              <div className="text-sm text-muted-foreground text-center py-10">
                No bug reports yet.
              </div>
            )}
            {reports.map((r) => (
              <div key={r.id} className="border border-border rounded p-3 space-y-1.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="font-semibold text-sm">{r.title}</div>
                  <Button variant="ghost" size="icon" onClick={() => remove(r.id)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <Badge variant="outline" className="text-[10px] uppercase">{r.urgency}</Badge>
                  <Badge variant="outline" className="text-[10px]">{r.location}</Badge>
                  <Badge variant="outline" className="text-[10px] uppercase">{r.status}</Badge>
                </div>
                {r.description && <p className="text-xs text-muted-foreground">{r.description}</p>}
              </div>
            ))}
          </section>
        </div>
      </main>
    </div>
  );
};

export default BugReportPage;
