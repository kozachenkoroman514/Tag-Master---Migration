import AppSidebar from "@/components/AppSidebar";

const IMDPage = () => (
  <div className="min-h-screen bg-background flex">
    <AppSidebar />
    <main className="flex-1 ml-[100px]">
      <div className="p-6 space-y-2">
        <h1 className="text-2xl font-bold tracking-tight">IMD</h1>
        <p className="text-sm text-muted-foreground">Interactive Materials Dashboard- COMING SOON</p>
      </div>
    </main>
  </div>
);

export default IMDPage;
