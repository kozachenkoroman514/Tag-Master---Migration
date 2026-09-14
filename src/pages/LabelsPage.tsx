import { useEffect, useMemo, useRef, useState } from "react";
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
import { Plus, X, CalendarIcon, ScanLine, Camera, Upload, Loader2, Trash2, FileText, Package } from "lucide-react";
import partLabelIcon from "@/assets/part-label-icon.png.asset.json";
import partLabel2x4Icon from "@/assets/part-label-2x4-icon.png.asset.json";
import miscLabel2x4Icon from "@/assets/misc-label-2x4-icon.png.asset.json";
import unitLabelIcon from "@/assets/unit-label-icon.png.asset.json";
import unitLabel2x4Icon from "@/assets/unit-label-2x4-icon.png.asset.json";
import statusLabelIcon from "@/assets/status-label-icon.png.asset.json";
import statusLabel2x4Icon from "@/assets/status-label-2x4-icon.png.asset.json";
import sampleLabelIcon from "@/assets/sample-label-icon.png.asset.json";
import inspectionLabelIcon from "@/assets/inspection-label-icon.png.asset.json";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format, parse, isValid } from "date-fns";
import { cn } from "@/lib/utils";
import QRCode from "qrcode";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const cls = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(" ");
const invalidCls = "ring-2 ring-destructive border-destructive focus-visible:ring-destructive";
const Req = () => <span className="text-destructive">*</span>;

// Prevent Enter (e.g. barcode scanners) from submitting/printing.
// Textareas keep normal newline behavior.
const blockEnterSubmit = (e: React.KeyboardEvent<HTMLFormElement>) => {
  if (e.key !== "Enter") return;
  const t = e.target as HTMLElement | null;
  if (t && t.tagName === "TEXTAREA") return;
  e.preventDefault();
};

