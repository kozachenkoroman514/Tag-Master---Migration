import AppSidebar from "@/components/AppSidebar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileBarChart } from "lucide-react";

const EmptyTable = () => (
  <div className="bg-card border border-border rounded-lg overflow-hidden">
    <table className="w-full text-sm">
      <thead className="bg-muted/40">
        <tr className="text-left text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
          <th className="px-3 py-2">When</th>
          <th className="px-3 py-2">Job #</th>
          <th className="px-3 py-2">Project</th>
          <th className="px-3 py-2">Dept</th>
          <th className="px-3 py-2">Status</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td colSpan={5} className="px-3 py-12 text-center text-muted-foreground text-sm">
            No records.
          </td>
        </tr>
      </tbody>
    </table>
  </div>
);

const ReportsPage = () => (
  <div className="min-h-screen bg-background flex">
    <AppSidebar />
    <main className="flex-1 ml-[100px] p-6 space-y-4">
      <div className="flex items-center gap-2">
        <FileBarChart className="w-5 h-5" />
        <h1 className="text-2xl font-bold tracking-tight">Reports</h1>
      </div>

      <Tabs defaultValue="completion" className="space-y-4">
        <TabsList>
          <TabsTrigger value="completion">Completion Stats</TabsTrigger>
          <TabsTrigger value="users">User Stats</TabsTrigger>
          <TabsTrigger value="changelog">Changelog</TabsTrigger>
        </TabsList>
        <TabsContent value="completion"><EmptyTable /></TabsContent>
        <TabsContent value="users"><EmptyTable /></TabsContent>
        <TabsContent value="changelog">
          <div className="bg-card border border-border rounded-lg p-12 text-center text-sm text-muted-foreground">
            No changelog entries.
          </div>
        </TabsContent>
      </Tabs>
    </main>
  </div>
);

export default ReportsPage;
