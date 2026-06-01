import { useState } from "react";
import AppSidebar from "@/components/AppSidebar";
import { IMDIcon } from "@/components/NexusMenuIcons";

type LabelSize = "2x4" | "4x6";

const LabelsPage = () => {
  const [size, setSize] = useState<LabelSize>("4x6");

  const sizes: { value: LabelSize; label: string }[] = [
    { value: "2x4", label: '2" × 4"' },
    { value: "4x6", label: '4" × 6"' },
  ];

  return (
    <div className="min-h-screen bg-background flex">
      <AppSidebar />
      <main className="flex-1 ml-[100px] p-6 space-y-6">
        <div className="flex items-center gap-2">
          <IMDIcon className="w-7 h-7" />
          <h1 className="text-2xl font-bold tracking-tight">Labels</h1>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs uppercase tracking-widest text-muted-foreground mr-2">
            Label Size
          </span>
          <div className="inline-flex rounded-lg border border-border bg-card p-1">
            {sizes.map((s) => {
              const active = size === s.value;
              return (
                <button
                  key={s.value}
                  type="button"
                  onClick={() => setSize(s.value)}
                  className={`px-4 py-1.5 text-sm font-semibold rounded-md transition-colors ${
                    active
                      ? "bg-ring text-accent"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {s.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="bg-card border border-border rounded-lg p-12 text-center text-sm text-muted-foreground">
          {size === "2x4" ? '2" × 4"' : '4" × 6"'} labels — coming soon.
        </div>
      </main>
    </div>
  );
};

export default LabelsPage;