// --- Label HTML doc builders (shared by print window + live preview iframe) ---
function buildGenericDoc(title: string, bodyHtml: string, size: LabelSize): string {
  const pageSize = size === "2x4" ? "4in 2in landscape" : "6in 4in landscape";
  const labelW = size === "2x4" ? "4in" : "6in";
  const labelH = size === "2x4" ? "2in" : "4in";
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
  @media print {
    html, body { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; }
    .label { transform: scale(0.95); transform-origin: center center; }
  }
</style></head><body><div class="label">${bodyHtml}</div></body></html>`;
}

async function printLabel(title: string, bodyHtml: string, size: LabelSize = "4x6") {
  const win = window.open("", "_blank", "width=800,height=600");
  if (!win) return;
  const doc = buildGenericDoc(title, bodyHtml, size).replace(
    "</body></html>",
    `<script>window.onload = () => { setTimeout(() => { window.print(); }, 150); }; window.addEventListener('afterprint', () => { window.close(); });<\/script></body></html>`,
  );
  win.document.write(doc);
  win.document.close();
}

// Split text into label-sized chunks at word boundaries; breaks oversize single words.
function chunkMiscText(text: string, max: number): string[] {
  const t = text ?? "";
  if (!t.trim()) return [""];
  const out: string[] = [];
  const tokens = t.split(/(\s+)/);
  let cur = "";
  const pushCur = () => { if (cur.trim()) out.push(cur.replace(/\s+$/, "")); cur = ""; };
  for (const tok of tokens) {
    if (!tok) continue;
    if ((cur + tok).length <= max) {
      cur += tok;
      continue;
    }
    if (/^\s+$/.test(tok)) { pushCur(); continue; }
    pushCur();
    let rest = tok;
    while (rest.length > max) { out.push(rest.slice(0, max)); rest = rest.slice(max); }
    cur = rest;
  }
  pushCur();
  return out.length ? out : [""];
}

// Print multiple misc labels in a single print job, one per page.
async function printMiscMultiPage(title: string, bodies: string[], size: LabelSize) {
  const win = window.open("", "_blank", "width=800,height=600");
  if (!win) return;
  const single = buildGenericDoc(title, bodies[0] ?? "", size);
  const labelsHtml = bodies
    .map(
      (b, i) =>
        `<div class="label" style="page-break-after:${i === bodies.length - 1 ? "auto" : "always"}; break-after:${i === bodies.length - 1 ? "auto" : "page"}; page-break-inside:avoid; break-inside:avoid; overflow:hidden; margin:0 auto;">${b}</div>`,
    )
    .join("");
  const doc = single
    .replace(/<div class="label">[\s\S]*?<\/div><\/body>/, `${labelsHtml}</body>`)
    // Override the single-label print centering: with multiple labels, the
    // flex body would squeeze all labels into one row, collapsing each
    // label's width and forcing the text into narrow columns. Use block
    // layout so each label fills its own @page.
    .replace(
      "@media print {",
      `@media print {
    html, body { display: block !important; width: auto !important; height: auto !important; }
    .label { transform: none !important; overflow: hidden !important; page-break-inside: avoid; break-inside: avoid; }`,
    )
    .replace(
      "</body></html>",
      `<script>window.onload = () => { setTimeout(() => { window.print(); }, 200); }; window.addEventListener('afterprint', () => { window.close(); });<\/script></body></html>`,
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
const LabelPreview = ({ html, size, landscape, fixedDisplayW }: { html: string; size: LabelSize; landscape?: boolean; fixedDisplayW?: number }) => {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(() => {
    const nativeW = nativeWFor(size, landscape);
    const nativeH = nativeHFor(size, landscape);
    if (fixedDisplayW) return fixedDisplayW / nativeW;
    const estAvailW = 640;
    const estAvailH = 700;
    return Math.min(estAvailW / nativeW, estAvailH / nativeH);
  });

  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;

    const nativeW = nativeWFor(size, landscape);
    const nativeH = nativeHFor(size, landscape);

    const update = () => {
      if (fixedDisplayW) { setScale(fixedDisplayW / nativeW); return; }
      const rect = el.getBoundingClientRect();
      const s = Math.min(rect.width / nativeW, rect.height / nativeH);
      setScale(s);
    };

    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [size, landscape, fixedDisplayW]);

  const nativeW = nativeWFor(size, landscape);
  const nativeH = nativeHFor(size, landscape);

  return (
    <div ref={wrapperRef} className={fixedDisplayW ? "flex items-center justify-center" : "flex-1 w-full min-h-0 flex items-center justify-center"}>
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
    </div>
  );
};

const PreviewPane = ({ html, size, landscape }: { html: string; size: LabelSize; landscape?: boolean }) => (
  <div className="border-l border-border pl-4 flex flex-col items-center gap-2 h-full overflow-hidden">
    <div className="text-xs uppercase tracking-wide text-muted-foreground font-semibold">
      Live preview
    </div>
    <LabelPreview html={html} size={size} landscape={landscape} />
    <div className="text-[10px] text-muted-foreground">
      {size === "4x6" ? '4" × 6" (scaled)' : '2" × 4" (scaled)'}
    </div>
  </div>
);

// Native iframe dims (in CSS px at 96dpi). 4x6 is always landscape (6w x 4h).
// 2x4 defaults to portrait (2w x 4h); set landscape=true for 4w x 2h labels.
function nativeWFor(size: LabelSize, landscape?: boolean) {
  if (size === "4x6") return 576;
  return landscape ? 384 : 192;
}
function nativeHFor(size: LabelSize, landscape?: boolean) {
  if (size === "4x6") return 384;
  return landscape ? 192 : 384;
}

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
type LabelKind = "part" | "pack-unit" | "status-note" | "misc" | "inspection";

const FOUR_BY_SIX_ICONS: Record<LabelKind, { url: string }> = {
  "part": partLabelIcon,
  "pack-unit": unitLabelIcon,
  "status-note": statusLabelIcon,
  "misc": sampleLabelIcon,
  "inspection": inspectionLabelIcon,
};

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
  const [scanOpen, setScanOpen] = useState(false);

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
          <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => setScanOpen(true)}
            className="gap-2"
          >
            <ScanLine className="h-4 w-4" />
            Scan Picklist
          </Button>
          <div className="inline-flex items-center rounded-lg border border-border bg-card p-1 gap-1">
            {sizes.map((s) => {
              const active = size === s.value;
              return (
                <div key={s.value} className="relative flex items-center">
                  <button
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
                </div>
              );
            })}
          </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {(
            [
              { kind: "part", label: "Part", Icon: PartIcon },
              { kind: "pack-unit", label: "Pack Unit", Icon: PackUnitIcon },
              { kind: "status-note", label: "Status Note", Icon: StatusNoteIcon },
              { kind: "misc", label: "Misc", Icon: MiscIcon },
              ...(size === "4x6"
                ? [{ kind: "inspection", label: "Inspection", Icon: StatusNoteIcon }]
                : []),
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
              <div
                className={
                  size === "2x4"
                    ? "w-72 h-36"
                    : "w-80 h-80"
                }
              >
                {size === "4x6" ? (
                  <img
                    src={FOUR_BY_SIX_ICONS[tile.kind].url}
                    alt={`${tile.label} 4x6 label`}
                    className="w-full h-full object-contain"
                  />
                ) : tile.kind === "part" ? (
                  <img
                    src={partLabel2x4Icon.url}
                    alt="Part 2x4 label"
                    className="w-full h-full object-contain"
                  />
                ) : tile.kind === "misc" ? (
                  <img
                    src={miscLabel2x4Icon.url}
                    alt="Misc 2x4 label"
                    className="w-full h-full object-contain"
                  />
                ) : tile.kind === "pack-unit" ? (
                  <img
                    src={unitLabel2x4Icon.url}
                    alt="Pack Unit 2x4 label"
                    className="w-full h-full object-contain"
                  />
                ) : tile.kind === "status-note" ? (
                  <img
                    src={statusLabel2x4Icon.url}
                    alt="Status Note 2x4 label"
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <tile.Icon />
                )}
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
        <InspectionLabelDialog open={openKind === "inspection"} onOpenChange={(o) => !o && setOpenKind(null)} />
        <ScanPicklistDialog open={scanOpen} onOpenChange={setScanOpen} defaultSize={size} />

      </main>
    </div>
  );
};

export default LabelsPage;

// ----------------- Part Label -----------------
type PartEntry = {
  partNumber: string;
  qty: string;
  jobNumber: string;
  soNumber: string;
  goesWith: string;
  description: string;
  rev: string;
  item: string;
  // 2x4-only optional fields
  unitNum?: string;
  unitTotal?: string;
  selectedUnits?: number[];
};
const emptyPart = (): PartEntry => ({
  partNumber: "", qty: "", jobNumber: "", soNumber: "", goesWith: "",
  description: "", rev: "", item: "",
  unitNum: "", unitTotal: "", selectedUnits: undefined,
});

// Expand a part list into per-unit labels for the 2x4 Part label.
// If unitTotal > 1, emits one label per selected unit number (defaults to all units).
type Part2x4Row = { part: PartEntry; unitNum: string; unitTotal: string };
function expandParts2x4(parts: PartEntry[]): Part2x4Row[] {
  const out: Part2x4Row[] = [];
  for (const p of parts) {
    const totalN = Math.max(1, parseInt(p.unitTotal || "1", 10) || 1);
    const total = String(totalN);
    if (totalN <= 1) {
      out.push({ part: p, unitNum: (p.unitNum || "").trim(), unitTotal: (p.unitTotal || "").trim() });
      continue;
    }
    const sel = p.selectedUnits === undefined
      ? Array.from({ length: totalN }, (_, i) => i + 1)
      : [...p.selectedUnits].filter((n) => n >= 1 && n <= totalN).sort((a, b) => a - b);
    for (const n of sel) out.push({ part: p, unitNum: String(n), unitTotal: total });
  }
  return out;
}

// 4x6 Part label — pure HTML doc builder shared by print + live preview.
// Any field left blank (and its static label) is omitted from the output.
function buildPart4x6Doc(parts: PartEntry[], qrs: Array<{ part: string; job: string }>): string {
  const rows = parts.map((p, i) => {
      const partQr = qrs[i]?.part || "";
      const jobQr = qrs[i]?.job || "";

      const hasAny = p.jobNumber.trim() || p.qty.trim() || p.rev.trim() || p.partNumber.trim() || p.description.trim();

      const jobVis = p.jobNumber.trim() ? "" : "visibility:hidden;";
      const qtyVis = p.qty.trim() ? "" : "visibility:hidden;";
      const revVis = p.rev.trim() ? "" : "visibility:hidden;";
      const partVis = p.partNumber.trim() ? "" : "visibility:hidden;";
      const descVis = p.description.trim() ? "" : "visibility:hidden;";

      const jobBlock = `<div class="jqr-pair jqr-col" style="${jobVis}">
             <span class="sec-title">Job</span>
             <div class="jqr-row">
               <span class="red-input job-num">${escapeHtml(p.jobNumber)}</span>
               ${jobQr ? `<div class="qr-mini"><img src="${jobQr}" alt="Job QR"/></div>` : `<div class="qr-mini"></div>`}
             </div>
           </div>`;

      const qtyItem = `<div class="qty-rev-item" style="${qtyVis}"><span class="sec-title">QTY</span><span class="red-input qty-num">${escapeHtml(p.qty)}</span></div>`;
      const revItem = `<div class="qty-rev-item" style="${revVis}"><span class="sec-title">Rev</span><span class="red-input rev-val">${escapeHtml(p.rev)}</span></div>`;
      const qtyRevGroup = `<div class="qty-rev-group">${qtyItem}${revItem}</div>`;

      const jobLine = `<div class="job-line"><div class="job-inputs-row">${jobBlock}${qtyRevGroup}</div></div>`;

      const partLine = `<div class="part-line" style="${partVis}">
             <span class="sec-title">Part</span>
             <div class="part-inputs-row">
               <span class="part-number-input">${escapeHtml(p.partNumber)}</span>
               ${partQr ? `<div class="qr-part"><img src="${partQr}" alt="Part QR"/></div>` : `<div class="qr-part"></div>`}
             </div>
           </div>`;

      const descLine = `<div class="desc-line" style="${descVis}">
             <span class="sec-title-inline">Description</span>
             <div class="desc-inputs-row">
               <span class="desc-input">${escapeHtml(p.description)}</span>
             </div>
           </div>`;

      if (!hasAny) return "";
      return `<div class="part-row">${jobLine}${partLine}${descLine}</div>`;
    });

  const partRows = rows.filter(Boolean).join("");

  return `<!doctype html><html><head><title>Part Label</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  @page { size: 6in 4in landscape; margin: 0; }
  html, body { margin: 0; padding: 0; background: #fff; font-family: Arial, sans-serif; color: #000; }
  .label { width: 6in; height: 4in; display: flex; flex-direction: column; overflow: hidden; }
  .label-header { border-bottom: 2.5px solid #222; padding: 0px 14px 1px 14px; }
  .logo-text { font-size: 22px; font-weight: 900; font-family: "Arial Black", Arial, sans-serif; letter-spacing: 1.5px; text-transform: uppercase; line-height: 1; }
  .logo-reg { font-size: 15px; vertical-align: super; }
  .parts-area { flex: 1; display: flex; flex-direction: column; }
  .part-row { flex: 1; display: flex; flex-direction: column; border-bottom: 2.5px solid #222; }
  .part-row:last-of-type { border-bottom: none; }
  .sec-title { font-size: 11px; font-weight: 700; color: #555; text-transform: uppercase; letter-spacing: 0.5px; line-height: 1; display: block; margin-bottom: -2px; white-space: nowrap; }
  .sec-title-inline { font-size: 11px; font-weight: 700; color: #555; text-transform: uppercase; letter-spacing: 0.5px; line-height: 1; white-space: nowrap; flex-shrink: 0; margin-bottom: -2px; }
  .job-line { display: flex; flex-direction: column; justify-content: center; padding: 4px 12px; border-bottom: 1px solid #ccc; }
  .job-inputs-row { display: flex; align-items: center; width: 100%; }
  .jqr-pair { display: flex; align-items: center; gap: 8px; flex: 1; }
  .jqr-col { flex-direction: column; align-items: flex-start; gap: 0; }
  .jqr-row { display: flex; align-items: center; gap: 8px; }
  .red-input { border: none; border-bottom: 2.5px solid #222; font-size: 18px; font-weight: 700; color: #000; padding: 0 2px; min-height: 20px; display: inline-block; }
  .red-input.job-num { min-width: 108px; }
  .red-input.qty-num { min-width: 56px; }
  .red-input.rev-val { min-width: 46px; }
  .qty-rev-group { display: flex; align-items: flex-start; gap: 16px; margin-left: auto; }
  .qty-rev-item { display: flex; flex-direction: column; align-items: flex-start; gap: 0; }
  .qr-mini { width: 58px; height: 58px; flex-shrink: 0; }
  .qr-mini img { width: 100%; height: 100%; }
  .part-line { display: flex; flex-direction: column; justify-content: center; padding: 4px 12px; border-bottom: 1px solid #ccc; }
  .part-inputs-row { display: flex; align-items: center; gap: 10px; width: 100%; }
  .part-number-input { flex: 1; border: none; border-bottom: 2.5px solid #222; font-size: 18px; font-weight: 700; color: #000; padding: 0 2px; min-height: 20px; display: inline-block; }
  .qr-part { width: 64px; height: 64px; flex-shrink: 0; }
  .qr-part img { width: 100%; height: 100%; }
  .desc-line { display: flex; flex-direction: row; align-items: baseline; padding: 0px 12px 1px 12px; gap: 6px; }
  .desc-inputs-row { display: flex; align-items: center; gap: 6px; flex: 1; }
  .desc-input { flex: 1; border: none; color: #222; font-size: 14px; font-weight: 600; padding: 0 2px; min-height: 16px; display: inline-block; }
  @media print { .label { transform: scale(0.95); transform-origin: center center; } }
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
    `<script>window.onload = () => { setTimeout(() => { window.print(); }, 200); }; window.addEventListener('afterprint', () => { window.close(); });<\/script></body></html>`,
  );
  const win = window.open("", "_blank", "width=800,height=600");
  if (!win) return;
  win.document.write(doc);
  win.document.close();
}

const stemOf = (pn: string) =>
  pn.trim().toUpperCase().replace(/-(M|C)$/i, "");

function consolidateParts(parts: PartEntry[]): PartEntry[] {
  const consolidated: PartEntry[] = [];
  const idxByKey = new Map<string, number>();
  parts.forEach((p) => {
    const key = `${p.partNumber.trim().toLowerCase()}|${p.jobNumber.trim().toLowerCase()}`;
    const hasKey = p.partNumber.trim() && p.jobNumber.trim();
    const existing = hasKey ? idxByKey.get(key) : undefined;
    if (existing !== undefined) {
      const a = parseInt(consolidated[existing].qty, 10);
      const b = parseInt(p.qty, 10);
      if (!Number.isNaN(a) && !Number.isNaN(b)) {
        consolidated[existing] = { ...consolidated[existing], qty: String(a + b) };
      }
    } else {
      if (hasKey) idxByKey.set(key, consolidated.length);
      consolidated.push({ ...p });
    }
  });
  return consolidated;
}

function computeLabelCount(consolidated: PartEntry[], size: LabelSize, perLabel = 2): number {
  if (size === "2x4") return consolidated.length;

  const groups = new Map<string, PartEntry[]>();
  const order: string[] = [];
  for (const p of consolidated) {
    const stem = stemOf(p.partNumber);
    if (!groups.has(stem)) {
      groups.set(stem, []);
      order.push(stem);
    }
    groups.get(stem)!.push(p);
  }
  const sorted: PartEntry[] = [];
  for (const stem of order) sorted.push(...groups.get(stem)!);

  let count = 0;
  let i = 0;
  while (i < sorted.length) {
    const a = sorted[i];
    const b = sorted[i + 1];
    if (b && stemOf(a.partNumber) === stemOf(b.partNumber)) {
      count += 1;
      i += perLabel >= 2 ? 2 : 1;
    } else {
      count += 1;
      i += 1;
    }
  }
  return count;
}

// Batched 4x6 printing: chunks parts into groups of `perLabel` (default 2) so
// each printed 4x6 label holds up to N listings. Multiple labels are stacked
// into one print doc separated by page breaks.
async function printPart4x6Batched(parts: PartEntry[], perLabel = 2) {
  // Pair "similar" parts on the same label by grouping on the part number
  // with a trailing -M (mirror) or -C (chassis) suffix removed. e.g.
  // INT3-DC-36.00X42.00-AK-LSE-M pairs with INT3-DC-36.00X42.00-AK-LSE-C.
  // Unmatched parts get their own label (or fill leftover slots).
  const groups = new Map<string, PartEntry[]>();
  const order: string[] = [];
  for (const p of parts) {
    const stem = stemOf(p.partNumber);
    if (!groups.has(stem)) {
      groups.set(stem, []);
      order.push(stem);
    }
    groups.get(stem)!.push(p);
  }

  const sorted: PartEntry[] = [];
  for (const stem of order) sorted.push(...groups.get(stem)!);

  const chunks: PartEntry[][] = [];
  let i = 0;
  while (i < sorted.length) {
    const a = sorted[i];
    const b = sorted[i + 1];
    if (b && stemOf(a.partNumber) === stemOf(b.partNumber)) {
      chunks.push(perLabel >= 2 ? [a, b] : [a]);
      i += perLabel >= 2 ? 2 : 1;
    } else {
      chunks.push([a]);
      i += 1;
    }
  }
  if (chunks.length === 0) return;
  // Recompute QRs in the new (sorted/chunked) order so each label gets the
  // correct QR codes for its listings.
  const flat = chunks.flat();
  const qrs = await computePartQrs(flat);

  const labelHtmls: string[] = [];
  let cursor = 0;
  for (const chunk of chunks) {
    const chunkQrs = qrs.slice(cursor, cursor + chunk.length);
    cursor += chunk.length;
    const full = buildPart4x6Doc(chunk, chunkQrs);
    const match = full.match(/<div class="label">[\s\S]*?<\/div>\s*<\/body>/);
    const labelDiv = match ? match[0].replace(/\s*<\/body>$/, "") : "";
    labelHtmls.push(labelDiv);
  }

  // Use the first chunk's full doc as a template for <head>/styles, then
  // replace its body with all chunked labels separated by page breaks.
  const template = buildPart4x6Doc(chunks[0], qrs.slice(0, chunks[0].length));
  const bodyContent = labelHtmls
    .map((html, i) => `<div class="page-wrap"${i < labelHtmls.length - 1 ? ' style="page-break-after: always;"' : ""}>${html}</div>`)
    .join("");
  const doc = template
    .replace(/<body>[\s\S]*<\/body>/, `<body>${bodyContent}</body>`)
    .replace(
      "</body></html>",
      `<script>window.onload = () => { setTimeout(() => { window.print(); }, 200); }; window.addEventListener('afterprint', () => { window.close(); });<\/script></body></html>`,
    );

  const win = window.open("", "_blank", "width=800,height=600");
  if (!win) return;
  win.document.write(doc);
  win.document.close();
}

// 2x4 Part label — landscape 4in x 2in. Pure HTML doc builder shared by print + preview.
// Optional fields (SO/Line/Rel, Rev, Item) are omitted when blank.
// Accepts pre-expanded rows so a part with unitTotal > 1 prints one label per selected unit.
function buildPart2x4Doc(
  rows: Part2x4Row[],
  qrs: Array<{ part: string; job: string; unit: string }>,
): string {
  const labels = rows.map((row, i) => {
    const p = row.part;
    const partQr = qrs[i]?.part || "";
    const jobQr = qrs[i]?.job || "";
    const unitQr = qrs[i]?.unit || "";
    const hasUnitCounter = !!(row.unitTotal && parseInt(row.unitTotal, 10) > 0 && row.unitNum);

    const jobVis  = p.jobNumber.trim() ? "" : "visibility:hidden;";
    const partVis = p.partNumber.trim() ? "" : "visibility:hidden;";
    const solVis  = p.soNumber.trim() ? "" : "visibility:hidden;";
    const itemVis = p.item.trim() ? "" : "visibility:hidden;";
    const revVis  = p.rev.trim() ? "" : "visibility:hidden;";
    const qtyVis  = p.qty.trim() ? "" : "visibility:hidden;";

    const jobQrHtml = jobQr
      ? `<div class="qr-box job-qr"><img src="${jobQr}" alt="Job QR"/></div>`
      : `<div class="qr-box job-qr"></div>`;
    const partQrHtml = partQr
      ? `<div class="qr-box part-qr"><img src="${partQr}" alt="Part QR"/></div>`
      : `<div class="qr-box part-qr"></div>`;
    const unitQrHtml = unitQr
      ? `<div class="qr-box unit-qr"><img src="${unitQr}" alt="Unit QR"/></div>`
      : "";

    const solBlock = `<div style="${solVis}"><span class="f-title">SO / Line / Rel</span>
         <div class="f-input sol-input">${escapeHtml(p.soNumber)}</div></div>`;
    const itemBlock = `<div style="${itemVis}"><span class="f-title" style="margin-top:3px;">Item</span>
         <div class="f-input item-input">${escapeHtml(p.item)}</div></div>`;
    const unitCounterBlock = hasUnitCounter
      ? `<div><span class="f-title" style="margin-top:3px;">Unit</span>
           <div class="f-input unit-input">${escapeHtml(row.unitNum)} of ${escapeHtml(row.unitTotal)}</div></div>`
      : "";
    const infoCol = `<div class="info-col">${solBlock}${itemBlock}${unitCounterBlock}</div>`;

    const revBlock = `<div style="${revVis}"><span class="f-title" style="margin-top:4px;">Rev</span>
         <div class="f-input rev-input">${escapeHtml(p.rev)}</div></div>`;
    const qtyCol = `<div class="qty-col">
        <div style="${qtyVis}"><span class="f-title">QTY</span>
        <div class="f-input qty-input">${escapeHtml(p.qty)}</div></div>
        ${revBlock}
        ${unitQrHtml}
      </div>`;

    return `
    <div class="label">
      <div class="top-section">
        <div class="job-col">
          <span class="f-title" style="${jobVis}">Job</span>
          <div class="f-input job-input" style="${jobVis}">${escapeHtml(p.jobNumber)}</div>
          ${jobQrHtml}
        </div>
        <div class="part-body">
          <div class="part-header-bar">
            <span class="f-title" style="${partVis}">Part</span>
            <div class="f-input part-input" style="font-size:13px; width:100%; border-bottom:none;${partVis}">${escapeHtml(p.partNumber)}</div>
          </div>
          <div class="part-lower">
            <div class="part-qr-col">${partQrHtml}</div>
            ${infoCol}
            ${qtyCol}
          </div>
        </div>
      </div>
      <div class="divider"></div>
      <div class="bottom-section">
        <div class="em-block">
          <span class="em-name">Electric<br>Mirror<span class="em-reg">&reg;</span></span>
        </div>
        <div class="warning-block">
          <span class="warn-title">&#9888; Warning:</span>
          <span class="warn-text">This product can expose you to chemicals including phthalates, which are known to the State of California to cause cancer and birth defects or other reproductive harm.</span>
          <div class="p65-row" style="margin-top:2px;">
            <span class="p65-arrow">&#10148;</span>
            <span class="p65-url">www.P65Warning.ca.gov</span>
          </div>
        </div>
        <div class="contact-block">
          <div class="contact-text">Electric Mirror LLC<br>6101 Associated Blvd, Suite 101, Everett WA 98203<br>Toll Free +1-888-218-9238<br>Support +1-844-264-3217</div>
          <div class="contact-url">www.electricmirror.com</div>
          <div class="deut-text">DEUT 8:18 , 2 COR 3:18</div>
          <div class="made-text">Made in America with U.S. and Global Components</div>
        </div>
      </div>
    </div>`;
  }).join("");

  return `<!doctype html><html><head><title>Part Label</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  @page { size: 4in 2in; margin: 0; }
  html, body { margin: 0; padding: 0; background: #fff; font-family: Arial, sans-serif; color: #000; -webkit-print-color-adjust: exact; print-color-adjust: exact; color-adjust: exact; }
  .label { width: 4in; height: 2in; background: #fff; display: flex; flex-direction: column; font-family: Arial, sans-serif; overflow: hidden; page-break-after: always; -webkit-print-color-adjust: exact; print-color-adjust: exact; color-adjust: exact; }
  .label:last-child { page-break-after: auto; }
  .top-section { display: flex; flex-direction: row; border-bottom: 2px solid #000; flex: 1; min-height: 0; }
  .job-col { display: flex; flex-direction: column; border-right: 2px solid #000; padding: 3px 5px 3px 5px; min-width: 72px; align-items: flex-start; gap: 3px; }
  .part-qr-col { display: flex; align-items: flex-end; justify-content: flex-start; padding: 0 4px 3px 4px; min-width: 70px; flex-shrink: 0; }
  .info-col { flex: 1; display: flex; flex-direction: column; padding: 2px 6px 3px 6px; gap: 1px; border-left: 2px solid #000; border-top: 2px solid #000; }
  .qty-col { display: flex; flex-direction: column; align-items: flex-end; justify-content: flex-start; padding: 3px 5px 3px 4px; border-left: 2px solid #000; border-top: 2px solid #000; min-width: 56px; gap: 3px; margin-left: auto; }
  .part-body { flex: 1; display: flex; flex-direction: column; border-left: 2px solid #000; min-width: 0; }
  .part-header-bar { padding: 3px 6px 2px 6px; display: flex; flex-direction: column; gap: 0; }
  .part-lower { flex: 1; display: flex; flex-direction: row; align-items: stretch; }
  .f-title { font-size: 8px; font-weight: 700; color: #444; text-transform: uppercase; letter-spacing: 0.4px; line-height: 1; display: block; }
  .f-input { border: none; border-bottom: 1.5px solid #000; font-family: Arial, sans-serif; background: transparent; color: #000; font-weight: 700; line-height: 1.1; width: 100%; display: block; min-height: 14px; }
  .f-input.job-input { font-size: 16px; width: 62px; border-bottom: none; }
  .f-input.part-input { font-size: 11px; }
  .f-input.sol-input { font-size: 14px; font-weight: 900; }
  .f-input.rev-input { font-size: 11px; width: 40px; text-align: right; }
  .f-input.item-input { font-size: 11px; }
  .f-input.unit-input { font-size: 11px; font-weight: 900; }
  .f-input.qty-input { font-size: 14px; width: 40px; text-align: right; }
  .qr-box { overflow: hidden; display: flex; align-items: center; justify-content: center; background: #fff; flex-shrink: 0; }
  .qr-box img { width: 100% !important; height: 100% !important; display: block; }
  .qr-box.job-qr { width: 58px; height: 58px; margin-top: auto; margin-bottom: 6px; }
  .qr-box.part-qr { width: 58px; height: 58px; margin-bottom: 6px; }
  .qr-box.unit-qr { width: 36px; height: 36px; margin-top: 2px; }
  .divider { border-top: 2px dashed #000; margin: 0; margin-top: auto; }
  .bottom-section { display: flex; flex-direction: row; align-items: stretch; min-height: 44px; }
  .em-block { background: #000 !important; display: flex; flex-direction: column; align-items: flex-start; justify-content: center; padding: 2px 6px; border-right: 2px solid #000; min-width: 86px; max-width: 86px; -webkit-print-color-adjust: exact; print-color-adjust: exact; color-adjust: exact; }
  .em-name { font-size: 11px; font-weight: 900; font-family: Arial Black, Arial, sans-serif; color: #fff !important; letter-spacing: 0.5px; line-height: 1.05; text-transform: uppercase; }
  .em-reg { font-size: 7px; vertical-align: super; }
  .warning-block { border-right: 2px solid #000; padding: 2px 4px; min-width: 110px; max-width: 110px; display: flex; flex-direction: column; }
  .warn-title { font-size: 7.5px; font-weight: 900; color: #000; text-transform: uppercase; }
  .warn-text { font-size: 5.5px; color: #000; line-height: 1.2; }
  .contact-block { flex: 1; padding: 2px 4px; display: flex; flex-direction: column; justify-content: flex-start; }
  .contact-text { font-size: 5.8px; color: #000; line-height: 1.25; }
  .contact-url { font-size: 6.5px; font-weight: 700; color: #000; }
  .p65-row { display: flex; align-items: center; gap: 2px; margin-top: 1px; }
  .p65-arrow { font-size: 7px; font-weight: 900; }
  .p65-url { font-size: 6px; font-weight: 700; color: #000; }
  .deut-text { font-size: 5.5px; color: #555; font-style: italic; margin-top: 0; }
  .made-text { font-size: 5.5px; color: #000; font-weight: 700; margin-top: 1px; line-height: 1.15; }
  @media print {
    html, body { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; }
    .label { transform: scale(0.90); transform-origin: center center; }
    .em-block { background: #000 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; color-adjust: exact; }
    .em-name { color: #fff !important; }
  }
</style></head><body>${labels}</body></html>`;
}

async function computePart2x4Qrs(rows: Part2x4Row[]): Promise<Array<{ part: string; job: string; unit: string }>> {
  return Promise.all(
    rows.map(async (r) => {
      const p = r.part;
      const job = p.jobNumber.trim();
      const unitPayload = job
        ? (r.unitNum ? `${job}-${r.unitNum}` : "")
        : (r.unitNum || "");
      return {
        part: p.partNumber.trim() ? await cachedQr(p.partNumber.trim()) : "",
        job: job ? await cachedQr(job) : "",
        unit: unitPayload ? await cachedQr(unitPayload) : "",
      };
    }),
  );
}

async function printPart2x4(parts: PartEntry[]) {
  const rows = expandParts2x4(parts);
  const qrs = await computePart2x4Qrs(rows);
  const doc = buildPart2x4Doc(rows, qrs).replace(
    "</body></html>",
    `<script>window.onload = () => { setTimeout(() => { window.print(); }, 200); }; window.addEventListener('afterprint', () => { window.close(); });<\/script></body></html>`,
  );
  const win = window.open("", "_blank", "width=800,height=600");
  if (!win) return;
  win.document.write(doc);
  win.document.close();
}

const PartLabelDialog = ({ size, open, onOpenChange }: { size: LabelSize; open: boolean; onOpenChange: (o: boolean) => void }) => {
  const [parts, setParts] = useState<PartEntry[]>([emptyPart()]);
  const [missing, setMissing] = useState<Set<string>>(new Set());
  const [previewHtml, setPreviewHtml] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (size === "4x6") {
        const qrs = await computePartQrs(parts);
        if (cancelled) return;
        setPreviewHtml(buildPart4x6Doc(parts, qrs));
      } else {
        const rows = expandParts2x4(parts);
        const qrs = await computePart2x4Qrs(rows);
        if (cancelled) return;
        setPreviewHtml(buildPart2x4Doc(rows, qrs));
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
      // 4x6: Part Number, Qty, and Description are required. Other blank fields are omitted on print.
      const m = new Set<string>();
      parts.forEach((p, i) => {
        if (!p.partNumber.trim()) m.add(`partNumber-${i}`);
        if (!p.qty.trim()) m.add(`qty-${i}`);
        if (!p.description.trim()) m.add(`description-${i}`);
      });
      setMissing(m);
      if (m.size) return;
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

    await printPart2x4(parts);
    setParts([emptyPart()]);
    onOpenChange(false);
  };

  const handleClose = (val: boolean) => {
    if (!val) {
      setParts([emptyPart()]);
      setMissing(new Set());
    }
    onOpenChange(val);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="w-[96vw] max-w-[1800px] max-h-[95vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Part Label</DialogTitle>
        </DialogHeader>
        <form
          className="contents"
          id="part-label-form"
          name="part-label"
          autoComplete="on"
          onKeyDown={blockEnterSubmit}
          onSubmit={(e) => { e.preventDefault(); handlePrint(); }}
        >
        <div className="grid grid-cols-[460px_1fr] gap-6 flex-1 overflow-hidden">
          <div className="space-y-6 overflow-y-auto px-2 py-1">
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
              {size === "4x6" && (
                <>
                <div className="space-y-2">
                  <Label>Job Number</Label>
                  <Input name="jobNumber" autoComplete="on" value={p.jobNumber} onChange={(e) => updatePart(i, { jobNumber: e.target.value })} />
                  <p className="text-xs text-muted-foreground">Optional. Leave blank to omit from the printed label.</p>
                </div>
                <div className="space-y-2">
                  <Label>Qty <Req /></Label>
                  <Input
                    name="qty"
                    autoComplete="on"
                    type="number"
                    value={p.qty}
                    onChange={(e) => updatePart(i, { qty: e.target.value })}
                    className={cls(missing.has(`qty-${i}`) && invalidCls)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Rev</Label>
                  <Input
                    name="rev"
                    autoComplete="on"
                    value={p.rev}
                    onChange={(e) => updatePart(i, { rev: e.target.value })}
                    placeholder="A"
                  />
                  <p className="text-xs text-muted-foreground">Optional. Leave blank to omit from the printed label.</p>
                </div>
                <div className="space-y-2">
                  <Label>Part Number <Req /></Label>
                  <Input
                    name="partNumber"
                    autoComplete="on"
                    value={p.partNumber}
                    onChange={(e) => updatePart(i, { partNumber: e.target.value })}
                    className={cls(missing.has(`partNumber-${i}`) && invalidCls)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Description <Req /></Label>
                  <Textarea
                    name="description"
                    autoComplete="on"
                    value={p.description}
                    onChange={(e) => updatePart(i, { description: e.target.value })}
                    placeholder="Optional description for this part"
                    rows={2}
                    className={cls(missing.has(`description-${i}`) && invalidCls)}
                  />
                </div>
                </>
              )}
              {size === "2x4" && (
                <>
                  <div className="space-y-2">
                    <Label>Job Number</Label>
                    <Input
                      name="jobNumber"
                      autoComplete="on"
                      value={p.jobNumber}
                      onChange={(e) => updatePart(i, { jobNumber: e.target.value })}
                    />
                    <p className="text-xs text-muted-foreground">Optional. Leave blank to omit from the printed label.</p>
                  </div>
                  <div className="space-y-2">
                    <Label>Part Number <Req /></Label>
                    <Input
                      name="partNumber"
                      autoComplete="on"
                      value={p.partNumber}
                      onChange={(e) => updatePart(i, { partNumber: e.target.value })}
                      className={cls(missing.has(`partNumber-${i}`) && invalidCls)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Qty <Req /></Label>
                    <Input
                      name="qty"
                      autoComplete="on"
                      type="number"
                      value={p.qty}
                      onChange={(e) => updatePart(i, { qty: e.target.value })}
                      className={cls(missing.has(`qty-${i}`) && invalidCls)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Sales Order / Line / Release</Label>
                    <Input
                      name="soNumber"
                      autoComplete="on"
                      value={p.soNumber}
                      onChange={(e) => updatePart(i, { soNumber: e.target.value })}
                      placeholder="455100/2/1"
                    />
                    <p className="text-xs text-muted-foreground">Optional. Leave blank to omit from the printed label.</p>
                  </div>
                  <div className="space-y-2">
                    <Label>Rev</Label>
                    <Input
                      name="rev"
                      autoComplete="on"
                      value={p.rev}
                      onChange={(e) => updatePart(i, { rev: e.target.value })}
                      placeholder="A"
                    />
                    <p className="text-xs text-muted-foreground">Optional. Leave blank to omit from the printed label.</p>
                  </div>
                  <div className="space-y-2">
                    <Label>Item</Label>
                    <Input
                      name="item"
                      autoComplete="on"
                      value={p.item}
                      onChange={(e) => updatePart(i, { item: e.target.value })}
                      placeholder="Mirror"
                    />
                    <p className="text-xs text-muted-foreground">Optional. Leave blank to omit from the printed label.</p>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label>Unit #</Label>
                      <Input
                        type="number"
                        min={1}
                        value={p.unitNum || ""}
                        onChange={(e) => updatePart(i, { unitNum: e.target.value })}
                        placeholder="1"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Total Units</Label>
                      <Input
                        type="number"
                        min={1}
                        value={p.unitTotal || ""}
                        onChange={(e) => {
                          const v = e.target.value;
                          // Reset selection when total changes.
                          updatePart(i, { unitTotal: v, selectedUnits: undefined });
                        }}
                        placeholder="1"
                      />
                    </div>
                  </div>
                  {(() => {
                    const totalN = Math.max(0, parseInt(p.unitTotal || "0", 10) || 0);
                    if (totalN <= 1) return null;
                    const selected = p.selectedUnits === undefined
                      ? Array.from({ length: totalN }, (_, k) => k + 1)
                      : p.selectedUnits;
                    const allChecked = selected.length === totalN;
                    const toggle = (n: number) => {
                      const cur = new Set(selected);
                      if (cur.has(n)) cur.delete(n); else cur.add(n);
                      const arr = [...cur].sort((a, b) => a - b);
                      updatePart(i, { selectedUnits: arr.length === totalN ? undefined : arr });
                    };
                    return (
                      <div className="space-y-2 rounded-md border border-border p-3">
                        <div className="flex items-center justify-between">
                          <Label className="text-xs uppercase tracking-wide">Select units to print</Label>
                          <button
                            type="button"
                            className="text-xs text-ring underline"
                            onClick={() => updatePart(i, { selectedUnits: allChecked ? [] : undefined })}
                          >
                            {allChecked ? "Deselect all" : "Select all"}
                          </button>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {Array.from({ length: totalN }, (_, k) => k + 1).map((n) => {
                            const checked = selected.includes(n);
                            return (
                              <label
                                key={n}
                                className={cls(
                                  "flex items-center gap-1 px-2 py-1 rounded border cursor-pointer text-xs",
                                  checked ? "border-ring bg-ring/10" : "border-border",
                                )}
                              >
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  onChange={() => toggle(n)}
                                />
                                <span>#{n}</span>
                              </label>
                            );
                          })}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Printing {selected.length} of {totalN} labels.
                        </p>
                      </div>
                    );
                  })()}
                </>
              )}
            </div>
          ))}
          {size === "4x6" && parts.length < 2 && (
            <Button type="button" variant="outline" size="sm" onClick={addPart}>
              <Plus className="h-4 w-4 mr-1" /> Add another part
            </Button>
          )}
          </div>
          <PreviewPane html={previewHtml} size={size} landscape={size === "2x4"} />
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => handleClose(false)}>Cancel</Button>
          <Button type="submit" form="part-label-form">Print</Button>
        </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

// ----------------- Scan Picklist -----------------
const ScanPicklistDialog = ({
  open,
  onOpenChange,
  defaultSize,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  defaultSize: LabelSize;
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>("");
  const [scanning, setScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [printing, setPrinting] = useState(false);
  const [printingUnit, setPrintingUnit] = useState(false);
  const [parts, setParts] = useState<PartEntry[]>([]);
  const [size, setSize] = useState<LabelSize>(defaultSize);
  const [missing, setMissing] = useState<Set<string>>(new Set());
  const [packUnit, setPackUnit] = useState<{
    soNumber: string;
    jobNumber: string;
    project: string;
    unitType: string;
    unitNum: string;
    unitTotal: string;
    needByDate: string;
    priority: string;
  } | null>(null);
  const [packUnitMissing, setPackUnitMissing] = useState<Set<string>>(new Set());
  const cameraRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) setSize(defaultSize);
  }, [open, defaultSize]);

  useEffect(() => {
    if (!file) {
      setPreviewUrl("");
      return;
    }
    if (file.type.startsWith("image/")) {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    }
    setPreviewUrl("");
  }, [file]);

  const reset = () => {
    setFile(null);
    setPreviewUrl("");
    setParts([]);
    setMissing(new Set());
    setPackUnit(null);
    setPackUnitMissing(new Set());
  };

  const handleClose = (val: boolean) => {
    if (!val) reset();
    onOpenChange(val);
  };

  const fileToBase64 = (f: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        const b64 = result.split(",")[1] ?? "";
        resolve(b64);
      };
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(f);
    });

  const handleScan = async () => {
    if (!file) return;
    setScanning(true);
    setScanProgress(2);
    // Smooth asymptotic ramp toward an evolving target so the bar always shows motion.
    let target = 45;
    const ramp = setInterval(() => {
      setScanProgress((p) => (p < target ? p + Math.max(0.5, (target - p) * 0.08) : p));
    }, 120);
    try {
      const imageBase64 = await fileToBase64(file);
      const invoke = () =>
        supabase.functions.invoke("scan-picklist", {
          body: { imageBase64, mimeType: file.type || "image/jpeg" },
        });
      const { data: data1, error: err1 } = await invoke();
      if (err1) throw err1;
      let incoming = (data1?.parts ?? []) as PartEntry[];
      let pu = (data1?.packUnit ?? {}) as any;

      // Determine if anything is missing -> do exactly one second pass and merge.
      const partMissing = (p: PartEntry) =>
        !p.partNumber.trim() || !p.qty.trim() || !p.description.trim() ||
        !p.jobNumber.trim() || !p.soNumber.trim();
      const puMissing = !pu?.salesOrder || !pu?.project || !pu?.unitIndicator || !pu?.needByDate;
      const needsSecondPass = puMissing || incoming.some(partMissing);
      if (needsSecondPass) {
        setScanProgress(55);
        target = 92;
        const { data: data2 } = await invoke();
        if (data2) {
          const inc2 = (data2.parts ?? []) as PartEntry[];
          // Merge by index: fill empty fields from the second pass.
          incoming = incoming.map((p, i) => {
            const q = inc2[i];
            if (!q) return p;
            const out: any = { ...p };
            for (const k of Object.keys(p) as (keyof PartEntry)[]) {
              if (!String(out[k] ?? "").trim() && String((q as any)[k] ?? "").trim()) {
                out[k] = (q as any)[k];
              }
            }
            return out;
          });
          // Append any extra rows the second pass found.
          if (inc2.length > incoming.length) incoming = [...incoming, ...inc2.slice(incoming.length)];
          const pu2 = (data2.packUnit ?? {}) as any;
          pu = {
            salesOrder: pu?.salesOrder || pu2?.salesOrder || "",
            project: pu?.project || pu2?.project || "",
            unitIndicator: pu?.unitIndicator || pu2?.unitIndicator || "",
            needByDate: pu?.needByDate || pu2?.needByDate || "",
          };
        }
      }

      if (!incoming.length) {
        toast.error("No parts detected. Try a clearer photo.");
        return;
      }
      setParts(incoming);
      setMissing(new Set());
      const ind = String(pu?.unitIndicator ?? "").toLowerCase();
      const unitType = ind.includes("c-pallet")
        ? "C-PALLET"
        : /(^|[^a-z])f([^a-z]|$)/.test(ind)
        ? "CRATE"
        : "BOX";
      const soNumber = String(pu?.salesOrder ?? "");
      const project = String(pu?.project ?? "");
      const rawNeedBy = String(pu?.needByDate ?? "");
      const needByDate = (() => {
        if (!rawNeedBy.trim()) return "";
        const d = parse(rawNeedBy, "MM/dd/yyyy", new Date());
        if (isValid(d)) return format(d, "MM/dd");
        const d2 = parse(rawNeedBy, "M/d/yyyy", new Date());
        if (isValid(d2)) return format(d2, "MM/dd");
        return rawNeedBy;
      })();
      setPackUnit({ soNumber, jobNumber: "", project, unitType, unitNum: "1", unitTotal: "1", needByDate, priority: "" });
      const pm = new Set<string>();
      // SO is required only if Job is not provided (and vice versa). Initially job is empty, so flag SO if missing.
      if (!soNumber.trim()) pm.add("soNumber");
      if (!project.trim()) pm.add("project");
      if (!String(pu?.unitIndicator ?? "").trim()) pm.add("unitType");
      if (!needByDate.trim()) pm.add("needByDate");
      setPackUnitMissing(pm);
      toast.success(`Found ${incoming.length} part${incoming.length === 1 ? "" : "s"}.`);
    } catch (e: any) {
      const msg = e?.message || "Scan failed";
      if (msg.includes("429")) toast.error("Rate limit hit. Try again in a moment.");
      else if (msg.includes("402")) toast.error("AI credits exhausted. Add credits in Workspace settings.");
      else toast.error(msg);
    } finally {
      clearInterval(ramp);
      setScanProgress(100);
      setScanning(false);
      setTimeout(() => setScanProgress(0), 500);
    }
  };

  const updatePart = (i: number, patch: Partial<PartEntry>) =>
    setParts((prev) => prev.map((p, idx) => (idx === i ? { ...p, ...patch } : p)));

  const removePart = (i: number) => setParts((prev) => prev.filter((_, idx) => idx !== i));

  const addPart = () => setParts((prev) => [...prev, emptyPart()]);

  const labelCount = useMemo(() => {
    if (!parts.length) return 0;
    const consolidated = consolidateParts(parts);
    return computeLabelCount(consolidated, size);
  }, [parts, size]);


  const handlePrint = async () => {
    const m = new Set<string>();
    const consolidated = consolidateParts(parts);
    consolidated.forEach((p, i) => {
      if (!p.partNumber.trim()) m.add(`partNumber-${i}`);
      if (!p.qty.trim()) m.add(`qty-${i}`);
      if (size === "4x6") {
        if (!p.description.trim()) m.add(`description-${i}`);
      }
    });
    setMissing(m);
    if (m.size) {
      toast.error("Fill in highlighted required fields.");
      return;
    }
    setPrinting(true);
    try {
      if (size === "2x4") await printPart2x4(consolidated);
      else await printPart4x6Batched(consolidated, 2);
    } finally {
      setPrinting(false);
    }
  };

  const handlePrintPackUnit = async () => {
    if (!packUnit) return;
    setPrintingUnit(true);
    try {
      const opts = {
        orderNumber: packUnit.soNumber,
        jobNumber: packUnit.jobNumber,
        project: packUnit.project,
        unitType: packUnit.unitType,
        unitNum: packUnit.unitNum || "1",
        unitTotal: packUnit.unitTotal || "1",
        date: packUnit.needByDate,
        area: "SHIPPING",
        status: size === "4x6" ? (packUnit.priority || "") : "",
      };
      if (size === "4x6") await printUnit4x6(opts);
      else await printUnit2x4(opts);
    } finally {
      setPrintingUnit(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="w-[96vw] max-w-[1600px] max-h-[95vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ScanLine className="h-5 w-5" /> Scan Picklist
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-[360px_1fr] gap-6 flex-1 overflow-hidden">
          {/* Capture / preview */}
          <div className="space-y-3 overflow-y-auto px-1">
            <div className="text-sm font-semibold text-ring uppercase tracking-wide">1. Capture</div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1 gap-2" onClick={() => cameraRef.current?.click()}>
                <Camera className="h-4 w-4" /> Take Photo
              </Button>
              <Button variant="outline" className="flex-1 gap-2" onClick={() => fileRef.current?.click()}>
                <Upload className="h-4 w-4" /> Upload
              </Button>
            </div>
            <input
              ref={cameraRef}
              type="file"
              accept="image/*"
              capture="environment"
              hidden
              onChange={(e) => { setFile(e.target.files?.[0] ?? null); setParts([]); }}
            />
            <input
              ref={fileRef}
              type="file"
              accept="image/*,application/pdf"
              hidden
              onChange={(e) => { setFile(e.target.files?.[0] ?? null); setParts([]); }}
            />

            <div className="relative border border-border rounded-md bg-card aspect-[3/4] flex items-center justify-center overflow-hidden">
              {previewUrl ? (
                <img src={previewUrl} alt="Picklist preview" className="max-w-full max-h-full object-contain" />
              ) : file ? (
                <div className="flex flex-col items-center gap-2 p-4 text-center">
                  <FileText className="h-16 w-16 text-ring" />
                  <div className="text-xs text-muted-foreground break-all">{file.name}</div>
                  <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
                    Preview not available
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-3 p-4 text-center">
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => cameraRef.current?.click()}
                      className="flex flex-col items-center gap-1 text-muted-foreground hover:text-ring transition-colors"
                      aria-label="Take photo"
                    >
                      <Camera className="h-10 w-10" />
                      <span className="text-[10px] uppercase tracking-wide">Photo</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => fileRef.current?.click()}
                      className="flex flex-col items-center gap-1 text-muted-foreground hover:text-ring transition-colors"
                      aria-label="Upload file"
                    >
                      <Upload className="h-10 w-10" />
                      <span className="text-[10px] uppercase tracking-wide">Upload</span>
                    </button>
                  </div>
                  <div className="text-xs text-muted-foreground">No file selected</div>
                </div>
              )}
              {file && (
                <button
                  type="button"
                  onClick={() => { setFile(null); setParts([]); setPackUnit(null); }}
                  className="absolute top-1 right-1 h-6 w-6 rounded-full bg-background/90 border border-border flex items-center justify-center text-muted-foreground hover:text-destructive transition-colors"
                  aria-label="Remove scanned file"
                  title="Remove file"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            <Button
              type="button"
              className="w-full gap-2 relative overflow-hidden"
              disabled={!file || scanning}
              onClick={handleScan}
            >
              {scanning && (
                <span
                  className="absolute inset-y-0 left-0 bg-ring/40 transition-[width] duration-150 ease-out pointer-events-none"
                  style={{ width: `${Math.min(100, Math.max(0, scanProgress))}%` }}
                  aria-hidden="true"
                />
              )}
              <span className="relative z-10 inline-flex items-center gap-2">
                {scanning ? <Loader2 className="h-4 w-4 animate-spin" /> : <ScanLine className="h-4 w-4" />}
                {scanning ? `Scanning… ${Math.round(scanProgress)}%` : parts.length ? "Re-scan" : "Scan Picklist"}
              </span>
            </Button>
          </div>

          {/* Review */}
          <div className="flex flex-col overflow-hidden">
            <div className="flex items-center justify-between mb-3">
              <div className="text-sm font-semibold text-ring uppercase tracking-wide">
                2. Review ({parts.length} {parts.length === 1 ? "part" : "parts"})
              </div>
              <div className="inline-flex items-center rounded-lg border border-border bg-card p-1 gap-1">
                {(["2x4", "4x6"] as LabelSize[]).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setSize(s)}
                    className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${
                      size === s ? "bg-ring text-accent" : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {s === "2x4" ? '2" × 4"' : '4" × 6"'}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex-1 overflow-auto border border-border rounded-md">
              {parts.length === 0 ? (
                <div className="h-full flex items-center justify-center text-sm text-muted-foreground p-8 text-center">
                  Capture or upload a picklist, then click <span className="mx-1 font-semibold">Scan Picklist</span> to extract parts.
                </div>
              ) : (
                <table className="w-full text-xs">
                  <thead className="bg-muted sticky top-0">
                    <tr className="text-left">
                      <th className="p-2">Part # <Req /></th>
                      <th className="p-2 w-16">Qty <Req /></th>
                      <th className="p-2 w-28">Job #</th>
                      <th className="p-2 w-28">SO/Line/Rel</th>
                      <th className="p-2">Description {size === "4x6" && <Req />}</th>
                      <th className="p-2 w-16">Rev</th>
                      <th className="p-2 w-16">Item</th>
                      <th className="p-2 w-10"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {parts.map((p, i) => (
                      <tr key={i} className="border-t border-border align-top">
                        <td className="p-1">
                          <Input
                            name="partNumber"
                            autoComplete="on"
                            value={p.partNumber}
                            onChange={(e) => updatePart(i, { partNumber: e.target.value })}
                            className={cls("h-8 text-xs", missing.has(`partNumber-${i}`) && invalidCls)}
                          />
                        </td>
                        <td className="p-1">
                          <Input
                            name="qty"
                            autoComplete="on"
                            value={p.qty}
                            onChange={(e) => updatePart(i, { qty: e.target.value })}
                            className={cls("h-8 text-xs", missing.has(`qty-${i}`) && invalidCls)}
                          />
                        </td>
                        <td className="p-1">
                          <Input
                            name="jobNumber"
                            autoComplete="on"
                            value={p.jobNumber}
                            onChange={(e) => updatePart(i, { jobNumber: e.target.value })}
                            className="h-8 text-xs"
                          />
                        </td>
                        <td className="p-1">
                          <Input
                            name="soNumber"
                            autoComplete="on"
                            value={p.soNumber}
                            onChange={(e) => updatePart(i, { soNumber: e.target.value })}
                            className="h-8 text-xs"
                          />
                        </td>
                        <td className="p-1">
                          <Input
                            name="description"
                            autoComplete="on"
                            value={p.description}
                            onChange={(e) => updatePart(i, { description: e.target.value })}
                            className={cls("h-8 text-xs", missing.has(`description-${i}`) && invalidCls)}
                          />
                        </td>
                        <td className="p-1">
                          <Input
                            name="rev"
                            autoComplete="on"
                            value={p.rev}
                            onChange={(e) => updatePart(i, { rev: e.target.value })}
                            className="h-8 text-xs"
                          />
                        </td>
                        <td className="p-1">
                          <Input
                            name="item"
                            autoComplete="on"
                            value={p.item}
                            onChange={(e) => updatePart(i, { item: e.target.value })}
                            className="h-8 text-xs"
                          />
                        </td>
                        <td className="p-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => removePart(i)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {parts.length > 0 && (
              <div className="mt-2">
                <Button type="button" variant="outline" size="sm" onClick={addPart} className="gap-2">
                  <Plus className="h-3 w-3" /> Add Row
                </Button>
              </div>
            )}

            {packUnit && (
              <div className="mt-3 border border-border rounded-md p-3 bg-card">
                <div className="flex items-center gap-2 mb-2">
                  <Package className="h-4 w-4 text-ring" />
                  <div className="text-xs font-semibold uppercase tracking-wide text-ring">Pack Unit</div>
                </div>
                 <div className={cls("grid gap-2", size === "4x6" ? "grid-cols-8" : "grid-cols-7")}>
                  <div className="space-y-1">
                    <Label className="text-[10px] uppercase text-muted-foreground">SO #</Label>
                    <Input
                      name="soNumber"
                      autoComplete="on"
                      value={packUnit.soNumber}
                      onChange={(e) => {
                        const v = e.target.value;
                        setPackUnit({ ...packUnit, soNumber: v });
                        setPackUnitMissing((s) => {
                          const n = new Set(s);
                          if (v.trim() || packUnit.jobNumber.trim()) { n.delete("soNumber"); n.delete("jobNumber"); }
                          return n;
                        });
                      }}
                      className={cls("h-8 text-xs", packUnitMissing.has("soNumber") && invalidCls)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] uppercase text-muted-foreground">Job #</Label>
                    <Input
                      name="jobNumber"
                      autoComplete="on"
                      value={packUnit.jobNumber}
                      onChange={(e) => {
                        const v = e.target.value;
                        setPackUnit({ ...packUnit, jobNumber: v });
                        setPackUnitMissing((s) => {
                          const n = new Set(s);
                          if (v.trim() || packUnit.soNumber.trim()) { n.delete("soNumber"); n.delete("jobNumber"); }
                          return n;
                        });
                      }}
                      className={cls("h-8 text-xs", packUnitMissing.has("jobNumber") && invalidCls)}
                    />
                  </div>
                  <div className="space-y-1 col-span-2">
                    <Label className="text-[10px] uppercase text-muted-foreground">Project</Label>
                    <Input
                      name="project"
                      autoComplete="on"
                      value={packUnit.project}
                      onChange={(e) => { setPackUnit({ ...packUnit, project: e.target.value }); setPackUnitMissing((s) => { const n = new Set(s); n.delete("project"); return n; }); }}
                      className={cls("h-8 text-xs", packUnitMissing.has("project") && invalidCls)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] uppercase text-muted-foreground">Unit</Label>
                    <Select value={packUnit.unitType} onValueChange={(v) => { setPackUnit({ ...packUnit, unitType: v }); setPackUnitMissing((s) => { const n = new Set(s); n.delete("unitType"); return n; }); }}>
                      <SelectTrigger className={cls("h-8 text-xs", packUnitMissing.has("unitType") && invalidCls)}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="BOX">BOX</SelectItem>
                        <SelectItem value="CRATE">CRATE</SelectItem>
                        <SelectItem value="PALLET">PALLET</SelectItem>
                        <SelectItem value="S-PALLET">S-PALLET</SelectItem>
                        <SelectItem value="C-PALLET">C-PALLET</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] uppercase text-muted-foreground">N of M</Label>
                    <div className="flex items-center gap-1">
                      <Input
                        name="unitNum"
                        autoComplete="on"
                        value={packUnit.unitNum}
                        onChange={(e) => setPackUnit({ ...packUnit, unitNum: e.target.value })}
                        className="h-8 text-xs w-12 px-2"
                      />
                      <span className="text-xs text-muted-foreground">/</span>
                      <Input
                        name="unitTotal"
                        autoComplete="on"
                        value={packUnit.unitTotal}
                        onChange={(e) => setPackUnit({ ...packUnit, unitTotal: e.target.value })}
                        className="h-8 text-xs w-12 px-2"
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] uppercase text-muted-foreground">Need By</Label>
                    <Input
                      name="needByDate"
                      autoComplete="on"
                      value={packUnit.needByDate}
                      onChange={(e) => { setPackUnit({ ...packUnit, needByDate: e.target.value }); setPackUnitMissing((s) => { const n = new Set(s); n.delete("needByDate"); return n; }); }}
                      className={cls("h-8 text-xs", packUnitMissing.has("needByDate") && invalidCls)}
                      placeholder="Ship-by date"
                    />
                  </div>
                  {size === "4x6" && (
                    <div className="space-y-1">
                      <Label className="text-[10px] uppercase text-muted-foreground">Priority</Label>
                      <Select
                        value={packUnit.priority || "__none"}
                        onValueChange={(v) => setPackUnit({ ...packUnit, priority: v === "__none" ? "" : v })}
                      >
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue placeholder="None" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none">None</SelectItem>
                          <SelectItem value="TOP">TOP</SelectItem>
                          <SelectItem value="HOT">HOT</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleClose(false)}>Cancel</Button>
          <Button
            variant="secondary"
            onClick={handlePrintPackUnit}
            disabled={printingUnit || !packUnit || (!packUnit.soNumber.trim() && !packUnit.jobNumber.trim())}
          >
            {printingUnit ? "Printing…" : "Print Pack Unit Label"}
          </Button>
          <Button onClick={handlePrint} disabled={parts.length === 0 || printing}>
            {printing ? "Printing…" : `Print ${labelCount} Part Label${labelCount === 1 ? "" : "s"}`}
          </Button>
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
  jobNumber: string;
  project: string;
  unitType: string;
  unitNum: string;
  unitTotal: string;
  date: string;
  area: string;
  status: string;
  orderQr?: string;
  jobQr?: string;
  projectQr?: string;
};
function buildUnit4x6Doc(opts: Unit4x6Opts): string {
  const { orderNumber, jobNumber, project, unitType, unitNum, unitTotal, date, area, status, orderQr, jobQr, projectQr } = opts;

  // When area is Mainline or Chassisline, swap Sales Order ↔ Job (titles + inputs + QRs).
  const areaUpper = area.trim().toUpperCase();
  const swap = areaUpper === "MAINLINE" || areaUpper === "CHASSISLINE";
  const topTitle    = swap ? "Job" : "Sales Order";
  const topValue    = swap ? jobNumber : orderNumber;
  const topQr       = swap ? jobQr : orderQr;
  const secondTitle = swap ? "Sales Order" : "Job";
  const secondValue = swap ? orderNumber : jobNumber;
  const secondQr    = swap ? orderQr : jobQr;

  const topVis     = topValue.trim() ? "" : "visibility:hidden;";
  const secondVis  = secondValue.trim() ? "" : "visibility:hidden;";
  const projectVis = project.trim() ? "" : "visibility:hidden;";
  const unitVis    = unitType.trim() ? "" : "visibility:hidden;";
  const ofVis      = (unitNum.trim() || unitTotal.trim()) ? "" : "visibility:hidden;";
  const dateVis    = date.trim() ? "" : "visibility:hidden;";
  const areaVis    = area.trim() ? "" : "visibility:hidden;";
  const statusVis  = status.trim() ? "" : "visibility:hidden;";

  const orderRow = `<div class="order-row" style="${topVis}"><span class="section-title">${escapeHtml(topTitle)}</span><div class="order-input-row"><div class="order-input">${escapeHtml(topValue)}</div>${topQr ? `<div class="qr-box"><img src="${topQr}" alt="QR"/></div>` : `<div class="qr-box"></div>`}</div></div>`;
  const jobRow = `<div class="job-row" style="${secondVis}"><span class="section-title">${escapeHtml(secondTitle)}</span><div class="job-input-row"><div class="job-input">${escapeHtml(secondValue)}</div>${secondQr ? `<div class="qr-box"><img src="${secondQr}" alt="QR"/></div>` : `<div class="qr-box"></div>`}</div></div>`;
  const projectRow = `<div class="project-row" style="${projectVis}"><span class="section-title">Project</span><div class="project-input-row"><div class="project-input">${escapeHtml(project)}</div></div></div>`;

  const unitCell = `<div class="meta-cell unit-cell" style="${unitVis}"><span class="meta-label">Unit:</span><span class="unit-select">${escapeHtml(unitType)}</span></div>`;
  const ofCell = `<div class="meta-cell of-cell" style="${ofVis}">
         <span class="meta-input num-input">${escapeHtml(unitNum)}</span>
         <span class="of-word">of</span>
         <span class="meta-input total-input">${escapeHtml(unitTotal)}</span>
       </div>`;
  const dateCell = `<div class="meta-cell date-cell" style="${dateVis}"><span class="meta-label">Date:</span><span class="meta-input date-input">${escapeHtml(date)}</span></div>`;
  const metaRow = `<div class="meta-row">${unitCell}${ofCell}${dateCell}</div>`;

  const areaCell = `<div class="area-cell" style="${areaVis}"><span class="status-label-sm">Area</span><span class="area-input">${escapeHtml(area)}</span></div>`;
  const statusCell = `<div class="status-cell" style="${statusVis}"><span class="status-label-sm">Status</span><span class="status-input">${escapeHtml(status)}</span></div>`;
  const bottomRow = `<div class="bottom-row">${areaCell}${statusCell}</div>`;

  return `<!doctype html><html><head><title>Unit Label</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  @page { size: 6in 4in landscape; margin: 0; }
  html, body { margin: 0; padding: 0; background: #fff; font-family: Arial, sans-serif; color: #000; }
  .label { width: 6in; height: 4in; display: flex; flex-direction: column; overflow: hidden; }
  .section-title { font-size: 16px; font-weight: 700; color: #555; text-transform: uppercase; letter-spacing: 1px; line-height: 1; margin-bottom: 2px; }
  .order-row { border-bottom: 3px solid #000; padding: 4px 14px 3px 14px; display: flex; flex-direction: column; }
  .order-input-row { display: flex; align-items: center; gap: 10px; justify-content: space-between; }
  .order-input { font-size: 64px; font-weight: 900; font-family: "Arial Black", Arial, sans-serif; line-height: 1.0; color: #000; }
  .job-row { border-bottom: 3px solid #000; padding: 4px 14px 3px 14px; display: flex; flex-direction: column; }
  .job-input-row { display: flex; align-items: center; gap: 10px; justify-content: space-between; }
  .job-input { flex: 1; min-width: 0; font-size: 42px; font-weight: 900; font-family: "Arial Black", Arial, sans-serif; line-height: 1.0; color: #000; }
  .project-row { border-bottom: 3px solid #000; padding: 4px 14px 6px 14px; display: flex; flex-direction: column; }
  .project-input-row { display: flex; align-items: flex-start; gap: 10px; }
  .project-input { flex: 1; min-width: 0; font-size: 36px; font-weight: 700; line-height: 1.15; word-break: break-word; }
  .qr-box { width: 64px; height: 64px; flex-shrink: 0; background: #fff; display: flex; align-items: center; justify-content: center; }
  .qr-box img { width: 100%; height: 100%; }
  .meta-row { border-bottom: 3px solid #000; display: flex; align-items: stretch; }
  .meta-cell { display: flex; align-items: center; padding: 6px 10px; gap: 6px; }
  .meta-cell.unit-cell { flex: 0 0 auto; border-right: 2px solid #000; gap: 8px; }
  .meta-cell.of-cell   { flex: 1; border-right: 2px solid #000; gap: 6px; }
  .meta-cell.date-cell { flex: 0 0 auto; }
  .meta-label { font-size: 20px; font-weight: 700; white-space: nowrap; }
  .unit-select { font-size: 22px; font-weight: 700; border-bottom: 2.5px solid #000; padding-right: 4px; }
  .meta-input { font-size: 22px; font-weight: 700; border-bottom: 2px solid #000; text-align: center; display: inline-block; min-height: 26px; padding: 0 4px; }
  .meta-input.num-input { min-width: 52px; }
  .meta-input.total-input { min-width: 52px; }
  .meta-input.date-input { min-width: 80px; letter-spacing: 1px; }
  .of-word { font-size: 22px; font-weight: 700; }
  .bottom-row { display: flex; align-items: stretch; min-height: 62px; flex: 1; }
  .area-cell { flex: 1; display: flex; flex-direction: column; align-items: flex-start; justify-content: center; padding: 3px 10px; border-right: 2px solid #000; }
  .area-input { width: 100%; font-size: 26px; font-weight: 900; font-family: "Arial Black", Arial, sans-serif; text-transform: uppercase; color: #000; }
  .status-cell { width: 240px; display: flex; flex-direction: column; align-items: flex-start; justify-content: center; padding: 3px 8px; }
  .status-label-sm { font-size: 10px; font-weight: 700; color: #555; letter-spacing: 0.6px; text-transform: uppercase; line-height: 1; margin-bottom: 0; }
  .status-input { width: 100%; font-size: 26px; font-weight: 900; font-family: "Arial Black", Arial, sans-serif; text-transform: uppercase; color: #000; }
  @media print { .label { transform: scale(0.95); transform-origin: center center; } }
</style></head><body>
<div class="label">
  ${orderRow}
  ${jobRow}
  ${projectRow}
  ${metaRow}
  ${bottomRow}
</div>
</body></html>`;
}

async function printUnit4x6(opts: Unit4x6Opts) {
  const [orderQr, jobQr, projectQr] = await Promise.all([
    opts.orderNumber.trim() ? cachedQr(opts.orderNumber.trim()) : Promise.resolve(""),
    opts.jobNumber.trim() ? cachedQr(opts.jobNumber.trim()) : Promise.resolve(""),
    opts.project.trim() ? cachedQr(opts.project.trim()) : Promise.resolve(""),
  ]);
  const doc = buildUnit4x6Doc({ ...opts, orderQr, jobQr, projectQr }).replace(
    "</body></html>",
    `<script>window.onload = () => { setTimeout(() => { window.print(); }, 200); }; window.addEventListener('afterprint', () => { window.close(); });<\/script></body></html>`,
  );
  const win = window.open("", "_blank", "width=800,height=600");
  if (!win) return;
  win.document.write(doc);
  win.document.close();
}

// 2x4 Pack Unit label body builder (used by print + preview).
// 2x4 Pack Unit label — mirrors the 4x6 unit label layout (SO Number, Project,
// Unit type + N of M), scaled to a 4in × 2in landscape thermal label. Any
// blank field (and its section title) is omitted from the output.
type Unit2x4Opts = {
  orderNumber: string;
  project: string;
  unitType: string;
  unitNum: string;
  unitTotal: string;
  orderQr?: string;
  projectQr?: string;
};
function buildUnit2x4Doc(opts: Unit2x4Opts): string {
  const { orderNumber, project, unitType, unitNum, unitTotal, orderQr, projectQr } = opts;

  const orderVis   = orderNumber.trim() ? "" : "visibility:hidden;";
  const projectVis = project.trim() ? "" : "visibility:hidden;";
  const unitVis    = unitType.trim() ? "" : "visibility:hidden;";
  const ofVis      = (unitNum.trim() || unitTotal.trim()) ? "" : "visibility:hidden;";

  const orderRow = `<div class="order-row" style="${orderVis}"><span class="section-title">Sales Order</span><div class="order-input-row"><div class="order-input">${escapeHtml(orderNumber)}</div>${orderQr ? `<div class="qr-box qr-sm"><img src="${orderQr}" alt="Order QR"/></div>` : `<div class="qr-box qr-sm"></div>`}</div></div>`;
  const projectRow = `<div class="project-row" style="${projectVis}"><span class="section-title">Project</span><div class="project-input-row"><div class="project-input">${escapeHtml(project)}</div>${projectQr ? `<div class="qr-box qr-med"><img src="${projectQr}" alt="Project QR"/></div>` : `<div class="qr-box qr-med"></div>`}</div></div>`;

  const unitCell = `<div class="meta-cell unit-cell" style="${unitVis}"><span class="meta-label">Unit:</span><span class="unit-select">${escapeHtml(unitType)}</span></div>`;
  const ofCell = `<div class="meta-cell of-cell" style="${ofVis}">
         <span class="meta-input num-input">${escapeHtml(unitNum)}</span>
         <span class="of-word">of</span>
         <span class="meta-input total-input">${escapeHtml(unitTotal)}</span>
       </div>`;
  const metaRow = `<div class="meta-row">${unitCell}${ofCell}</div>`;

  return `<!doctype html><html><head><title>Unit Label</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  @page { size: 4in 2in; margin: 0; }
  html, body { margin: 0; padding: 0; background: #fff; font-family: Arial, sans-serif; color: #000; }
  .label { width: 4in; height: 2in; display: flex; flex-direction: column; overflow: hidden; }
  .section-title { font-size: 8px; font-weight: 700; color: #555; text-transform: uppercase; letter-spacing: 0.6px; line-height: 1; margin-bottom: 1px; }
  .order-row { border-bottom: 2px solid #000; padding: 3px 8px 2px 8px; display: flex; flex-direction: column; }
  .order-input-row { display: flex; align-items: center; gap: 6px; justify-content: space-between; }
  .order-input { flex: 1; min-width: 0; font-size: 42px; font-weight: 900; font-family: "Arial Black", Arial, sans-serif; line-height: 1.0; color: #000; }
  .project-row { border-bottom: 2px solid #000; padding: 4px 8px 5px 8px; display: flex; flex-direction: column; flex: 1; }
  .project-input-row { display: flex; align-items: flex-start; gap: 6px; }
  .project-input { flex: 1; min-width: 0; font-size: 24px; font-weight: 700; line-height: 1.15; word-break: break-word; }
  .qr-box { flex-shrink: 0; overflow: hidden; display: flex; align-items: center; justify-content: center; background: #fff; }
  .qr-box img { width: 100% !important; height: 100% !important; }
  .qr-box.qr-sm  { width: 42px; height: 42px; }
  .qr-box.qr-med { width: 50px; height: 50px; }
  .meta-row { display: flex; align-items: stretch; }
  .meta-cell { display: flex; align-items: center; padding: 3px 6px; gap: 4px; }
  .meta-cell.unit-cell { flex: 0 0 auto; }
  .meta-cell.of-cell   { flex: 1; gap: 5px; }
  .meta-label { font-size: 11px; font-weight: 700; white-space: nowrap; }
  .unit-select { font-size: 12px; font-weight: 700; border-bottom: 1.5px solid #000; padding-right: 4px; }
  .meta-input { font-size: 12px; font-weight: 700; border-bottom: 1.5px solid #000; text-align: center; display: inline-block; min-width: 28px; min-height: 14px; padding: 0 2px; }
  .of-word { font-size: 12px; font-weight: 700; }
  @media print {
    html, body { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; }
    .label { transform: scale(0.90); transform-origin: center center; }
  }
</style></head><body>
<div class="label">
  ${orderRow}
  ${projectRow}
  ${metaRow}
</div>
</body></html>`;
}

async function printUnit2x4(opts: Unit2x4Opts) {
  const [orderQr, projectQr] = await Promise.all([
    opts.orderNumber.trim() ? cachedQr(opts.orderNumber.trim()) : Promise.resolve(""),
    opts.project.trim() ? cachedQr(opts.project.trim()) : Promise.resolve(""),
  ]);
  const doc = buildUnit2x4Doc({ ...opts, orderQr, projectQr }).replace(
    "</body></html>",
    `<script>window.onload = () => { setTimeout(() => { window.print(); }, 200); }; window.addEventListener('afterprint', () => { window.close(); });<\/script></body></html>`,
  );
  const win = window.open("", "_blank", "width=800,height=600");
  if (!win) return;
  win.document.write(doc);
  win.document.close();
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
  const [priority, setPriority] = useState("");
  const [missing, setMissing] = useState<Set<string>>(new Set());
  const [previewHtml, setPreviewHtml] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const firstSo = soNumbers.map((s) => s.trim()).find(Boolean) ?? "";
      const firstJob = jobNumbers.map((s) => s.trim()).find(Boolean) ?? "";
      const [orderQr, jobQr, projectQr] = await Promise.all([
        firstSo ? cachedQr(firstSo) : Promise.resolve(""),
        firstJob ? cachedQr(firstJob) : Promise.resolve(""),
        projectId.trim() ? cachedQr(projectId.trim()) : Promise.resolve(""),
      ]);
      if (cancelled) return;
      if (size === "4x6") {
        setPreviewHtml(buildUnit4x6Doc({
          orderNumber: firstSo,
          jobNumber: firstJob,
          project: projectId,
          unitType: unitSel,
          unitNum: unitX,
          unitTotal: unitN,
          date,
          area,
          status: priority,
          orderQr,
          jobQr,
          projectQr,
        }));
      } else {
        setPreviewHtml(buildUnit2x4Doc({
          orderNumber: firstSo,
          project: projectId,
          unitType: unitSel,
          unitNum: unitX,
          unitTotal: unitN,
          orderQr,
          projectQr,
        }));
      }
    })();
    return () => { cancelled = true; };
  }, [size, soNumbers, jobNumbers, projectId, unitX, unitN, date, unitSel, area, priority]);

  const handlePrint = async () => {
    // Either SO Number or Job Number is required. Other blank fields are omitted on print.
    const m = new Set<string>();
    const hasSo = (soNumbers[0] ?? "").trim();
    const hasJob = (jobNumbers[0] ?? "").trim();
    if (!hasSo && !hasJob) { m.add("so"); m.add("job"); }
    setMissing(m);
    if (m.size) return;
    const firstSo = soNumbers.map((s) => s.trim()).find(Boolean) ?? "";
    const firstJob = jobNumbers.map((s) => s.trim()).find(Boolean) ?? "";
    if (size === "4x6") {
      await printUnit4x6({
        orderNumber: firstSo,
        jobNumber: firstJob,
        project: projectId,
        unitType: unitSel,
        unitNum: unitX,
        unitTotal: unitN,
        date,
        area,
        status: priority,
      });
    } else {
      await printUnit2x4({
        orderNumber: firstSo,
        project: projectId,
        unitType: unitSel,
        unitNum: unitX,
        unitTotal: unitN,
      });
    }
    setSoNumbers([""]);
    setJobNumbers([""]);
    setProjectId("");
    setUnitX("");
    setUnitN("");
    setDate("");
    setUnitSel("");
    setArea("");
    setPriority("");
    setMissing(new Set());
    onOpenChange(false);
  };

  const handleClose = (val: boolean) => {
    if (!val) {
      setSoNumbers([""]);
      setJobNumbers([""]);
      setProjectId("");
      setUnitX("");
      setUnitN("");
      setDate("");
      setUnitSel("");
      setArea("");
      setPriority("");
      setMissing(new Set());
    }
    onOpenChange(val);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="w-[96vw] max-w-[1800px] max-h-[95vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Pack Unit Label</DialogTitle>
        </DialogHeader>
        <form
          className="contents"
          id="pack-unit-label-form"
          name="pack-unit-label"
          autoComplete="on"
          onKeyDown={blockEnterSubmit}
          onSubmit={(e) => { e.preventDefault(); handlePrint(); }}
        >
        <div className="grid grid-cols-[1fr_820px] gap-6 flex-1 overflow-hidden">
          <div className="space-y-4 overflow-y-auto px-2 py-1">
          <div className="space-y-2">
            <Label htmlFor="pack-so">SO Number {(!(jobNumbers[0] ?? "").trim()) && <Req />}</Label>
            <Input
              id="pack-so"
              name="soNumber"
              autoComplete="on"
              value={soNumbers[0] ?? ""}
              onChange={(e) => { setSoNumbers([e.target.value]); setMissing((s) => { const n = new Set(s); n.delete("so"); n.delete("job"); return n; }); }}
              className={cls(missing.has("so") && invalidCls)}
            />
            <div className="text-[10px] text-muted-foreground">Required unless Job Number is provided.</div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="pack-job">Job Number {(!(soNumbers[0] ?? "").trim()) && <Req />}</Label>
            <Input
              id="pack-job"
              name="jobNumber"
              autoComplete="on"
              value={jobNumbers[0] ?? ""}
              onChange={(e) => { setJobNumbers([e.target.value]); setMissing((s) => { const n = new Set(s); n.delete("so"); n.delete("job"); return n; }); }}
              className={cls(missing.has("job") && invalidCls)}
            />
            <div className="text-[10px] text-muted-foreground">Required unless SO Number is provided.</div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="proj-id">Project ID</Label>
            <Input id="proj-id" name="project" autoComplete="on" value={projectId} onChange={(e) => setProjectId(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Unit Number</Label>
            <div className="flex items-center gap-2">
              <Input
                name="unitNum"
                autoComplete="on"
                placeholder="X"
                type="number"
                value={unitX}
                onChange={(e) => setUnitX(e.target.value)}
                className="w-24"
              />
              <span className="text-muted-foreground">out of</span>
              <Input
                name="unitTotal"
                autoComplete="on"
                placeholder="N"
                type="number"
                value={unitN}
                onChange={(e) => setUnitN(e.target.value)}
                className="w-24"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Unit</Label>
            <Select value={unitSel} onValueChange={setUnitSel}>
              <SelectTrigger>
                <SelectValue placeholder="Select unit" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="BOX">BOX</SelectItem>
                <SelectItem value="CRATE">CRATE</SelectItem>
                <SelectItem value="PALLET">PALLET</SelectItem>
                <SelectItem value="S-PALLET">S-PALLET</SelectItem>
                <SelectItem value="C-PALLET">C-PALLET</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {size === "4x6" && (
            <div className="space-y-2">
              <Label htmlFor="pack-date">Date (mm/dd)</Label>
              <div className="flex gap-2">
                <Input
                  id="pack-date"
                  name="labelDate"
                  autoComplete="on"
                  placeholder="mm/dd"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
                <Popover>
                  <PopoverTrigger asChild>
                    <Button type="button" variant="outline" size="icon" aria-label="Pick a date">
                      <CalendarIcon className="h-4 w-4" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="end">
                    <Calendar
                      mode="single"
                      selected={(() => {
                        const d = parse(date, "MM/dd", new Date());
                        return isValid(d) ? d : undefined;
                      })()}
                      onSelect={(d) => d && setDate(format(d, "MM/dd"))}
                      initialFocus
                      className={cn("p-3 pointer-events-auto")}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          )}
          {size === "4x6" && (
            <div className="space-y-2">
              <Label>Area</Label>
              <Select value={area} onValueChange={setArea}>
                <SelectTrigger>
                  <SelectValue placeholder="Select area" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="SHIPPING">SHIPPING</SelectItem>
                  <SelectItem value="MAINLINE">MAINLINE</SelectItem>
                  <SelectItem value="CHASSISLINE">CHASSISLINE</SelectItem>
                  <SelectItem value="MATERIALS">MATERIALS</SelectItem>
                  <SelectItem value="WILLCALL">WILLCALL</SelectItem>
                  <SelectItem value="OTHER">OTHER</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
          {size === "4x6" && (
            <div className="space-y-2">
              <Label>Priority (optional)</Label>
              <Select value={priority || "__none"} onValueChange={(v) => setPriority(v === "__none" ? "" : v)}>
                <SelectTrigger>
                  <SelectValue placeholder="None" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none">None</SelectItem>
                  <SelectItem value="TOP">TOP</SelectItem>
                  <SelectItem value="HOT">HOT</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
          </div>
          <PreviewPane html={previewHtml} size={size} landscape={size === "2x4"} />
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => handleClose(false)}>Cancel</Button>
          <Button type="submit" form="pack-unit-label-form">Print</Button>
        </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

// ----------------- Status Note Label -----------------
// 4x6 Status Note label — matches attached status_label.html layout exactly.
function buildStatusNote4x6Doc(status: string, reason: string): string {
  const hasReason = reason.trim().length > 0;
  const reasonVis = hasReason ? "" : "visibility:hidden;";
  return `<!doctype html><html><head><title>Status Note Label</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  @page { size: 6in 4in landscape; margin: 0; }
  html, body { margin: 0; padding: 0; background: #fff; font-family: Arial, sans-serif; color: #000; }
  .label { width: 6in; height: 4in; display: flex; flex-direction: column; font-family: Arial, sans-serif; overflow: hidden; }
  .status-row { padding: 4px 14px 6px 14px; display: flex; flex-direction: column; flex: 1; border-bottom: 3px solid #000; }
  .sec-title { font-size: 16px; font-weight: 700; color: #555; text-transform: uppercase; letter-spacing: 1px; line-height: 1; margin-bottom: 0; }
  .status-value { flex: 1; font-size: 96px; font-weight: 900; font-family: "Arial Black", Arial, sans-serif; color: #000; text-transform: uppercase; line-height: 1.0; width: 100%; display: flex; align-items: center; }
  .reason-row { padding: 4px 14px 8px 14px; display: flex; flex-direction: column; flex: 1; }
  .reason-value { flex: 1; font-size: 26px; font-weight: 400; font-family: Arial, sans-serif; color: #000; line-height: 1.3; width: 100%; white-space: pre-wrap; word-break: break-word; }
  @media print { .label { transform: scale(0.95); transform-origin: center center; } }
</style></head><body>
<div class="label">
  <div class="status-row">
    <span class="sec-title">Status</span>
    <div class="status-value">${escapeHtml(status)}</div>
  </div>
  <div class="reason-row" style="${reasonVis}">
    <span class="sec-title">Reason</span>
    <div class="reason-value">${escapeHtml(reason)}</div>
  </div>
</div>
</body></html>`;
}

async function printStatusNote4x6(status: string, reason: string) {
  const doc = buildStatusNote4x6Doc(status, reason).replace(
    "</body></html>",
    `<script>window.onload = () => { setTimeout(() => { window.print(); }, 200); }; window.addEventListener('afterprint', () => { window.close(); });<\/script></body></html>`,
  );
  const win = window.open("", "_blank", "width=800,height=600");
  if (!win) return;
  win.document.write(doc);
  win.document.close();
}

// 2x4 Status Note label — mirrors attached status_label_2x4.html. Reason
// section is hidden when empty and Status row drops its divider so it fills.
function buildStatusNote2x4Doc(status: string, reason: string): string {
  const hasReason = reason.trim().length > 0;
  const reasonVis = hasReason ? "" : "visibility:hidden;";
  return `<!doctype html><html><head><title>Status Note Label</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  @page { size: 4in 2in landscape; margin: 0; }
  html, body { margin: 0; padding: 0; background: #fff; font-family: Arial, sans-serif; color: #000; }
  .label { width: 4in; height: 2in; display: flex; flex-direction: column; font-family: Arial, sans-serif; overflow: hidden; }
  .sec-title { font-size: 9px; font-weight: 700; color: #555; text-transform: uppercase; letter-spacing: 0.8px; line-height: 1; margin-bottom: 0; }
  .status-row { padding: 3px 10px 2px 10px; display: flex; flex-direction: column; flex: 1; border-bottom: 2px solid #000; }
  .status-value { flex: 1; font-size: 58px; font-weight: 900; font-family: "Arial Black", Arial, sans-serif; color: #000; text-transform: uppercase; line-height: 1.0; width: 100%; display: flex; align-items: center; }
  .reason-row { padding: 3px 10px 5px 10px; display: flex; flex-direction: column; flex: 1; }
  .reason-value { flex: 1; font-size: 14px; font-weight: 400; font-family: Arial, sans-serif; color: #000; line-height: 1.3; width: 100%; white-space: pre-wrap; word-break: break-word; }
  @media print {
    html, body { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; }
    .label { transform: scale(0.95); transform-origin: center center; }
  }
</style></head><body>
<div class="label">
  <div class="status-row">
    <span class="sec-title">Status</span>
    <div class="status-value">${escapeHtml(status)}</div>
  </div>
  <div class="reason-row" style="${reasonVis}">
    <span class="sec-title">Reason</span>
    <div class="reason-value">${escapeHtml(reason)}</div>
  </div>
</div>
</body></html>`;
}

async function printStatusNote2x4(status: string, reason: string) {
  const doc = buildStatusNote2x4Doc(status, reason).replace(
    "</body></html>",
    `<script>window.onload = () => { setTimeout(() => { window.print(); }, 200); }; window.addEventListener('afterprint', () => { window.close(); });<\/script></body></html>`,
  );
  const win = window.open("", "_blank", "width=800,height=600");
  if (!win) return;
  win.document.write(doc);
  win.document.close();
}

const StatusNoteLabelDialog = ({ size, open, onOpenChange }: { size: LabelSize; open: boolean; onOpenChange: (o: boolean) => void }) => {
  const [status, setStatus] = useState("");
  const [reason, setReason] = useState("");
  const [missing, setMissing] = useState<Set<string>>(new Set());

  const buildBody = (s: string, r: string) => `
      <div class="center grow" style="display:flex;flex-direction:column;justify-content:center;align-items:center;">
        <div class="title" style="font-size:48pt;">${escapeHtml(s)}</div>
        ${r.trim() ? `<div class="field wrap" style="font-size:18pt;margin-top:0.2in;">${escapeHtml(r)}</div>` : ""}
      </div>`;
  const previewHtml =
    size === "4x6"
      ? buildStatusNote4x6Doc(status, reason)
      : buildStatusNote2x4Doc(status, reason);

  const handlePrint = async () => {
    const m = new Set<string>();
    if (!status) m.add("status");
    setMissing(m);
    if (m.size) return;
    if (size === "4x6") {
      await printStatusNote4x6(status, reason);
    } else {
      await printStatusNote2x4(status, reason);
    }
    setStatus("");
    setReason("");
    setMissing(new Set());
    onOpenChange(false);
  };

  const handleClose = (val: boolean) => {
    if (!val) {
      setStatus("");
      setReason("");
      setMissing(new Set());
    }
    onOpenChange(val);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="w-[94vw] max-w-[1600px] max-h-[95vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Status Note Label</DialogTitle>
        </DialogHeader>
        <form
          className="contents"
          id="status-note-label-form"
          name="status-note-label"
          autoComplete="on"
          onKeyDown={blockEnterSubmit}
          onSubmit={(e) => { e.preventDefault(); handlePrint(); }}
        >
        <div className="grid grid-cols-[1fr_820px] gap-6 flex-1 overflow-hidden">
          <div className="space-y-4 overflow-y-auto px-2 py-1">
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
            <Textarea id="reason" name="reason" autoComplete="on" value={reason} onChange={(e) => setReason(e.target.value)} />
          </div>
          </div>
          <PreviewPane html={previewHtml} size={size} landscape={size === "2x4"} />
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => handleClose(false)}>Cancel</Button>
          <Button type="submit" form="status-note-label-form">Print</Button>
        </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

// ----------------- Misc Label -----------------
const MiscLabelDialog = ({ size, open, onOpenChange }: { size: LabelSize; open: boolean; onOpenChange: (o: boolean) => void }) => {
  const [text, setText] = useState("");
  const [missing, setMissing] = useState<Set<string>>(new Set());

  const buildBody = (t: string, fontPt: number) => `
      <div class="grow" style="display:flex;align-items:center;justify-content:center;">
        <div class="wrap center" style="font-size:${fontPt}pt;font-weight:800;line-height:1.1;">${escapeHtml(t)}</div>
      </div>`;

  // Font ladder: start at the label's largest size and shrink until the text
  // fits, with 10pt as the hard floor. Capacity scales ~1/fontSize^2 from the
  // calibrated base (4x6: 95 chars @ 36pt, 2x4: 70 chars @ 22pt).
  const baseFont = size === "2x4" ? 22 : 36;
  const baseChars = size === "2x4" ? 70 : 95;
  const steps = size === "2x4" ? [22, 18, 15, 12, 10] : [36, 30, 24, 20, 16, 14, 12, 10];
  const capacityFor = (pt: number) => Math.floor(baseChars * (baseFont / pt) ** 2);

  const len = text.trim().length;
  const fontPt = steps.find((pt) => len <= capacityFor(pt)) ?? 10;
  const maxChars = capacityFor(fontPt);
  const chunks = chunkMiscText(text, maxChars);
  const previewDocs = chunks.map((c) => buildGenericDoc("Misc Label", buildBody(c, fontPt), size));

  const handlePrint = async () => {
    const m = new Set<string>();
    if (!text.trim()) m.add("text");
    setMissing(m);
    if (m.size) return;
    if (chunks.length <= 1) {
      await printLabel("Misc Label", buildBody(chunks[0] ?? "", fontPt), size);
    } else {
      await printMiscMultiPage("Misc Label", chunks.map((c) => buildBody(c, fontPt)), size);
    }
    setText("");
    setMissing(new Set());
    onOpenChange(false);
  };

  const handleClose = (val: boolean) => {
    if (!val) {
      setText("");
      setMissing(new Set());
    }
    onOpenChange(val);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="w-[94vw] max-w-[1600px] max-h-[95vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Misc Label</DialogTitle>
        </DialogHeader>
        <form
          className="contents"
          id="misc-label-form"
          name="misc-label"
          autoComplete="on"
          onKeyDown={blockEnterSubmit}
          onSubmit={(e) => { e.preventDefault(); handlePrint(); }}
        >
        <div className="grid grid-cols-[1fr_820px] gap-6 flex-1 overflow-hidden">
          <div className="space-y-2 overflow-y-auto px-2 py-1">
          <Label htmlFor="misc-text">Text <Req /></Label>
          <Textarea
            id="misc-text"
            name="miscText"
            autoComplete="on"
            value={text}
            onChange={(e) => setText(e.target.value)}
            className={cls(missing.has("text") && invalidCls)}
          />
          {chunks.length > 1 && (
            <p className="text-xs text-muted-foreground">
              Text exceeds one label — will print {chunks.length} labels.
            </p>
          )}
          </div>
          <div className="border-l border-border pl-4 flex flex-col items-center gap-2 h-full overflow-hidden">
            <div className="text-xs uppercase tracking-wide text-muted-foreground font-semibold">
              Live preview{previewDocs.length > 1 ? ` (${previewDocs.length} labels)` : ""}
            </div>
            <div className="flex-1 w-full overflow-y-auto flex flex-col items-center gap-4 py-1">
              {previewDocs.map((html, i) => (
                <div key={i} className="flex flex-col items-center gap-1">
                  {previewDocs.length > 1 && (
                    <div className="text-[10px] text-muted-foreground font-semibold">
                      Label {i + 1} of {previewDocs.length}
                    </div>
                  )}
                  <LabelPreview html={html} size={size} landscape={size === "2x4"} fixedDisplayW={600} />
                </div>
              ))}
            </div>
            <div className="text-[10px] text-muted-foreground">
              {size === "4x6" ? '4" × 6" (scaled)' : '2" × 4" (scaled)'}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => handleClose(false)}>Cancel</Button>
          <Button type="submit" form="misc-label-form">Print</Button>
        </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
// ----------------- Inspection Label (4x6 only) -----------------
type Inspection4x6Opts = { rma: string; date: string };

function buildInspection4x6Doc({ rma, date }: Inspection4x6Opts): string {
  const parts = (date || "").split("/");
  const mm = escapeHtml(parts[0] ?? "");
  const dd = escapeHtml(parts[1] ?? "");
  const yy = escapeHtml(parts[2] ?? "");
  return `<!doctype html><html><head><meta charset="utf-8"><title>Inspection Label</title>
<style>
  :root{ --ink:#000; --rule:#000; --hint:#8a8a8a; --safe:0.22in; --labelcol:1.85in; --slotcol:1.20in; --initcol:.85in; --colgap:.09in; }
  *{box-sizing:border-box;}
  html,body{margin:0;padding:0;background:#fff;}
  body{font-family:"Arial Black","Helvetica Neue",Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased;}
  .sheet{width:6in;height:4in;background:#fff;padding:var(--safe);}
  .label{width:100%;height:100%;color:var(--ink);display:flex;flex-direction:column;overflow:hidden;}
  .cap{font-size:17px;line-height:1;letter-spacing:.01em;white-space:nowrap;}
  .cap.sm{font-size:14px;}
  .fieldline{flex:0 0 auto;min-width:0;display:flex;border-bottom:3px solid var(--rule);}
  .rma .fieldline{flex:1 1 auto;}
  .fill{flex:1;width:100%;min-width:0;font-family:"Arial Black","Helvetica Neue",Helvetica,Arial,sans-serif;font-size:16px;line-height:1.1;color:var(--ink);background:transparent;border:0;padding:0 .04in 2px;text-transform:uppercase;white-space:nowrap;overflow:hidden;}
  .rule{flex:1;border-bottom:3px solid var(--rule);height:.19in;}
  .row{display:flex;align-items:flex-end;gap:.07in;}
  .row .gap{margin-left:.16in;}
  .rule.wide{flex:1.7;}
  .head{display:flex;gap:.16in;align-items:flex-end;}
  .head .rma{flex:1 1 auto;min-width:0;display:flex;align-items:flex-end;gap:.07in;}
  .head .req{flex:0 0 auto;margin-left:auto;display:flex;align-items:flex-end;gap:.07in;}
  .reqdate{display:flex;align-items:flex-end;gap:.035in;font-size:16px;line-height:1;}
  .fill.mini{width:.32in;flex:none;text-align:center;padding:0 1px 2px;}
  .band{height:3px;background:#000;margin:.04in 0 .05in;}
  .midblock{display:flex;gap:.14in;align-items:stretch;}
  .rowsblock{flex:1 1 auto;min-width:0;}
  .qtypanel{flex:0 0 1.02in;display:flex;flex-direction:column;}
  .qty-cap{font-family:"Arial Black","Helvetica Neue",Helvetica,Arial,sans-serif;font-size:13px;letter-spacing:.01em;text-align:center;white-space:nowrap;margin-bottom:.04in;}
  .qty-box{flex:1;border:3px solid #000;margin-bottom:.04in;}
  .caprow{display:grid;grid-template-columns:var(--labelcol) var(--slotcol) var(--initcol);gap:var(--colgap);}
  .init-cap{font-family:Arial,Helvetica,sans-serif;font-weight:700;font-size:8px;letter-spacing:.12em;text-align:center;grid-column:3;}
  .daterow{display:grid;grid-template-columns:var(--labelcol) var(--slotcol) var(--initcol);align-items:center;gap:var(--colgap);margin-bottom:.04in;}
  .slots{display:flex;align-items:flex-end;gap:.04in;font-size:16px;line-height:1;width:100%;}
  .slot{border-bottom:3px solid var(--rule);height:.18in;flex:1 1 0;min-width:0;}
  .cell{height:.28in;border:3px solid #000;}
  .foot{margin-top:auto;display:flex;align-items:flex-end;}
  .checks{display:flex;align-items:center;gap:.24in;margin:0 0 .05in .18in;}
  .check{display:flex;align-items:center;gap:.07in;font-size:14px;line-height:1;}
  .box{width:.18in;height:.18in;border:3px solid #000;flex:none;}
  .stamp{margin-left:auto;width:2.38in;height:1.28in;position:relative;display:flex;align-items:center;justify-content:center;}
  .corner{position:absolute;width:.26in;height:.26in;}
  .corner.tl{top:0;left:0;border-top:3px solid #000;border-left:3px solid #000;}
  .corner.tr{top:0;right:0;border-top:3px solid #000;border-right:3px solid #000;}
  .corner.bl{bottom:0;left:0;border-bottom:3px solid #000;border-left:3px solid #000;}
  .corner.br{bottom:0;right:0;border-bottom:3px solid #000;border-right:3px solid #000;}
  .stamp span:not(.corner){font-family:Arial,Helvetica,sans-serif;font-weight:700;font-size:9px;letter-spacing:.14em;color:var(--hint);text-align:center;line-height:1.5;}
  @page{size:6in 4in;margin:0;}
  @media print{ html,body{background:#fff;padding:0;margin:0;display:block;} .sheet{page-break-after:avoid;} .stamp span:not(.corner){color:#c4c4c4;} }
</style></head><body>
<div class="sheet"><div class="label">
  <div class="head">
    <div class="rma"><span class="cap">RMA #:</span><span class="fieldline"><span class="fill">${escapeHtml(rma)}</span></span></div>
    <div class="req"><span class="cap">RMA REQUESTED:</span><span class="reqdate">
      <span class="fieldline"><span class="fill mini">${mm}</span></span>/<span class="fieldline"><span class="fill mini">${dd}</span></span>/<span class="fieldline"><span class="fill mini">${yy}</span></span>
    </span></div>
  </div>
  <div class="band"></div>
  <div class="row" style="margin-bottom:.06in;"><span class="cap">SO:</span><span class="rule"></span><span class="cap gap">CUSTOMER:</span><span class="rule wide"></span></div>
  <div class="row" style="margin-bottom:.06in;"><span class="cap">ADDRESS:</span><span class="rule"></span></div>
  <div class="midblock">
    <div class="rowsblock">
      <div class="caprow"><span></span><span></span><span class="init-cap">INITIALS</span></div>
      <div class="daterow"><span class="cap sm">RMA RECEIVED:</span><span class="slots"><i class="slot"></i>/<i class="slot"></i>/<i class="slot"></i></span><span class="cell"></span></div>
      <div class="daterow"><span class="cap sm">INSPECTED:</span><span class="slots"><i class="slot"></i>/<i class="slot"></i>/<i class="slot"></i></span><span class="cell"></span></div>
      <div class="checks">
      <div class="check"><span class="box"></span>FAIL</div>
      <div class="check"><span class="box"></span>RTS</div>
      <div class="check"><span class="box"></span>REPACK</div>
      </div>
      <div class="daterow"><span class="cap sm">PROCESSED/BINNED:</span><span class="slots"><i class="slot"></i>/<i class="slot"></i>/<i class="slot"></i></span><span class="cell"></span></div>
    </div>
    <div class="qtypanel">
      <div class="qty-cap">QTY / UNIT</div>
      <div class="qty-box"></div>
    </div>
  </div>
  <div class="foot">
    <div class="stamp">
      <span class="corner tl"></span><span class="corner tr"></span>
      <span class="corner bl"></span><span class="corner br"></span>
    </div>
  </div>
</div></div>
</body></html>`;
}

function printHtmlDoc(html: string) {
  const win = window.open("", "_blank", "width=800,height=600");
  if (!win) return;
  const doc = html.replace(
    "</body></html>",
    `<script>window.onload = () => { setTimeout(() => { window.print(); }, 150); }; window.addEventListener('afterprint', () => { window.close(); });<\/script></body></html>`,
  );
  win.document.write(doc);
  win.document.close();
}

const InspectionLabelDialog = ({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) => {
  const [rma, setRma] = useState("");
  const [date, setDate] = useState("");

  const html = buildInspection4x6Doc({ rma, date });

  const reset = () => { setRma(""); setDate(""); };

  const handleClose = (val: boolean) => {
    if (!val) reset();
    onOpenChange(val);
  };

  const handlePrint = () => {
    printHtmlDoc(html);
    reset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="w-[94vw] max-w-[1600px] max-h-[95vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Inspection Label</DialogTitle>
        </DialogHeader>
        <form
          className="contents"
          id="inspection-label-form"
          name="inspection-label"
          autoComplete="on"
          onKeyDown={blockEnterSubmit}
          onSubmit={(e) => { e.preventDefault(); handlePrint(); }}
        >
        <div className="grid grid-cols-[1fr_820px] gap-6 flex-1 overflow-hidden">
          <div className="space-y-4 overflow-y-auto px-2 py-1">
            <div className="space-y-2">
              <Label htmlFor="insp-rma">RMA #</Label>
              <Input id="insp-rma" name="rma" autoComplete="on" value={rma} onChange={(e) => setRma(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="insp-date">Request Date (mm/dd/yy)</Label>
              <div className="flex gap-2">
                <Input
                  id="insp-date"
                  name="requestDate"
                  autoComplete="on"
                  placeholder="mm/dd/yy"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
                <Popover>
                  <PopoverTrigger asChild>
                    <Button type="button" variant="outline" size="icon" aria-label="Pick a date">
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
            <p className="text-xs text-muted-foreground">All fields are optional.</p>
          </div>
          <div className="border-l border-border pl-4 flex flex-col items-center gap-2 h-full overflow-hidden">
            <div className="text-xs uppercase tracking-wide text-muted-foreground font-semibold">
              Live preview
            </div>
            <LabelPreview html={html} size="4x6" />
            <div className="text-[10px] text-muted-foreground">4" × 6" (scaled)</div>
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => handleClose(false)}>Cancel</Button>
          <Button type="submit" form="inspection-label-form">Print</Button>
        </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
