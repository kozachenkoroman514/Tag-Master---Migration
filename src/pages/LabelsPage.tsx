import { useEffect, useState } from "react";
import AppSidebar from "@/components/AppSidebar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Plus, X, CalendarIcon } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format, parse, isValid } from "date-fns";
import { cn } from "@/lib/utils";
import QRCode from "qrcode";

const cls = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(" ");
const invalidCls = "ring-2 ring-destructive border-destructive focus-visible:ring-destructive";
const Req = () => <span className="text-destructive">*</span>;

// --- Label HTML doc builders (shared by print window + live preview iframe) ---
function buildGenericDoc(title: string, bodyHtml: string, size: LabelSize): string {
  const pageSize = size === "2x4" ? "2in 4in" : "6in 4in";
  const labelW = size === "2x4" ? "2in" : "6in";
  const labelH = size === "2x4" ? "4in" : "4in";
  const pad = size === "2x4" ? "0.12in" : "0.25in";
  return `<!doctype html><html><head><title>${escapeHtml(title)}</title>
<style>
  @page { size: ${pageSize}; margin: 0; }
  html, body { margin: 0; padding: 0; }
  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: #000; background: #fff; }
  .label { width: ${labelW}; height: ${labelH}; padding: ${pad}; box-sizing: border-box; display: flex; flex-direction: column; }
  .row { display: flex; justify-content: space-between; align-items: flex-start; gap: 0.2in; }
  .title { font-size: ${size === "2x4" ? "16pt" : "28pt"}; font-weight: 800; letter-spacing: 1px; text-transform: uppercase; }
  .field { font-size: ${size === "2x4" ? "9pt" : "14pt"}; margin: 3pt 0; }
  .field b { font-weight: 700; }
  .big { font-size: ${size === "2x4" ? "13pt" : "22pt"}; font-weight: 700; }
  .huge { font-size: ${size === "2x4" ? "22pt" : "36pt"}; font-weight: 800; line-height: 1.1; }
  .qrs { display: flex; gap: 0.2in; align-items: flex-end; }
  .qr { text-align: center; font-size: 8pt; }
  .qr img { display: block; width: ${size === "2x4" ? "0.75in" : "1.3in"}; height: ${size === "2x4" ? "0.75in" : "1.3in"}; }
  .grow { flex: 1; }
  .center { text-align: center; }
  .wrap { word-break: break-word; white-space: pre-wrap; }
</style></head><body><div class="label">${bodyHtml}</div></body></html>`;
}

async function printLabel(title: string, bodyHtml: string, size: LabelSize = "4x6") {
  const win = window.open("", "_blank", "width=800,height=600");
  if (!win) return;
  const doc = buildGenericDoc(title, bodyHtml, size).replace(
    "</body></html>",
    `<script>window.onload = () => { setTimeout(() => { window.print(); }, 150); };<\/script></body></html>`,
  );
  win.document.write(doc);
  win.document.close();
}

async function qrDataUrl(text: string) {
  if (!text) return "";
  try {
    return await QRCode.toDataURL(text, { margin: 0, width: 256 });
  } catch {
    return "";
  }
}

// In-memory cache so the live preview doesn't regenerate the same QR repeatedly.
const qrPreviewCache = new Map<string, string>();
async function cachedQr(text: string): Promise<string> {
  if (!text) return "";
  const hit = qrPreviewCache.get(text);
  if (hit !== undefined) return hit;
  const url = await qrDataUrl(text);
  qrPreviewCache.set(text, url);
  return url;
}

// Scaled iframe preview of a label HTML document. Sized to actual inches at 96dpi
// then CSS-transformed to fit the side panel.
const LabelPreview = ({ html, size }: { html: string; size: LabelSize }) => {
  const isWide = size === "4x6";
  const nativeW = isWide ? 576 : 192; // 6in / 2in @ 96dpi
  const nativeH = isWide ? 384 : 384; // 4in @ 96dpi
  const targetW = 320;
  const scale = targetW / nativeW;
  return (
    <div
      className="rounded-md border border-border bg-white overflow-hidden shadow-sm"
      style={{ width: nativeW * scale, height: nativeH * scale }}
    >
      <iframe
        title="Label preview"
        srcDoc={html}
        sandbox="allow-same-origin"
        style={{
          width: nativeW,
          height: nativeH,
          border: 0,
          transform: `scale(${scale})`,
          transformOrigin: "top left",
          display: "block",
          background: "#fff",
        }}
      />
    </div>
  );
};

const PreviewPane = ({ html, size }: { html: string; size: LabelSize }) => (
  <div className="border-l border-border pl-4 flex flex-col items-start gap-2 overflow-y-auto">
    <div className="text-xs uppercase tracking-wide text-muted-foreground font-semibold">
      Live preview
    </div>
    <LabelPreview html={html} size={size} />
    <div className="text-[10px] text-muted-foreground">
      {size === "4x6" ? '4" × 6" (scaled)' : '2" × 4" (scaled)'}
    </div>
  </div>
);

// --- Per-label tile icons ---
const tileGold = "hsl(43 90% 50%)";

