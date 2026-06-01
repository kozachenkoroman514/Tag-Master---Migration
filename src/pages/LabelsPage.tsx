import { useState } from "react";
import AppSidebar from "@/components/AppSidebar";

type LabelSize = "2x4" | "4x6";

const LabelTileIcon = ({ size }: { size: LabelSize }) => {
  const gold = "hsl(43 90% 50%)";
  const SW = 2;
  // 2x4 = portrait, 4x6 = landscape
  const isWide = size === "4x6";
  const w = isWide ? 120 : 60;
  const h = isWide ? 80 : 120;
  const pad = 12;
  // Mocked input field lines
  const lines = [
    { y: pad + 10, len: 0.7 },
    { y: pad + 22, len: 0.5 },
    { y: pad + 34, len: 0.85 },
    { y: pad + 46, len: 0.4 },
    { y: pad + 58, len: 0.6 },
  ].filter((l) => l.y < h - pad);
  return (
    <svg viewBox={`0 0 ${w + pad * 2} ${h + pad * 2}`} className="w-full h-full">
      <rect
        x={pad}
        y={pad}
        width={w}
        height={h}
        rx={3}
        fill="hsl(0 0% 100%)"
        stroke={gold}
        strokeWidth={SW}
      />
      {lines.map((l, i) => (
        <line
          key={i}
          x1={pad + 8}
          y1={l.y}
          x2={pad + 8 + (w - 16) * l.len}
          y2={l.y}
          stroke={gold}
          strokeWidth={SW}
          strokeLinecap="round"
        />
      ))}
    </svg>
  );
};

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
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <h1 className="text-2xl font-bold tracking-tight">Labels</h1>
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

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {Array.from({ length: 3 }).map((_, col) => (
            <div
              key={col}
              className="bg-card border border-border rounded-lg p-6 min-h-[420px] flex flex-col items-center justify-start gap-4"
            >
              <div className="text-xs uppercase tracking-widest text-muted-foreground">
                Column {col + 1}
              </div>
              <div className={`${size === "4x6" ? "w-48" : "w-32"}`}>
                <LabelTileIcon size={size} />
              </div>
              <div className="text-xs text-muted-foreground">
                {size === "2x4" ? '2" × 4"' : '4" × 6"'} label preview
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
};

export default LabelsPage;