import { useEffect, useRef, useState } from "react";
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
import partLabelIcon from "@/assets/part-label-icon.png.asset.json";
import partLabel2x4Icon from "@/assets/part-label-2x4-icon.png.asset.json";
import miscLabel2x4Icon from "@/assets/misc-label-2x4-icon.png.asset.json";
import unitLabelIcon from "@/assets/unit-label-icon.png.asset.json";
import unitLabel2x4Icon from "@/assets/unit-label-2x4-icon.png.asset.json";
import statusLabelIcon from "@/assets/status-label-icon.png.asset.json";
import statusLabel2x4Icon from "@/assets/status-label-2x4-icon.png.asset.json";
import sampleLabelIcon from "@/assets/sample-label-icon.png.asset.json";
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
  const pageSize = size === "2x4" ? "4in 2in" : "6in 4in";
  const labelW = size === "2x4" ? "4in" : "6in";
  const labelH = size === "2x4" ? "2in" : "4in";
  const pad = size === "2x4" ? "0.12in" : "0.25in";
  return `<!doctype html><html><head><title>${escapeHtml(title)}</title>
<style>
  @page { size: ${pageSize} landscape; margin: 0; }
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
  @media print { .label { transform: scale(0.95); transform-origin: center center; } }
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
const LabelPreview = ({ html, size, landscape }: { html: string; size: LabelSize; landscape?: boolean }) => {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(() => {
    const nativeW = nativeWFor(size, landscape);
    const nativeH = nativeHFor(size, landscape);
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
      const rect = el.getBoundingClientRect();
      const s = Math.min(rect.width / nativeW, rect.height / nativeH);
      setScale(s);
    };

    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [size, landscape]);

  const nativeW = nativeWFor(size, landscape);
  const nativeH = nativeHFor(size, landscape);

  return (
    <div ref={wrapperRef} className="flex-1 w-full min-h-0 flex items-center justify-center">
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
type LabelKind = "part" | "pack-unit" | "status-note" | "misc";

const FOUR_BY_SIX_ICONS: Record<LabelKind, { url: string }> = {
  "part": partLabelIcon,
  "pack-unit": unitLabelIcon,
  "status-note": statusLabelIcon,
  "misc": sampleLabelIcon,
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
              <div
                className={
                  size === "2x4"
                    ? "w-80 h-40 flex items-center justify-center mx-auto"
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

      </main>
    </div>
  );
};

export default LabelsPage;

// ----------------- Part Label -----------------
type PartEntry = { partNumber: string; qty: string; jobNumber: string; soNumber: string; goesWith: string; description: string; rev: string; item: string };
const emptyPart = (): PartEntry => ({ partNumber: "", qty: "", jobNumber: "", soNumber: "", goesWith: "", description: "", rev: "", item: "" });

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
  .label { width: 6in; height: 4in; border: 2.5px solid #222; display: flex; flex-direction: column; overflow: hidden; }
  .label-header { border-bottom: 2.5px solid #222; padding: 0px 14px 1px 14px; }
  .logo-text { font-size: 22px; font-weight: 900; font-family: "Arial Black", Arial, sans-serif; letter-spacing: 1.5px; text-transform: uppercase; line-height: 1; }
  .logo-reg { font-size: 15px; vertical-align: super; }
  .parts-area { flex: 1; display: flex; flex-direction: column; }
  .part-row { flex: 1; display: flex; flex-direction: column; border-bottom: 2.5px solid #222; }
  .part-row:last-of-type { border-bottom: none; }
  .sec-title { font-size: 11px; font-weight: 700; color: #555; text-transform: uppercase; letter-spacing: 0.5px; line-height: 1; display: block; margin-bottom: -2px; white-space: nowrap; }
  .sec-title-inline { font-size: 11px; font-weight: 700; color: #555; text-transform: uppercase; letter-spacing: 0.5px; line-height: 1; white-space: nowrap; flex-shrink: 0; margin-bottom: -2px; }
  .job-line { display: flex; flex-direction: column; padding: 0px 12px 0px 12px; border-bottom: 1px solid #ccc; }
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
  .part-line { display: flex; flex-direction: column; padding: 0px 12px 0px 12px; border-bottom: 1px solid #ccc; }
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
    `<script>window.onload = () => { setTimeout(() => { window.print(); }, 200); };<\/script></body></html>`,
  );
  const win = window.open("", "_blank", "width=800,height=600");
  if (!win) return;
  win.document.write(doc);
  win.document.close();
}

// 2x4 Part label — landscape 4in x 2in. Pure HTML doc builder shared by print + preview.
// Optional fields (SO/Line/Rel, Rev, Item) are omitted when blank.
function buildPart2x4Doc(parts: PartEntry[], qrs: Array<{ part: string; job: string }>): string {
  const labels = parts.map((p, i) => {
    const partQr = qrs[i]?.part || "";
    const jobQr = qrs[i]?.job || "";

    const jobQrHtml = jobQr
      ? `<div class="qr-box job-qr"><img src="${jobQr}" alt="Job QR"/></div>`
      : "";
    const partQrHtml = partQr
      ? `<div class="qr-box part-qr"><img src="${partQr}" alt="Part QR"/></div>`
      : "";

    const solBlock = p.soNumber.trim()
      ? `<span class="f-title">SO / Line / Rel</span>
         <div class="f-input sol-input">${escapeHtml(p.soNumber)}</div>`
      : "";
    const itemBlock = p.item.trim()
      ? `<span class="f-title" style="margin-top:3px;">Item</span>
         <div class="f-input item-input">${escapeHtml(p.item)}</div>`
      : "";
    const infoCol = (solBlock || itemBlock)
      ? `<div class="info-col">${solBlock}${itemBlock}</div>`
      : "";

    const revBlock = p.rev.trim()
      ? `<span class="f-title" style="margin-top:4px;">Rev</span>
         <div class="f-input rev-input">${escapeHtml(p.rev)}</div>`
      : "";
    const qtyCol = `<div class="qty-col">
        <span class="f-title">QTY</span>
        <div class="f-input qty-input">${escapeHtml(p.qty)}</div>
        ${revBlock}
      </div>`;

    return `
    <div class="label">
      <div class="top-section">
        <div class="job-col">
          <span class="f-title">Job</span>
          <div class="f-input job-input">${escapeHtml(p.jobNumber)}</div>
          ${jobQrHtml}
        </div>
        <div class="part-body">
          <div class="part-header-bar">
            <span class="f-title">Part</span>
            <div class="f-input part-input" style="font-size:13px; width:100%; border-bottom:none;">${escapeHtml(p.partNumber)}</div>
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
        </div>
      </div>
    </div>`;
  }).join("");

  return `<!doctype html><html><head><title>Part Label</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  @page { size: 4in 2in landscape; margin: 0; }
  html, body { margin: 0; padding: 0; background: #fff; font-family: Arial, sans-serif; color: #000; }
  .label { width: 4in; height: 2in; background: #fff; border: 2.5px solid #000; display: flex; flex-direction: column; font-family: Arial, sans-serif; overflow: hidden; page-break-after: always; }
  .label:last-child { page-break-after: auto; }
  .top-section { display: flex; flex-direction: row; border-bottom: 2px solid #000; flex: 1; min-height: 0; }
  .job-col { display: flex; flex-direction: column; border-right: 2px solid #000; padding: 3px 5px 3px 5px; min-width: 72px; align-items: flex-start; gap: 3px; }
  .part-qr-col { display: flex; align-items: flex-end; justify-content: flex-start; padding: 0 4px 3px 4px; min-width: 70px; flex-shrink: 0; }
  .info-col { flex: 1; display: flex; flex-direction: column; padding: 2px 6px 3px 6px; gap: 1px; border-left: 2px solid #000; border-top: 2px solid #000; }
  .qty-col { display: flex; flex-direction: column; align-items: flex-end; justify-content: flex-start; padding: 3px 5px 3px 4px; border-left: 2px solid #000; border-top: 2px solid #000; min-width: 52px; gap: 4px; margin-left: auto; }
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
  .f-input.qty-input { font-size: 14px; width: 40px; text-align: right; }
  .qr-box { overflow: hidden; display: flex; align-items: center; justify-content: center; background: #fff; flex-shrink: 0; }
  .qr-box img { width: 100% !important; height: 100% !important; display: block; }
  .qr-box.job-qr { width: 58px; height: 58px; margin-top: auto; margin-bottom: 6px; }
  .qr-box.part-qr { width: 58px; height: 58px; margin-bottom: 6px; }
  .divider { border-top: 2px dashed #000; margin: 0; margin-top: auto; }
  .bottom-section { display: flex; flex-direction: row; align-items: stretch; min-height: 44px; }
  .em-block { background: #000; display: flex; flex-direction: column; align-items: flex-start; justify-content: center; padding: 2px 6px; border-right: 2px solid #000; min-width: 86px; max-width: 86px; }
  .em-name { font-size: 11px; font-weight: 900; font-family: Arial Black, Arial, sans-serif; color: #fff; letter-spacing: 0.5px; line-height: 1.05; text-transform: uppercase; }
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
</style></head><body>${labels}</body></html>`;
}

async function printPart2x4(parts: PartEntry[]) {
  const qrs = await computePartQrs(parts);
  const doc = buildPart2x4Doc(parts, qrs).replace(
    "</body></html>",
    `<script>window.onload = () => { setTimeout(() => { window.print(); }, 200); };<\/script></body></html>`,
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
      const qrs = await computePartQrs(parts);
      if (cancelled) return;
      if (size === "4x6") {
        setPreviewHtml(buildPart4x6Doc(parts, qrs));
      } else {
        setPreviewHtml(buildPart2x4Doc(parts, qrs));
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
      if (!p.jobNumber.trim()) m.add(`jobNumber-${i}`);
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
                  <Input value={p.jobNumber} onChange={(e) => updatePart(i, { jobNumber: e.target.value })} />
                  <p className="text-xs text-muted-foreground">Optional. Leave blank to omit from the printed label.</p>
                </div>
                <div className="space-y-2">
                  <Label>Qty <Req /></Label>
                  <Input
                    type="number"
                    value={p.qty}
                    onChange={(e) => updatePart(i, { qty: e.target.value })}
                    className={cls(missing.has(`qty-${i}`) && invalidCls)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Rev</Label>
                  <Input
                    value={p.rev}
                    onChange={(e) => updatePart(i, { rev: e.target.value })}
                    placeholder="A"
                  />
                  <p className="text-xs text-muted-foreground">Optional. Leave blank to omit from the printed label.</p>
                </div>
                <div className="space-y-2">
                  <Label>Part Number <Req /></Label>
                  <Input
                    value={p.partNumber}
                    onChange={(e) => updatePart(i, { partNumber: e.target.value })}
                    className={cls(missing.has(`partNumber-${i}`) && invalidCls)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Description <Req /></Label>
                  <Textarea
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
                    <Label>Job Number <Req /></Label>
                    <Input
                      value={p.jobNumber}
                      onChange={(e) => updatePart(i, { jobNumber: e.target.value })}
                      className={cls(missing.has(`jobNumber-${i}`) && invalidCls)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Part Number <Req /></Label>
                    <Input
                      value={p.partNumber}
                      onChange={(e) => updatePart(i, { partNumber: e.target.value })}
                      className={cls(missing.has(`partNumber-${i}`) && invalidCls)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Qty <Req /></Label>
                    <Input
                      type="number"
                      value={p.qty}
                      onChange={(e) => updatePart(i, { qty: e.target.value })}
                      className={cls(missing.has(`qty-${i}`) && invalidCls)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Sales Order / Line / Release</Label>
                    <Input
                      value={p.soNumber}
                      onChange={(e) => updatePart(i, { soNumber: e.target.value })}
                      placeholder="455100/2/1"
                    />
                    <p className="text-xs text-muted-foreground">Optional. Leave blank to omit from the printed label.</p>
                  </div>
                  <div className="space-y-2">
                    <Label>Rev</Label>
                    <Input
                      value={p.rev}
                      onChange={(e) => updatePart(i, { rev: e.target.value })}
                      placeholder="A"
                    />
                    <p className="text-xs text-muted-foreground">Optional. Leave blank to omit from the printed label.</p>
                  </div>
                  <div className="space-y-2">
                    <Label>Item</Label>
                    <Input
                      value={p.item}
                      onChange={(e) => updatePart(i, { item: e.target.value })}
                      placeholder="Mirror"
                    />
                    <p className="text-xs text-muted-foreground">Optional. Leave blank to omit from the printed label.</p>
                  </div>
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
          <Button variant="outline" onClick={() => handleClose(false)}>Cancel</Button>
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
  orderQr?: string;
  projectQr?: string;
};
function buildUnit4x6Doc(opts: Unit4x6Opts): string {
  const { orderNumber, project, unitType, unitNum, unitTotal, date, area, status, orderQr, projectQr } = opts;

  const orderRow = orderNumber.trim()
    ? `<div class="order-row"><span class="section-title">Sales Order</span><div class="order-input-row"><div class="order-input">${escapeHtml(orderNumber)}</div>${orderQr ? `<div class="qr-box"><img src="${orderQr}" alt="Order QR"/></div>` : ""}</div></div>`
    : "";
  const projectRow = project.trim()
    ? `<div class="project-row"><span class="section-title">Project</span><div class="project-input-row"><div class="project-input">${escapeHtml(project)}</div>${projectQr ? `<div class="qr-box"><img src="${projectQr}" alt="Project QR"/></div>` : ""}</div></div>`
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
  .label { width: 6in; height: 4in; border: 3px solid #000; display: flex; flex-direction: column; overflow: hidden; }
  .section-title { font-size: 16px; font-weight: 700; color: #555; text-transform: uppercase; letter-spacing: 1px; line-height: 1; margin-bottom: 2px; }
  .order-row { border-bottom: 3px solid #000; padding: 6px 14px 4px 14px; display: flex; flex-direction: column; }
  .order-input-row { display: flex; align-items: center; gap: 10px; justify-content: space-between; }
  .order-input { font-size: 88px; font-weight: 900; font-family: "Arial Black", Arial, sans-serif; line-height: 1.05; color: #000; }
  .project-row { border-bottom: 3px solid #000; padding: 6px 14px 8px 14px; min-height: 90px; display: flex; flex-direction: column; }
  .project-input-row { display: flex; align-items: flex-start; gap: 10px; }
  .project-input { flex: 1; min-width: 0; font-size: 36px; font-weight: 700; line-height: 1.15; word-break: break-word; }
  .qr-box { width: 82px; height: 82px; flex-shrink: 0; background: #fff; display: flex; align-items: center; justify-content: center; }
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
  .area-cell { flex: 1; display: flex; align-items: center; padding: 6px 10px; gap: 8px; border-right: 2px solid #000; }
  .area-input { flex: 1; font-size: 26px; font-weight: 900; font-family: "Arial Black", Arial, sans-serif; text-transform: uppercase; border-bottom: 2px solid #000; display: inline-block; min-height: 30px; padding: 0 4px; }
  .status-cell { width: 140px; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 4px 8px; }
  .status-label-sm { font-size: 13px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; margin-bottom: 2px; }
  .status-input { width: 100%; font-size: 26px; font-weight: 900; font-family: "Arial Black", Arial, sans-serif; text-align: center; text-transform: uppercase; border-bottom: 2px solid #000; display: inline-block; min-height: 30px; padding: 0 4px; }
  @media print { .label { transform: scale(0.95); transform-origin: center center; } }
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
  const [orderQr, projectQr] = await Promise.all([
    opts.orderNumber.trim() ? cachedQr(opts.orderNumber.trim()) : Promise.resolve(""),
    opts.project.trim() ? cachedQr(opts.project.trim()) : Promise.resolve(""),
  ]);
  const doc = buildUnit4x6Doc({ ...opts, orderQr, projectQr }).replace(
    "</body></html>",
    `<script>window.onload = () => { setTimeout(() => { window.print(); }, 200); };<\/script></body></html>`,
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

  const orderRow = orderNumber.trim()
    ? `<div class="order-row"><span class="section-title">Sales Order</span><div class="order-input-row"><div class="order-input">${escapeHtml(orderNumber)}</div>${orderQr ? `<div class="qr-box qr-sm"><img src="${orderQr}" alt="Order QR"/></div>` : ""}</div></div>`
    : "";
  const projectRow = project.trim()
    ? `<div class="project-row"><span class="section-title">Project</span><div class="project-input-row"><div class="project-input">${escapeHtml(project)}</div>${projectQr ? `<div class="qr-box qr-med"><img src="${projectQr}" alt="Project QR"/></div>` : ""}</div></div>`
    : "";

  const unitCell = unitType.trim()
    ? `<div class="meta-cell unit-cell"><span class="meta-label">Unit:</span><span class="unit-select">${escapeHtml(unitType)}</span></div>`
    : "";
  const ofCell = (unitNum.trim() || unitTotal.trim())
    ? `<div class="meta-cell of-cell">
         <span class="meta-input num-input">${escapeHtml(unitNum)}</span>
         <span class="of-word">of</span>
         <span class="meta-input total-input">${escapeHtml(unitTotal)}</span>
       </div>`
    : "";
  const metaRow = (unitCell || ofCell)
    ? `<div class="meta-row">${unitCell}${ofCell}</div>`
    : "";

  return `<!doctype html><html><head><title>Unit Label</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  @page { size: 4in 2in landscape; margin: 0; }
  html, body { margin: 0; padding: 0; background: #fff; font-family: Arial, sans-serif; color: #000; }
  .label { width: 4in; height: 2in; border: 2px solid #000; display: flex; flex-direction: column; overflow: hidden; }
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
    `<script>window.onload = () => { setTimeout(() => { window.print(); }, 200); };<\/script></body></html>`,
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
  const [missing, setMissing] = useState<Set<string>>(new Set());
  const [previewHtml, setPreviewHtml] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const firstSo = soNumbers.map((s) => s.trim()).find(Boolean) ?? "";
      const [orderQr, projectQr] = await Promise.all([
        firstSo ? cachedQr(firstSo) : Promise.resolve(""),
        projectId.trim() ? cachedQr(projectId.trim()) : Promise.resolve(""),
      ]);
      if (cancelled) return;
      if (size === "4x6") {
        setPreviewHtml(buildUnit4x6Doc({
          orderNumber: firstSo,
          project: projectId,
          unitType: unitSel,
          unitNum: unitX,
          unitTotal: unitN,
          date,
          area,
          status: "",
          orderQr,
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
  }, [size, soNumbers, projectId, unitX, unitN, date, unitSel, area]);

  const handlePrint = async () => {
    // SO Number is the only required field. Other blank fields are omitted on print.
    const m = new Set<string>();
    if (!(soNumbers[0] ?? "").trim()) m.add("so");
    setMissing(m);
    if (m.size) return;
    const firstSo = soNumbers.map((s) => s.trim()).find(Boolean) ?? "";
    if (size === "4x6") {
      await printUnit4x6({
        orderNumber: firstSo,
        project: projectId,
        unitType: unitSel,
        unitNum: unitX,
        unitTotal: unitN,
        date,
        area,
        status: "",
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
        <div className="grid grid-cols-[1fr_820px] gap-6 flex-1 overflow-hidden">
          <div className="space-y-4 overflow-y-auto px-2 py-1">
          <div className="space-y-2">
            <Label htmlFor="pack-so">SO Number <Req /></Label>
            <Input
              id="pack-so"
              value={soNumbers[0] ?? ""}
              onChange={(e) => setSoNumbers([e.target.value])}
              className={cls(missing.has("so") && invalidCls)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="proj-id">Project ID</Label>
            <Input id="proj-id" value={projectId} onChange={(e) => setProjectId(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Unit Number</Label>
            <div className="flex items-center gap-2">
              <Input
                placeholder="X"
                type="number"
                value={unitX}
                onChange={(e) => setUnitX(e.target.value)}
                className="w-24"
              />
              <span className="text-muted-foreground">out of</span>
              <Input
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
          </div>
          <PreviewPane html={previewHtml} size={size} landscape={size === "2x4"} />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => handleClose(false)}>Cancel</Button>
          <Button onClick={handlePrint}>Print</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// ----------------- Status Note Label -----------------
// 4x6 Status Note label — matches attached status_label.html layout exactly.
function buildStatusNote4x6Doc(status: string, reason: string): string {
  const hasReason = reason.trim().length > 0;
  return `<!doctype html><html><head><title>Status Note Label</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  @page { size: 6in 4in landscape; margin: 0; }
  html, body { margin: 0; padding: 0; background: #fff; font-family: Arial, sans-serif; color: #000; }
  .label { width: 6in; height: 4in; border: 3px solid #000; display: flex; flex-direction: column; font-family: Arial, sans-serif; overflow: hidden; }
  .status-row { padding: 4px 14px 6px 14px; display: flex; flex-direction: column; flex: 1; ${hasReason ? 'border-bottom: 3px solid #000;' : ''} }
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
  ${hasReason ? `<div class="reason-row">
    <span class="sec-title">Reason</span>
    <div class="reason-value">${escapeHtml(reason)}</div>
  </div>` : ""}
</div>
</body></html>`;
}

async function printStatusNote4x6(status: string, reason: string) {
  const doc = buildStatusNote4x6Doc(status, reason).replace(
    "</body></html>",
    `<script>window.onload = () => { setTimeout(() => { window.print(); }, 200); };<\/script></body></html>`,
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
  return `<!doctype html><html><head><title>Status Note Label</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  @page { size: 4in 2in landscape; margin: 0; }
  html, body { margin: 0; padding: 0; background: #fff; font-family: Arial, sans-serif; color: #000; }
  .label { width: 4in; height: 2in; border: 2.5px solid #000; display: flex; flex-direction: column; font-family: Arial, sans-serif; overflow: hidden; }
  .sec-title { font-size: 9px; font-weight: 700; color: #555; text-transform: uppercase; letter-spacing: 0.8px; line-height: 1; margin-bottom: 0; }
  .status-row { padding: 3px 10px 2px 10px; display: flex; flex-direction: column; flex: 1; ${hasReason ? 'border-bottom: 2px solid #000;' : ''} }
  .status-value { flex: 1; font-size: 58px; font-weight: 900; font-family: "Arial Black", Arial, sans-serif; color: #000; text-transform: uppercase; line-height: 1.0; width: 100%; display: flex; align-items: center; }
  .reason-row { padding: 3px 10px 5px 10px; display: flex; flex-direction: column; flex: 1; }
  .reason-value { flex: 1; font-size: 14px; font-weight: 400; font-family: Arial, sans-serif; color: #000; line-height: 1.3; width: 100%; white-space: pre-wrap; word-break: break-word; }
</style></head><body>
<div class="label">
  <div class="status-row">
    <span class="sec-title">Status</span>
    <div class="status-value">${escapeHtml(status)}</div>
  </div>
  ${hasReason ? `<div class="reason-row">
    <span class="sec-title">Reason</span>
    <div class="reason-value">${escapeHtml(reason)}</div>
  </div>` : ""}
</div>
</body></html>`;
}

async function printStatusNote2x4(status: string, reason: string) {
  const doc = buildStatusNote2x4Doc(status, reason).replace(
    "</body></html>",
    `<script>window.onload = () => { setTimeout(() => { window.print(); }, 200); };<\/script></body></html>`,
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
            <Textarea id="reason" value={reason} onChange={(e) => setReason(e.target.value)} />
          </div>
          </div>
          <PreviewPane html={previewHtml} size={size} landscape={size === "2x4"} />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => handleClose(false)}>Cancel</Button>
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
        <div className="grid grid-cols-[1fr_820px] gap-6 flex-1 overflow-hidden">
          <div className="space-y-2 overflow-y-auto px-2 py-1">
          <Label htmlFor="misc-text">Text <Req /></Label>
          <Textarea
            id="misc-text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            className={cls(missing.has("text") && invalidCls)}
          />
          </div>
          <PreviewPane html={previewHtml} size={size} landscape={size === "2x4"} />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => handleClose(false)}>Cancel</Button>
          <Button onClick={handlePrint}>Print</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};