// Wraps a gold glyph inside a white landscape "label" card (4x6 landscape => 3:2)
const LabelFrame = ({ children }: { children: React.ReactNode }) => (
  <svg viewBox="0 0 120 80" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
    <rect
      x="3"
      y="3"
      width="114"
      height="74"
      rx="5"
      fill="hsl(0 0% 100%)"
      stroke={tileGold}
      strokeWidth={2}
    />
    <g transform="translate(28 8)">{children}</g>
  </svg>
);
const PartIcon = () => (
  <LabelFrame>
    <svg viewBox="0 0 64 64" width="64" height="64" fill="none" stroke={tileGold} strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round">
      <path d="M10 22 L32 10 L54 22 L54 46 L32 58 L10 46 Z" />
      <path d="M10 22 L32 34 L54 22" />
      <path d="M32 34 L32 58" />
    </svg>
  </LabelFrame>
);
const PackUnitIcon = () => (
  <LabelFrame>
    <svg viewBox="0 0 64 64" width="64" height="64" fill="none" stroke={tileGold} strokeWidth={2.5} strokeLinejoin="round">
      <rect x="8" y="32" width="22" height="22" />
      <rect x="34" y="32" width="22" height="22" />
      <rect x="21" y="10" width="22" height="22" />
    </svg>
  </LabelFrame>
);
const StatusNoteIcon = () => (
  <LabelFrame>
    <svg viewBox="0 0 64 64" width="64" height="64" fill="none" stroke={tileGold} strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round">
      <rect x="14" y="12" width="36" height="44" rx="2" />
      <path d="M24 10 H40 V18 H24 Z" fill={tileGold} />
      <path d="M32 28 V40" />
      <circle cx="32" cy="46" r="1.5" fill={tileGold} />
    </svg>
  </LabelFrame>
);
const MiscIcon = () => (
  <LabelFrame>
    <svg viewBox="0 0 64 64" width="64" height="64" fill="none" stroke={tileGold} strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round">
      <path d="M12 44 L40 16 L52 28 L24 56 L10 56 L10 42 Z" />
      <path d="M36 20 L48 32" />
    </svg>
  </LabelFrame>
);

type LabelSize = "2x4" | "4x6";
type LabelKind = "part" | "pack-unit" | "status-note" | "misc";

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
  const [openKind, setOpenKind] = useState<LabelKind | null>(null);

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
          {(
            [
              { kind: "part", label: "Part", Icon: PartIcon },
              { kind: "pack-unit", label: "Pack Unit", Icon: PackUnitIcon },
              { kind: "status-note", label: "Status Note", Icon: StatusNoteIcon },
              { kind: "misc", label: "Misc", Icon: MiscIcon },
            ] as { kind: LabelKind; label: string; Icon: React.FC }[]
          ).map((tile) => (
            <button
              key={tile.kind}
              type="button"
              onClick={() => setOpenKind(tile.kind)}
              className="group bg-card border border-border rounded-lg p-6 min-h-[260px] flex flex-col items-center justify-start gap-4 transition-all hover:border-ring hover:ring-2 hover:ring-ring hover:shadow-[0_0_0_4px_hsl(43_90%_50%/0.15)]"
            >
              <div className="text-2xl font-extrabold uppercase tracking-widest text-ring group-hover:text-ring">
                {tile.label}
              </div>
              <div className={size === "2x4" ? "w-20 h-32" : "w-32 h-32"}>
                <tile.Icon />
              </div>
              <div className="text-xs text-muted-foreground">
                {size === "2x4" ? '2" × 4" label' : '4" × 6" label'}
              </div>
            </button>
          ))}
          <div className="bg-card border border-dashed border-border rounded-lg p-6 min-h-[260px] flex flex-col items-center justify-center gap-3 text-center">
            <Plus className="h-10 w-10 text-muted-foreground" />
            <div className="text-base font-semibold text-muted-foreground uppercase tracking-wide">
              More labels to come!
            </div>
          </div>
        </div>

        <PartLabelDialog size={size} open={openKind === "part"} onOpenChange={(o) => !o && setOpenKind(null)} />
        <PackUnitLabelDialog size={size} open={openKind === "pack-unit"} onOpenChange={(o) => !o && setOpenKind(null)} />
        <StatusNoteLabelDialog size={size} open={openKind === "status-note"} onOpenChange={(o) => !o && setOpenKind(null)} />
        <MiscLabelDialog size={size} open={openKind === "misc"} onOpenChange={(o) => !o && setOpenKind(null)} />
      </main>
    </div>
  );
};

export default LabelsPage;

// ----------------- Part Label -----------------
type PartEntry = { partNumber: string; qty: string; jobNumber: string; soNumber: string; goesWith: string; description: string; rev: string };
const emptyPart = (): PartEntry => ({ partNumber: "", qty: "", jobNumber: "", soNumber: "", goesWith: "", description: "", rev: "" });

// 4x6 Part label — pure HTML doc builder shared by print + live preview.
// Any field left blank (and its static label) is omitted from the output.
function buildPart4x6Doc(parts: PartEntry[], qrs: Array<{ part: string; job: string }>): string {
  const rows = parts.map((p, i) => {
      const partQr = qrs[i]?.part || "";
      const jobQr = qrs[i]?.job || "";

      const jobBlock = p.jobNumber.trim()
        ? `<div class="jqr-pair jqr-col">
             <span class="sec-title">Job</span>
             <div class="jqr-row">
               <span class="red-input job-num">${escapeHtml(p.jobNumber)}</span>
               ${jobQr ? `<div class="qr-mini"><img src="${jobQr}" alt="Job QR"/></div>` : ""}
             </div>
           </div>`
        : `<div class="jqr-pair"></div>`;

      const qtyItem = p.qty.trim()
        ? `<div class="qty-rev-item"><span class="sec-title">QTY</span><span class="red-input qty-num">${escapeHtml(p.qty)}</span></div>`
        : "";
      const revItem = p.rev.trim()
        ? `<div class="qty-rev-item"><span class="sec-title">Rev</span><span class="red-input rev-val">${escapeHtml(p.rev)}</span></div>`
        : "";
      const qtyRevGroup = (qtyItem || revItem)
        ? `<div class="qty-rev-group">${qtyItem}${revItem}</div>`
        : "";

      const jobLine = (p.jobNumber.trim() || qtyItem || revItem)
        ? `<div class="job-line"><div class="job-inputs-row">${jobBlock}${qtyRevGroup}</div></div>`
        : "";

      const partLine = p.partNumber.trim()
        ? `<div class="part-line">
             <span class="sec-title">Part</span>
             <div class="part-inputs-row">
               <span class="part-number-input">${escapeHtml(p.partNumber)}</span>
               ${partQr ? `<div class="qr-part"><img src="${partQr}" alt="Part QR"/></div>` : ""}
             </div>
           </div>`
        : "";

      const descLine = p.description.trim()
        ? `<div class="desc-line">
             <span class="sec-title-inline">Description</span>
             <div class="desc-inputs-row">
               <span class="desc-input">${escapeHtml(p.description)}</span>
             </div>
           </div>`
        : "";

      const inner = `${jobLine}${partLine}${descLine}`;
      if (!inner) return "";
      return `<div class="part-row">${inner}</div>`;
    });

  const partRows = rows.filter(Boolean).join("");

  return `<!doctype html><html><head><title>Part Label</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  @page { size: 6in 4in landscape; margin: 0; }
  html, body { margin: 0; padding: 0; background: #fff; font-family: Arial, sans-serif; color: #000; }
  .label { width: 6in; height: 4in; border: 1.5pt solid #000; display: flex; flex-direction: column; overflow: hidden; }
  .label-header { border-bottom: 1.5pt solid #000; padding: 2px 14px; }
  .logo-text { font-size: 28px; font-weight: 900; font-family: "Arial Black", Arial, sans-serif; letter-spacing: 1.5px; text-transform: uppercase; line-height: 1; }
  .logo-reg { font-size: 15px; vertical-align: super; }
  .parts-area { flex: 1; display: flex; flex-direction: column; }
  .part-row { flex: 1; display: flex; flex-direction: column; border-bottom: 1.5pt solid #000; }
  .part-row:last-of-type { border-bottom: none; }
  .sec-title { font-size: 11px; font-weight: 700; color: #555; text-transform: uppercase; letter-spacing: 1px; line-height: 1; display: block; white-space: nowrap; }
  .sec-title-inline { font-size: 11px; font-weight: 700; color: #555; text-transform: uppercase; letter-spacing: 1px; line-height: 1; white-space: nowrap; flex-shrink: 0; }
  .job-line { display: flex; flex-direction: column; padding: 2px 12px 1px 12px; border-bottom: 1px solid #ccc; }
  .job-inputs-row { display: flex; align-items: flex-end; width: 100%; }
  .jqr-pair { display: flex; align-items: center; gap: 8px; flex: 1; }
  .jqr-col { flex-direction: column; align-items: flex-start; gap: 1px; }
  .jqr-row { display: flex; align-items: center; gap: 8px; }
  .red-input { border: none; border-bottom: 1.5pt solid #000; font-size: 22px; font-weight: 700; padding: 0 4px; min-height: 24px; display: inline-block; }
  .red-input.job-num { min-width: 108px; }
  .red-input.qty-num { min-width: 56px; text-align: center; }
  .red-input.rev-val { min-width: 46px; text-align: center; }
  .qty-rev-group { display: flex; align-items: flex-end; gap: 16px; margin-left: auto; }
  .qty-rev-item { display: flex; flex-direction: column; align-items: flex-start; gap: 1px; }
  .qr-mini { width: 54px; height: 54px; flex-shrink: 0; }
  .qr-mini img { width: 100%; height: 100%; }
  .part-line { display: flex; flex-direction: column; padding: 1px 12px 1px 12px; gap: 1px; border-bottom: 1px solid #ccc; }
  .part-inputs-row { display: flex; align-items: center; gap: 10px; width: 100%; }
  .part-number-input { flex: 1; border: none; border-bottom: 1.5pt solid #000; font-size: 22px; font-weight: 700; padding: 0 4px; min-height: 24px; display: inline-block; }
  .qr-part { width: 64px; height: 64px; flex-shrink: 0; }
  .qr-part img { width: 100%; height: 100%; }
  .desc-line { display: flex; flex-direction: row; align-items: baseline; padding: 1px 12px 3px 12px; gap: 8px; }
  .desc-inputs-row { display: flex; align-items: center; gap: 6px; flex: 1; }
  .desc-input { flex: 1; border: none; border-bottom: 1pt solid #555; font-size: 14px; font-weight: 600; padding: 0 4px; min-height: 16px; display: inline-block; }
  .footer-bar { border-top: 1.5pt solid #000; padding: 2px 14px 3px 14px; display: flex; flex-direction: column; gap: 1px; }
  .footer-input { font-size: 32px; font-weight: 900; font-family: "Arial Black", Arial, sans-serif; display: block; width: 100%; border-bottom: 1.5pt solid #000; }
</style></head><body>
<div class="label">
  <div class="label-header"><span class="logo-text">Electric Mirror<span class="logo-reg">&reg;</span></span></div>
  <div class="parts-area">${partRows}</div>
</div>
</body></html>`;
}

async function computePartQrs(parts: PartEntry[]): Promise<Array<{ part: string; job: string }>> {
  return Promise.all(
    parts.map(async (p) => ({
      part: p.partNumber.trim() ? await cachedQr(p.partNumber.trim()) : "",
      job: p.jobNumber.trim() ? await cachedQr(p.jobNumber.trim()) : "",
    })),
  );
}

async function printPart4x6(parts: PartEntry[]) {
  const qrs = await computePartQrs(parts);
  const doc = buildPart4x6Doc(parts, qrs).replace(
    "</body></html>",
    `<script>window.onload = () => { setTimeout(() => { window.print(); }, 200); };<\/script></body></html>`,
  );
  const win = window.open("", "_blank", "width=800,height=600");
  if (!win) return;
  win.document.write(doc);
  win.document.close();
}

// 2x4 Part label body (used by both print + preview, via the generic doc wrapper).
function buildPart2x4Body(parts: PartEntry[], qrs: Array<{ part: string; job: string }>): string {
  const sections = parts.map((p, i) => {
    const partQr = qrs[i]?.part || "";
    const jobQr = qrs[i]?.job || "";
    return `
      <div class="row" style="border-top:1px solid #ddd;padding-top:6pt;margin-top:6pt;">
        <div class="grow">
          <div class="field"><b>Part #:</b> <span class="big">${escapeHtml(p.partNumber)}</span></div>
          <div class="field"><b>Qty:</b> <span class="big">${escapeHtml(p.qty)}</span></div>
          ${p.jobNumber.trim() ? `<div class="field"><b>Job #:</b> ${escapeHtml(p.jobNumber)}</div>` : ""}
          ${p.soNumber.trim() ? `<div class="field"><b>SO #:</b> ${escapeHtml(p.soNumber)}</div>` : ""}
          ${p.goesWith.trim() ? `<div class="field"><b>Goes With:</b> ${escapeHtml(p.goesWith)}</div>` : ""}
        </div>
        <div class="qrs">
          ${partQr ? `<div class="qr"><img src="${partQr}" alt="Part QR"/><div>PART</div></div>` : ""}
          ${jobQr ? `<div class="qr"><img src="${jobQr}" alt="Job QR"/><div>JOB</div></div>` : ""}
        </div>
      </div>`;
  }).join("");
  const specNote = `<div class="field" style="font-size:7pt;color:#777;margin-top:4pt;">[Spec icons: unit style — TBD]</div>`;
  return `<div class="title">Part</div>${sections}${specNote}`;
}

const PartLabelDialog = ({ size, open, onOpenChange }: { size: LabelSize; open: boolean; onOpenChange: (o: boolean) => void }) => {
  const [parts, setParts] = useState<PartEntry[]>([emptyPart()]);
  const [missing, setMissing] = useState<Set<string>>(new Set());
  const [previewHtml, setPreviewHtml] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const qrs = await computePartQrs(parts);
      if (cancelled) return;
      if (size === "4x6") {
        setPreviewHtml(buildPart4x6Doc(parts, qrs));
      } else {
        setPreviewHtml(buildGenericDoc("Part Label", buildPart2x4Body(parts, qrs), size));
      }
    })();
    return () => { cancelled = true; };
  }, [parts, size]);

  const updatePart = (i: number, patch: Partial<PartEntry>) => {
    setParts((prev) => prev.map((p, idx) => (idx === i ? { ...p, ...patch } : p)));
  };
  const addPart = () => {
    if (parts.length < 2) setParts([...parts, emptyPart()]);
  };
  const removePart = (i: number) => {
    setParts(parts.filter((_, idx) => idx !== i));
  };

  const handlePrint = async () => {
    if (size === "4x6") {
      // 4x6: all fields optional — blank fields (and their labels) are omitted on print.
      setMissing(new Set());
      await printPart4x6(parts);
      setParts([emptyPart()]);
      onOpenChange(false);
      return;
    }

    const m = new Set<string>();
    parts.forEach((p, i) => {
      if (!p.partNumber.trim()) m.add(`partNumber-${i}`);
      if (!p.qty.trim()) m.add(`qty-${i}`);
    });
    setMissing(m);
    if (m.size) return;

    const qrs = await computePartQrs(parts);
    const body = buildPart2x4Body(parts, qrs);
    await printLabel("Part Label", body, size);
    setParts([emptyPart()]);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Part Label</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-[1fr_360px] gap-6 flex-1 overflow-hidden">
          <div className="space-y-6 overflow-y-auto pr-2">
          {parts.map((p, i) => (
            <div key={i} className="space-y-4 border border-border rounded-md p-4 relative">
              <div className="flex items-center justify-between">
                <div className="text-sm font-semibold text-ring uppercase tracking-wide">
                  Part {i + 1}
                </div>
                {parts.length > 1 && (
                  <Button type="button" variant="outline" size="sm" onClick={() => removePart(i)}>
                    <X className="h-4 w-4 mr-1" /> Remove
                  </Button>
                )}
              </div>
              <div className="space-y-2">
                <Label>Part Number {size === "2x4" && <Req />}</Label>
                <Input
                  value={p.partNumber}
                  onChange={(e) => updatePart(i, { partNumber: e.target.value })}
                  className={cls(missing.has(`partNumber-${i}`) && invalidCls)}
                />
              </div>
              <div className="space-y-2">
                <Label>Qty {size === "2x4" && <Req />}</Label>
                <Input
                  type="number"
                  value={p.qty}
                  onChange={(e) => updatePart(i, { qty: e.target.value })}
                  className={cls(missing.has(`qty-${i}`) && invalidCls)}
                />
              </div>
              {size === "4x6" && (
                <div className="space-y-2">
                  <Label>Rev</Label>
                  <Input
                    value={p.rev}
                    onChange={(e) => updatePart(i, { rev: e.target.value })}
                    placeholder="A"
                  />
                  <p className="text-xs text-muted-foreground">Optional. Leave blank to omit from the printed label.</p>
                </div>
              )}
              <div className="space-y-2">
                <Label>Job Number</Label>
                <Input value={p.jobNumber} onChange={(e) => updatePart(i, { jobNumber: e.target.value })} />
                <p className="text-xs text-muted-foreground">Optional. Leave blank to omit from the printed label.</p>
              </div>
              {size === "2x4" && (
                <div className="space-y-2">
                  <Label>SO Number</Label>
                  <Input value={p.soNumber} onChange={(e) => updatePart(i, { soNumber: e.target.value })} />
                  <p className="text-xs text-muted-foreground">Optional. Leave blank to omit from the printed label.</p>
                </div>
              )}
              {size === "2x4" && (
                <div className="space-y-2">
                  <Label>Goes With</Label>
                  <Input
                    value={p.goesWith}
                    onChange={(e) => updatePart(i, { goesWith: e.target.value })}
                    placeholder="Part number(s) this is set with"
                  />
                  <p className="text-xs text-muted-foreground">Optional. List the part number(s) this default part ships as a set with.</p>
                </div>
              )}
              {size === "4x6" && (
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea
                    value={p.description}
                    onChange={(e) => updatePart(i, { description: e.target.value })}
                    placeholder="Optional description for this part"
                    rows={2}
                  />
                  <p className="text-xs text-muted-foreground">Optional. Appears on the printed label.</p>
                </div>
              )}
            </div>
          ))}
          {parts.length < 2 && (
            <Button type="button" variant="outline" size="sm" onClick={addPart}>
              <Plus className="h-4 w-4 mr-1" /> Add another part
            </Button>
          )}
          {size === "2x4" && (
            <p className="text-xs text-muted-foreground">
              Specification icons (based on unit style) will be added to the printed label — definitions TBD.
            </p>
          )}
          </div>
          <PreviewPane html={previewHtml} size={size} />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handlePrint}>Print</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// ----------------- Pack Unit Label -----------------
function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}

// 4x6 Pack Unit (Unit) label — pure HTML doc builder shared by print + preview.
// Any blank field (and its section title) is omitted from the output.
type Unit4x6Opts = {
  orderNumber: string;
  project: string;
  unitType: string;
  unitNum: string;
  unitTotal: string;
  date: string;
  area: string;
  status: string;
};
function buildUnit4x6Doc(opts: Unit4x6Opts): string {
  const { orderNumber, project, unitType, unitNum, unitTotal, date, area, status } = opts;

  const orderRow = orderNumber.trim()
    ? `<div class="order-row"><span class="section-title">Sales Order</span><div class="order-input">${escapeHtml(orderNumber)}</div></div>`
    : "";
  const projectRow = project.trim()
    ? `<div class="project-row"><span class="section-title">Project</span><div class="project-input">${escapeHtml(project)}</div></div>`
    : "";

  const unitCell = unitType.trim()
    ? `<div class="meta-cell unit-cell"><span class="meta-label">Unit:</span><span class="unit-select">${escapeHtml(unitType)}</span></div>`
    : "";
  const ofCell = (unitNum.trim() || unitTotal.trim())
    ? `<div class="meta-cell of-cell">
         ${unitNum.trim() ? `<span class="meta-input num-input">${escapeHtml(unitNum)}</span>` : `<span class="meta-input num-input"></span>`}
         <span class="of-word">of</span>
         ${unitTotal.trim() ? `<span class="meta-input total-input">${escapeHtml(unitTotal)}</span>` : `<span class="meta-input total-input"></span>`}
       </div>`
    : "";
  const dateCell = date.trim()
    ? `<div class="meta-cell date-cell"><span class="meta-label">Date:</span><span class="meta-input date-input">${escapeHtml(date)}</span></div>`
    : "";
  const metaRow = (unitCell || ofCell || dateCell)
    ? `<div class="meta-row">${unitCell}${ofCell}${dateCell}</div>`
    : "";

  const areaCell = area.trim()
    ? `<div class="area-cell"><span class="meta-label">Area:</span><span class="area-input">${escapeHtml(area)}</span></div>`
    : "";
  const statusCell = status.trim()
    ? `<div class="status-cell"><span class="status-label-sm">Status</span><span class="status-input">${escapeHtml(status)}</span></div>`
    : "";
  const bottomRow = (areaCell || statusCell)
    ? `<div class="bottom-row">${areaCell}${statusCell}</div>`
    : "";

  return `<!doctype html><html><head><title>Unit Label</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  @page { size: 6in 4in landscape; margin: 0; }
  html, body { margin: 0; padding: 0; background: #fff; font-family: Arial, sans-serif; color: #000; }
  .label { width: 6in; height: 4in; border: 2pt solid #000; display: flex; flex-direction: column; overflow: hidden; }
  .section-title { font-size: 11px; font-weight: 700; color: #555; text-transform: uppercase; letter-spacing: 1px; line-height: 1; margin-bottom: 2px; }
  .order-row { border-bottom: 2pt solid #000; padding: 4px 14px 2px 14px; display: flex; flex-direction: column; }
  .order-input { font-size: 64px; font-weight: 900; font-family: "Arial Black", Arial, sans-serif; line-height: 1.05; }
  .project-row { border-bottom: 2pt solid #000; padding: 4px 14px 6px 14px; display: flex; flex-direction: column; }
  .project-input { font-size: 24px; font-weight: 700; line-height: 1.15; }
  .meta-row { border-bottom: 2pt solid #000; display: flex; align-items: stretch; }
  .meta-cell { display: flex; align-items: center; padding: 4px 10px; gap: 6px; }
  .meta-cell.unit-cell { flex: 0 0 auto; border-right: 1.5pt solid #000; gap: 8px; }
  .meta-cell.of-cell   { flex: 1; border-right: 1.5pt solid #000; gap: 6px; }
  .meta-cell.date-cell { flex: 0 0 auto; }
  .meta-label { font-size: 18px; font-weight: 700; white-space: nowrap; }
  .unit-select { font-size: 20px; font-weight: 700; border-bottom: 2pt solid #000; padding-right: 4px; }
  .meta-input { font-size: 20px; font-weight: 700; border-bottom: 1.5pt solid #000; text-align: center; display: inline-block; min-height: 22px; padding: 0 4px; }
  .meta-input.num-input { min-width: 40px; }
  .meta-input.total-input { min-width: 40px; }
  .meta-input.date-input { min-width: 70px; letter-spacing: 1px; }
  .of-word { font-size: 20px; font-weight: 700; }
  .bottom-row { display: flex; align-items: stretch; min-height: 56px; flex: 1; }
  .area-cell { flex: 1; display: flex; align-items: center; padding: 4px 10px; gap: 8px; border-right: 1.5pt solid #000; }
  .area-input { flex: 1; font-size: 24px; font-weight: 900; font-family: "Arial Black", Arial, sans-serif; text-transform: uppercase; border-bottom: 1.5pt solid #000; display: inline-block; min-height: 26px; padding: 0 4px; }
  .status-cell { width: 140px; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 4px 8px; }
  .status-label-sm { font-size: 11px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; margin-bottom: 2px; }
  .status-input { width: 100%; font-size: 24px; font-weight: 900; font-family: "Arial Black", Arial, sans-serif; text-align: center; text-transform: uppercase; border-bottom: 1.5pt solid #000; display: inline-block; min-height: 26px; padding: 0 4px; }
</style></head><body>
<div class="label">
  ${orderRow}
  ${projectRow}
  ${metaRow}
  ${bottomRow}
</div>
</body></html>`;
}

async function printUnit4x6(opts: Unit4x6Opts) {
  const doc = buildUnit4x6Doc(opts).replace(
    "</body></html>",
    `<script>window.onload = () => { setTimeout(() => { window.print(); }, 200); };<\/script></body></html>`,
  );
  const win = window.open("", "_blank", "width=800,height=600");
  if (!win) return;
  win.document.write(doc);
  win.document.close();
}

// 2x4 Pack Unit label body builder (used by print + preview).
function buildPackUnit2x4Body(opts: {
  sos: string[];
  jobs: string[];
  projectId: string;
  unitX: string;
  unitN: string;
  date: string;
  unitSel: string;
  area: string;
  jobQrs: string[];
}): string {
  const { sos, jobs, projectId, unitX, unitN, date, unitSel, area, jobQrs } = opts;
  return `
    <div class="row">
      <div class="grow">
        <div class="title">${escapeHtml(unitSel)}</div>
        <div class="huge">${escapeHtml(unitX)} / ${escapeHtml(unitN)}</div>
        ${sos.length ? `<div class="field"><b>SO #:</b> ${sos.map(escapeHtml).join(", ")}</div>` : ""}
        ${jobs.length ? `<div class="field"><b>Job #:</b> ${jobs.map(escapeHtml).join(", ")}</div>` : ""}
        ${projectId.trim() ? `<div class="field"><b>Project:</b> ${escapeHtml(projectId)}</div>` : ""}
        ${area ? `<div class="field"><b>Area:</b> ${escapeHtml(area)}</div>` : ""}
        ${date ? `<div class="field"><b>Date:</b> ${escapeHtml(date)}</div>` : ""}
      </div>
      <div class="qrs">
        ${jobQrs.map((q, i) => q ? `<div class="qr"><img src="${q}" alt="Job QR"/><div>JOB ${escapeHtml(jobs[i])}</div></div>` : "").join("")}
      </div>
    </div>`;
}

const MultiInput = ({
  label,
  values,
  setValues,
  required,
  invalid,
}: {
  label: string;
  values: string[];
  setValues: (v: string[]) => void;
  required?: boolean;
  invalid?: boolean;
}) => (
  <div className="space-y-2">
    <Label>
      {label} {required && <Req />}
    </Label>
    {values.map((v, i) => (
      <div key={i} className="flex gap-2">
        <Input
          value={v}
          onChange={(e) => {
            const next = [...values];
            next[i] = e.target.value;
            setValues(next);
          }}
          className={cls(invalid && i === 0 && !v.trim() && invalidCls)}
        />
        {values.length > 1 && (
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => setValues(values.filter((_, idx) => idx !== i))}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
    ))}
    <Button type="button" variant="outline" size="sm" onClick={() => setValues([...values, ""])}>
      <Plus className="h-4 w-4 mr-1" /> Add another
    </Button>
  </div>
);

const PackUnitLabelDialog = ({ size, open, onOpenChange }: { size: LabelSize; open: boolean; onOpenChange: (o: boolean) => void }) => {
  const [soNumbers, setSoNumbers] = useState<string[]>([""]);
  const [jobNumbers, setJobNumbers] = useState<string[]>([""]);
  const [projectId, setProjectId] = useState("");
  const [unitX, setUnitX] = useState("");
  const [unitN, setUnitN] = useState("");
  const [date, setDate] = useState("");
  const [unitSel, setUnitSel] = useState("");
  const [area, setArea] = useState("");
  const [missing, setMissing] = useState<Set<string>>(new Set());
  const [previewHtml, setPreviewHtml] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (size === "4x6") {
        const firstSo = soNumbers.map((s) => s.trim()).find(Boolean) ?? "";
        const doc = buildUnit4x6Doc({
          orderNumber: firstSo,
          project: projectId,
          unitType: unitSel,
          unitNum: unitX,
          unitTotal: unitN,
          date,
          area,
          status: "",
        });
        if (!cancelled) setPreviewHtml(doc);
      } else {
        const sos = soNumbers.map((s) => s.trim()).filter(Boolean);
        const jobs = jobNumbers.map((s) => s.trim()).filter(Boolean);
        const jobQrs = await Promise.all(jobs.map((j) => cachedQr(j)));
        if (cancelled) return;
        const body = buildPackUnit2x4Body({ sos, jobs, projectId, unitX, unitN, date, unitSel, area, jobQrs });
        setPreviewHtml(buildGenericDoc("Pack Unit Label", body, size));
      }
    })();
    return () => { cancelled = true; };
  }, [size, soNumbers, jobNumbers, projectId, unitX, unitN, date, unitSel, area]);

  const handlePrint = async () => {
    if (size === "4x6") {
      // 4x6 unit label: all fields optional — blank fields are omitted on print.
      setMissing(new Set());
      await printUnit4x6({
        orderNumber: soNumbers.map((s) => s.trim()).find(Boolean) ?? "",
        project: projectId,
        unitType: unitSel,
        unitNum: unitX,
        unitTotal: unitN,
        date,
        area,
        status: "",
      });
      setSoNumbers([""]);
      setJobNumbers([""]);
      setProjectId("");
      setUnitX("");
      setUnitN("");
      setDate("");
      setUnitSel("");
      setArea("");
      onOpenChange(false);
      return;
    }

    const m = new Set<string>();
    if (!soNumbers.some((s) => s.trim())) m.add("so");
    if (!unitX.trim() || !unitN.trim()) m.add("unitNum");
    if (!date.trim()) m.add("date");
    if (!unitSel) m.add("unitSel");
    if (!area) m.add("area");
    setMissing(m);
    if (m.size) return;

    const sos = soNumbers.map((s) => s.trim()).filter(Boolean);
    const jobs = jobNumbers.map((s) => s.trim()).filter(Boolean);
    const jobQrs = await Promise.all(jobs.map((j) => cachedQr(j)));
    const body = buildPackUnit2x4Body({ sos, jobs, projectId, unitX, unitN, date, unitSel, area, jobQrs });
    await printLabel("Pack Unit Label", body, size);
    setSoNumbers([""]);
    setJobNumbers([""]);
    setProjectId("");
    setUnitX("");
    setUnitN("");
    setDate("");
    setUnitSel("");
    setArea("");
    setMissing(new Set());
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Pack Unit Label</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-[1fr_360px] gap-6 flex-1 overflow-hidden">
          <div className="space-y-4 overflow-y-auto pr-2">
          {size === "2x4" && (
            <MultiInput label="SO Number" values={soNumbers} setValues={setSoNumbers} required invalid={missing.has("so")} />
          )}
          <MultiInput label="Job Number" values={jobNumbers} setValues={setJobNumbers} />
          <div className="space-y-2">
            <Label htmlFor="proj-id">Project ID</Label>
            <Input id="proj-id" value={projectId} onChange={(e) => setProjectId(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Unit Number <Req /></Label>
            <div className="flex items-center gap-2">
              <Input
                placeholder="X"
                type="number"
                value={unitX}
                onChange={(e) => setUnitX(e.target.value)}
                className={cls("w-24", missing.has("unitNum") && !unitX.trim() && invalidCls)}
              />
              <span className="text-muted-foreground">out of</span>
              <Input
                placeholder="N"
                type="number"
                value={unitN}
                onChange={(e) => setUnitN(e.target.value)}
                className={cls("w-24", missing.has("unitNum") && !unitN.trim() && invalidCls)}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="pack-date">Date (mm/dd/yy) <Req /></Label>
            <div className="flex gap-2">
              <Input
                id="pack-date"
                placeholder="mm/dd/yy"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className={cls(missing.has("date") && invalidCls)}
              />
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className={cls(missing.has("date") && invalidCls)}
                    aria-label="Pick a date"
                  >
                    <CalendarIcon className="h-4 w-4" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="end">
                  <Calendar
                    mode="single"
                    selected={(() => {
                      const d = parse(date, "MM/dd/yy", new Date());
                      return isValid(d) ? d : undefined;
                    })()}
                    onSelect={(d) => d && setDate(format(d, "MM/dd/yy"))}
                    initialFocus
                    className={cn("p-3 pointer-events-auto")}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Unit <Req /></Label>
            <Select value={unitSel} onValueChange={setUnitSel}>
              <SelectTrigger className={cls(missing.has("unitSel") && invalidCls)}>
                <SelectValue placeholder="Select unit" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="BOX">BOX</SelectItem>
                <SelectItem value="CRATE">CRATE</SelectItem>
                <SelectItem value="PALLET">PALLET</SelectItem>
                <SelectItem value="C-PALLET">C-PALLET</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Area <Req /></Label>
            <Select value={area} onValueChange={setArea}>
              <SelectTrigger className={cls(missing.has("area") && invalidCls)}>
                <SelectValue placeholder="Select area" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="SHIPPING">SHIPPING</SelectItem>
                <SelectItem value="MAINLINE">MAINLINE</SelectItem>
                <SelectItem value="CHASSISLINE">CHASSISLINE</SelectItem>
                <SelectItem value="MATERIALS">MATERIALS</SelectItem>
                <SelectItem value="OTHER">OTHER</SelectItem>
              </SelectContent>
            </Select>
          </div>
          </div>
          <PreviewPane html={previewHtml} size={size} />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handlePrint}>Print</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// ----------------- Status Note Label -----------------
const StatusNoteLabelDialog = ({ size, open, onOpenChange }: { size: LabelSize; open: boolean; onOpenChange: (o: boolean) => void }) => {
  const [status, setStatus] = useState("");
  const [reason, setReason] = useState("");
  const [missing, setMissing] = useState<Set<string>>(new Set());

  const buildBody = (s: string, r: string) => `
      <div class="center grow" style="display:flex;flex-direction:column;justify-content:center;align-items:center;">
        <div class="title" style="font-size:48pt;">${escapeHtml(s)}</div>
        ${r.trim() ? `<div class="field wrap" style="font-size:18pt;margin-top:0.2in;">${escapeHtml(r)}</div>` : ""}
      </div>`;
  const previewHtml = buildGenericDoc("Status Note Label", buildBody(status, reason), size);

  const handlePrint = async () => {
    const m = new Set<string>();
    if (!status) m.add("status");
    setMissing(m);
    if (m.size) return;
    await printLabel("Status Note Label", buildBody(status, reason), size);
    setStatus("");
    setReason("");
    setMissing(new Set());
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Status Note Label</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-[1fr_360px] gap-6 flex-1 overflow-hidden">
          <div className="space-y-4 overflow-y-auto pr-2">
          <div className="space-y-2">
            <Label>Status <Req /></Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className={cls(missing.has("status") && invalidCls)}>
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="HOLD">HOLD</SelectItem>
                <SelectItem value="PENDING">PENDING</SelectItem>
                <SelectItem value="PRE-ORDER">PRE-ORDER</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="reason">Reason</Label>
            <Textarea id="reason" value={reason} onChange={(e) => setReason(e.target.value)} />
          </div>
          </div>
          <PreviewPane html={previewHtml} size={size} />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handlePrint}>Print</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// ----------------- Misc Label -----------------
const MiscLabelDialog = ({ size, open, onOpenChange }: { size: LabelSize; open: boolean; onOpenChange: (o: boolean) => void }) => {
  const [text, setText] = useState("");
  const [missing, setMissing] = useState<Set<string>>(new Set());

  const buildBody = (t: string) => `
      <div class="grow" style="display:flex;align-items:center;justify-content:center;">
        <div class="huge wrap center">${escapeHtml(t)}</div>
      </div>`;
  const previewHtml = buildGenericDoc("Misc Label", buildBody(text), size);

  const handlePrint = async () => {
    const m = new Set<string>();
    if (!text.trim()) m.add("text");
    setMissing(m);
    if (m.size) return;
    await printLabel("Misc Label", buildBody(text), size);
    setText("");
    setMissing(new Set());
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Misc Label</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-[1fr_360px] gap-6 flex-1 overflow-hidden">
          <div className="space-y-2 overflow-y-auto pr-2">
          <Label htmlFor="misc-text">Text <Req /></Label>
          <Textarea
            id="misc-text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            className={cls(missing.has("text") && invalidCls)}
          />
          </div>
          <PreviewPane html={previewHtml} size={size} />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handlePrint}>Print</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};