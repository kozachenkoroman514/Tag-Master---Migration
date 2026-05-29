import { Fragment, useMemo, useState } from "react";
import * as XLSX from "xlsx";
import {
  useDashboardStore,
  type OrderStatus,
  type Priority,
  type Team,
  type HoldReason,
  TEAMS,
  SHIP_VIAS,
  STATUSES,
} from "@/store/dashboardStore";
import {
  Maximize,
  Minimize,
  Search,
  MessageSquare,
  Pencil,
  CheckSquare,
  Square,
  ChevronDown,
  ChevronUp,
  Download,
  FileText,
  Printer,
  PlayCircle,
  Send,
  ChevronRight,
  Package,
  Box,
  Layers,
  Copy,
  Check,
  ArrowRight,
  ArrowLeft,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  RadioGroup,
  RadioGroupItem,
} from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import DashboardFilters, {
  DEFAULT_FILTERS,
  type FilterState,
  type FilterColumn,
} from "./DashboardFilters";

const priorityStyles: Record<Priority, string> = {
  top: "bg-destructive text-destructive-foreground priority-top-warp",
  hot: "bg-warning text-warning-foreground priority-hot-fire",
  normal: "bg-muted text-muted-foreground",
};

const STATUS_COLORS: Record<OrderStatus, string> = {
  PRE: "bg-transparent text-black border-2 border-black dark:text-white dark:border-white",
  "IN-STASIS": "bg-white text-black border border-border dark:bg-white dark:text-black",
  QUEUED: "bg-muted text-muted-foreground",
  ORDERED: "bg-neutral-500 dark:bg-transparent text-yellow-400 border-2 border-yellow-400",
  CUTTING: "bg-neutral-500 dark:bg-transparent text-yellow-400 border-2 border-yellow-400",
  PENDING: "bg-neutral-500 dark:bg-transparent text-yellow-400 border-2 border-yellow-400",
  "IN-BUILD": "bg-yellow-400 text-black",
  PICK: "bg-transparent text-blue-600 border-2 border-blue-600",
  PICKING: "bg-transparent text-blue-600 border-2 border-blue-600",
  PICKED: "bg-blue-600 text-white",
  PACKING: "bg-transparent text-orange-500 border-2 border-orange-500",
  PACKED: "bg-orange-500 text-white",
  "IN-PROCESS": "bg-transparent text-green-600 border-2 border-green-600",
  PROCESSED: "bg-green-600 text-white",
  SHIPPED: "bg-emerald-700 text-white",
  HOLD: "bg-transparent text-purple-600 border-2 border-purple-600",
  ATTENTION: "bg-purple-600 text-white",
  "SEE COMMENTS": "bg-sky-500 text-white",
};

const inStasisLight = "bg-black text-white border border-border";

const ROW_TINT: Partial<Record<OrderStatus, string>> = {
  HOLD: "bg-purple-500/30 hover:bg-purple-500/40",
  ATTENTION: "bg-purple-500/30 hover:bg-purple-500/40",
  "SEE COMMENTS": "bg-sky-500/30 hover:bg-sky-500/40",
  "IN-PROCESS": "bg-green-500/20 hover:bg-green-500/30",
  PROCESSED: "bg-green-600/25 hover:bg-green-600/35",
  SHIPPED: "bg-emerald-600/30 hover:bg-emerald-600/40",
};

const PRIORITY_TINT: Partial<Record<Priority, string>> = {
  top: "bg-destructive/30 hover:bg-destructive/40",
  hot: "bg-warning/35 hover:bg-warning/45",
};

const statusBadgeClass = (s: OrderStatus) => {
  if (s === "IN-STASIS") return `${inStasisLight} dark:bg-white dark:text-black dark:border-border`;
  return STATUS_COLORS[s];
};

const rowClass = (s: OrderStatus, p: Priority, ack: boolean) => {
  const base = ROW_TINT[s] ?? PRIORITY_TINT[p] ?? "hover:bg-muted/30";
  return ack ? `${base} animate-pulse ring-2 ring-purple-500/60` : base;
};

const fmtDate = (iso: string) => {
  const d = new Date(iso + "T00:00:00");
  return `${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")}/${String(d.getFullYear()).slice(-2)}`;
};

const fmtDateTime = (iso: string | null) => {
  if (!iso) return "—";
  const d = new Date(iso);
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const yy = String(d.getFullYear()).slice(-2);
  let h = d.getHours();
  const m = String(d.getMinutes()).padStart(2, "0");
  const ap = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12;
  return `${mm}/${dd}/${yy} ${h}:${m} ${ap}`;
};

const COLUMN_DEFS: FilterColumn[] = [
  { key: "order", label: "Order" },
  { key: "projectName", label: "Project Name" },
  { key: "shipBy", label: "Ship By" },
  { key: "shipVia", label: "Ship Via", options: [...SHIP_VIAS] as string[] },
  { key: "team", label: "Team", options: [...TEAMS] as string[] },
  { key: "status", label: "Status", options: [...STATUSES, "HOLD", "ATTENTION", "SEE COMMENTS"] as string[] },
  { key: "priority", label: "Priority", options: ["top", "hot", "normal"] },
  { key: "mode", label: "Processed Mode" },
  { key: "completedValue", label: "Completed Value" },
  { key: "comments", label: "Comments" },
  { key: "times", label: "Times", sortable: false },
  { key: "swp", label: "SWP" },
];

interface Props {
  fullscreen?: boolean;
  onToggleFullscreen?: () => void;
}

interface PartLine {
  line: number;
  release: number;
  jobNo: string | null; // null for Stock
  partNo: string;
  qty: number;
  source: "Direct (WIP)" | "Stock";
  needBy: string;
  bins: { loc: string; qty: number }[];
}

const Dashboard = ({ fullscreen = false, onToggleFullscreen }: Props) => {
  const orders = useDashboardStore((s) => s.orders);
  const setPriority = useDashboardStore((s) => s.setPriority);
  const setStatus = useDashboardStore((s) => s.setStatus);
  const setCommentsStore = useDashboardStore((s) => s.setComments);
  const nextStage = useDashboardStore((s) => s.nextStage);
  const prevStage = useDashboardStore((s) => s.prevStage);
  const setHoldStore = useDashboardStore((s) => s.setHold);
  const setSeeCommentsStore = useDashboardStore((s) => s.setSeeComments);
  const acknowledge = useDashboardStore((s) => s.acknowledge);
  const fallOff = useDashboardStore((s) => s.fallOff);
  const setPrintedNow = useDashboardStore((s) => s.setPrintedNow);

  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [teamOverrides, setTeamOverrides] = useState<Record<string, Team>>({});
  const [priorityDirty, setPriorityDirty] = useState<Record<string, boolean>>({});
  const [statsExpanded, setStatsExpanded] = useState(false);
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});
  const [timesExpanded, setTimesExpanded] = useState(false);
  const [selectedLines, setSelectedLines] = useState<Record<string, boolean>>({});
  const [editOrderId, setEditOrderId] = useState<string | null>(null);
  const [editComments, setEditComments] = useState("");
  const [editHoldReason, setEditHoldReason] = useState<HoldReason | "">("");
  const [editHoldNote, setEditHoldNote] = useState("");
  const [editSeeNote, setEditSeeNote] = useState("");
  const [packagingOpen, setPackagingOpen] = useState(false);
  const [packagingType, setPackagingType] = useState<null | "crate" | "pallet" | "combo">(null);
  const [copiedPart, setCopiedPart] = useState<string | null>(null);
  const [view, setView] = useState<"full" | "live" | "shipped">("live");

  const hasPendingChanges =
    Object.keys(teamOverrides).length > 0 || Object.values(priorityDirty).some(Boolean);

  // ---------- Mock part-lines (new bin/part rules) ----------
  const partsFor = (id: string): PartLine[] => {
    const seed = Number(id) || 1;
    const lineCount = (seed % 3) + 2;
    const lines: PartLine[] = [];
    // Most orders are matched mirror+chassis sets; ~1 in 4 are
    // single-type replacement projects (either all -C or all -M).
    const isReplacement = seed % 4 === 0;
    const pairMode = !isReplacement;
    // For replacements, alternate which variant the whole order carries.
    const soloVariant: "C" | "M" = seed % 2 === 0 ? "M" : "C";

    const binFor = (source: "Direct (WIP)" | "Stock", qty: number, salt: number): { loc: string; qty: number }[] => {
      if (source === "Direct (WIP)") {
        if (qty < 5) {
          const slot = ((seed + salt) % 12) + 1; // P1-P12
          return [
            { loc: `P${slot}A1`, qty: ((seed + salt) % 6) - 1 }, // sometimes negative
            { loc: `P${((slot % 12) + 1)}A1`, qty: ((seed + salt + 3) % 7) },
          ];
        }
        const letter = ["A", "B", "C", "D"][(seed + salt) % 4];
        return [
          { loc: `AN1${letter}1`, qty: ((seed + salt) % 8) + 2 },
          { loc: `AN1${["A", "B", "C", "D"][(seed + salt + 1) % 4]}1`, qty: ((seed + salt + 2) % 9) - 2 },
        ];
      }
      // Stock
      if (qty < 20) {
        const slot = 24 + ((seed + salt) % 17); // G24-G40
        return [
          { loc: `G${slot}A1`, qty: ((seed + salt) % 25) - 2 },
          { loc: `G${24 + ((seed + salt + 4) % 17)}A1`, qty: ((seed + salt + 5) % 25) },
        ];
      }
      return [
        { loc: `SMZ8`, qty: ((seed + salt) % 50) + 5 },
        { loc: `SMZ8`, qty: ((seed + salt + 7) % 60) },
      ];
    };

    const mkPart = (w: number, h: number, variant: "C" | "M") =>
      `INT4-${w.toFixed(2)}x${h.toFixed(2)}-LHE-30k-${variant}`;

    let jobCounter = 250000 + ((seed * 17) % 9500);
    for (let l = 1; l <= lineCount; l++) {
      const releases = ((seed + l) % 2) + 1;
      const w = 18 + ((seed + l * 3) % 24); // 18-41
      const h = 24 + ((seed + l * 5) % 24); // 24-47
      for (let r = 1; r <= releases; r++) {
        const offset = ((seed + l * 2 + r) % 14) - 3;
        const d = new Date();
        d.setDate(d.getDate() + offset);
        const qty = ((seed + l * r) % 9) + 1;
        const source: PartLine["source"] = (seed + l + r) % 2 === 0 ? "Direct (WIP)" : "Stock";
        lines.push({
          line: l,
          release: r,
          jobNo: source === "Stock" ? null : `J-${jobCounter++}`,
          partNo: mkPart(w, h, pairMode ? "C" : soloVariant),
          qty,
          source,
          needBy: d.toISOString().slice(0, 10),
          bins: binFor(source, qty, l * 10 + r),
        });
        // In pair mode, emit complementary mirror (M) on this same line/release
        if (pairMode && r === 1) {
          lines.push({
            line: l,
            release: r,
            jobNo: source === "Stock" ? null : `J-${jobCounter++}`,
            partNo: mkPart(w, h, "M"),
            qty,
            source,
            needBy: d.toISOString().slice(0, 10),
            bins: binFor(source, qty, l * 10 + r + 100),
          });
        }
      }
    }
    return lines;
  };
  // -----------------------------------------------------------

  const toggleExpand = (id: string) => setExpandedRows((p) => ({ ...p, [id]: !p[id] }));

  const handlePush = () => {
    const affected = new Set<string>([
      ...Object.keys(teamOverrides),
      ...Object.entries(priorityDirty).filter(([, v]) => v).map(([k]) => k),
    ]);
    let advanced = 0;
    affected.forEach((id) => {
      const o = orders.find((x) => x.id === id);
      if (o && o.status === "IN-STASIS") {
        setStatus(id, "QUEUED");
        advanced++;
      }
    });
    setTeamOverrides({});
    setPriorityDirty({});
    toast({
      title: "Pushed to teams",
      description: advanced
        ? `${advanced} order(s) advanced from IN-STASIS to QUEUED.`
        : "Team & Priority changes pushed.",
    });
  };

  const visibleCol = (key: string) => !filters.hiddenColumns.includes(key);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let rows = orders;
    // View filter: FULL = exclude SHIPPED; LIVE = exclude PRE+SHIPPED; SHIPPED = only SHIPPED
    if (view === "live") rows = rows.filter((o) => o.status !== "PRE" && o.status !== "SHIPPED");
    else if (view === "shipped") rows = rows.filter((o) => o.status === "SHIPPED");
    // full view: include everything (PRE + SHIPPED + all live statuses)
    // full view: include everything
    if (q) {
      rows = rows.filter((o) =>
        [o.order, o.projectName, o.team, o.shipVia, o.status]
          .join(" ")
          .toLowerCase()
          .includes(q),
      );
    }
    if (filters.dateFrom) rows = rows.filter((o) => o.shipBy >= filters.dateFrom);
    if (filters.dateTo) rows = rows.filter((o) => o.shipBy <= filters.dateTo);
    // Column value filters: AND across columns, OR within values
    for (const f of filters.columnFilters) {
      if (!f.values.length) continue;
      rows = rows.filter((o) => {
        const v = String((o as unknown as Record<string, unknown>)[f.key] ?? "");
        return f.values.includes(v);
      });
    }
    if (filters.sortKey && filters.sortDir) {
      const k = filters.sortKey as keyof typeof orders[number];
      const dir = filters.sortDir === "asc" ? 1 : -1;
      rows = [...rows].sort((a, b) => {
        const av = a[k] as unknown as string | number | boolean;
        const bv = b[k] as unknown as string | number | boolean;
        if (av == null) return 1;
        if (bv == null) return -1;
        if (av < bv) return -1 * dir;
        if (av > bv) return 1 * dir;
        return 0;
      });
    }
    return rows;
  }, [orders, query, filters, view]);

  const ALL_STATUS_BUCKETS: { key: string; label: string; statuses: OrderStatus[]; chip: string }[] = [
    { key: "PRE", label: "PRE", statuses: ["PRE"], chip: "bg-transparent text-black border-2 border-black dark:text-white dark:border-white" },
    { key: "IN-STASIS", label: "IN-STASIS", statuses: ["IN-STASIS"], chip: "bg-black text-white dark:bg-white dark:text-black border border-border" },
    { key: "QUEUED", label: "QUEUED", statuses: ["QUEUED"], chip: "bg-muted text-foreground border border-border" },
    { key: "ORDERED", label: "ORDERED", statuses: ["ORDERED"], chip: "bg-neutral-500 dark:bg-transparent text-yellow-400 border-2 border-yellow-400" },
    { key: "CUTTING", label: "CUTTING", statuses: ["CUTTING"], chip: "bg-neutral-500 dark:bg-transparent text-yellow-400 border-2 border-yellow-400" },
    { key: "PENDING", label: "PENDING", statuses: ["PENDING"], chip: "bg-neutral-500 dark:bg-transparent text-yellow-400 border-2 border-yellow-400" },
    { key: "IN-BUILD", label: "IN-BUILD", statuses: ["IN-BUILD"], chip: "bg-yellow-400 text-black" },
    { key: "PICK", label: "PICK", statuses: ["PICK"], chip: "bg-transparent text-blue-600 border-2 border-blue-600" },
    { key: "PICKING", label: "PICKING", statuses: ["PICKING"], chip: "bg-transparent text-blue-600 border-2 border-blue-600" },
    { key: "PICKED", label: "PICKED", statuses: ["PICKED"], chip: "bg-blue-600 text-white" },
    { key: "PACKING", label: "PACKING", statuses: ["PACKING"], chip: "bg-transparent text-orange-500 border-2 border-orange-500" },
    { key: "PACKED", label: "PACKED", statuses: ["PACKED"], chip: "bg-orange-500 text-white" },
    { key: "IN-PROCESS", label: "IN-PROCESS", statuses: ["IN-PROCESS"], chip: "bg-transparent text-green-600 border-2 border-green-600" },
    { key: "PROCESSED", label: "PROCESSED", statuses: ["PROCESSED"], chip: "bg-green-600 text-white" },
    { key: "SHIPPED", label: "SHIPPED", statuses: ["SHIPPED"], chip: "bg-emerald-700 text-white" },
    { key: "HOLD", label: "HOLD", statuses: ["HOLD"], chip: "bg-transparent text-purple-600 border-2 border-purple-600" },
    { key: "ATTENTION", label: "ATTENTION", statuses: ["ATTENTION"], chip: "bg-purple-600 text-white" },
    { key: "SEE COMMENTS", label: "SEE COMMENTS", statuses: ["SEE COMMENTS"], chip: "bg-sky-500 text-white" },
  ];

  const STATUS_BUCKETS = ALL_STATUS_BUCKETS.filter((b) => {
    if (view === "shipped") return b.key === "SHIPPED";
    if (view === "full") return true;
    // live
    return b.key !== "PRE" && b.key !== "SHIPPED";
  });

  const startOfToday = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  }, []);

  const bucketStats = useMemo(() => {
    return STATUS_BUCKETS.map((b) => {
      const items = orders.filter((o) => b.statuses.includes(o.status));
      let pastDue = 0, dueToday = 0, future = 0;
      for (const o of items) {
        const t = new Date(o.shipBy + "T00:00:00").getTime();
        if (t < startOfToday) pastDue++;
        else if (t === startOfToday) dueToday++;
        else future++;
      }
      return { ...b, total: items.length, pastDue, dueToday, future };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orders, startOfToday, view]);

  const toggle = (id: string) => setSelected((p) => ({ ...p, [id]: !p[id] }));
  const teamFor = (o: { id: string; team: Team }): Team => teamOverrides[o.id] ?? o.team;
  const selectedIds = Object.entries(selected).filter(([, v]) => v).map(([k]) => k);

  const copyPart = async (partNo: string) => {
    try {
      await navigator.clipboard.writeText(partNo);
      setCopiedPart(partNo);
      setTimeout(() => setCopiedPart((c) => (c === partNo ? null : c)), 1200);
    } catch {
      toast({ title: "Copy failed", variant: "destructive" });
    }
  };

  const handleExport = () => {
    const rows = filtered.map((o) => ({
      Order: o.order,
      "Project Name": o.projectName,
      "Ship By": o.shipBy,
      "Ship Via": o.shipVia,
      Team: o.team,
      Status: o.status,
      Priority: o.priority.toUpperCase(),
      "Processed Mode": o.mode,
      "Completed Value": o.completedValue,
      Comments: o.comments,
      Appeared: o.appearedAt,
      Printed: o.printedAt ?? "",
      SWP: o.swp ? "Yes" : "No",
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "ILD Orders");
    XLSX.writeFile(wb, `ild-export-${new Date().toISOString().slice(0, 10)}.xlsx`);
    toast({ title: "Export ready", description: `${filtered.length} rows exported to Excel.` });
  };

  const handleReport = () => {
    const w = window.open("", "_blank", "width=900,height=1100");
    if (!w) return;
    const rows = filtered.map((o) => `
      <tr>
        <td>${o.order}</td><td>${o.projectName}</td><td>${fmtDate(o.shipBy)}</td>
        <td>${o.team}</td><td>${o.status}</td><td>${o.priority}</td><td>${o.completedValue}</td>
      </tr>`).join("");
    w.document.write(`<!doctype html><html><head><title>ILD Report</title>
      <style>body{font-family:system-ui;padding:24px}h1{margin:0 0 8px}
      table{width:100%;border-collapse:collapse;font-size:12px}
      th,td{border:1px solid #ddd;padding:6px 8px;text-align:left}
      th{background:#f3f3f3;text-transform:uppercase;font-size:10px;letter-spacing:.08em}</style>
      </head><body><h1>ILD Report</h1>
      <p>Generated ${new Date().toLocaleString()} — ${filtered.length} orders</p>
      <table><thead><tr><th>Order</th><th>Project</th><th>Ship By</th><th>Team</th><th>Status</th><th>Priority</th><th>Completed</th></tr></thead>
      <tbody>${rows}</tbody></table></body></html>`);
    w.document.close();
    setTimeout(() => w.print(), 300);
  };

  const handlePrint = () => {
    if (selectedIds.length === 0) {
      toast({ title: "No selection", description: "Select orders to print picklists.", variant: "destructive" });
      return;
    }
    // Stamp printedAt for any PICKING orders being printed.
    selectedIds.forEach((id) => setPrintedNow(id));
    const w = window.open("", "_blank", "width=1200,height=900");
    if (!w) return;
    const escapeHtml = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
    const picks = filtered.filter((o) => selected[o.id]).map((o) => {
      const lines = partsFor(o.id);
      const linesHtml = lines.map((p) => `
        <tr>
          <td>${p.line}.${p.release}</td>
          <td>${escapeHtml(p.needBy)}</td>
          <td>${p.source === "Stock" ? "—" : escapeHtml(p.jobNo ?? "")}</td>
          <td><svg class="bc" data-code="${escapeHtml(p.partNo)}"></svg><div class="bc-label">${escapeHtml(p.partNo)}</div>
            <div class="bins">${p.bins.map((b) => `<span class="${b.qty < 0 ? "neg" : ""}">${escapeHtml(b.loc)} (${b.qty})</span>`).join(" · ")}</div>
          </td>
          <td class="qty">${p.qty}</td>
          <td>${escapeHtml(p.source)}</td>
        </tr>`).join("");
      return `
      <section class="pick">
        <header>
          <div class="hdr-left">
            <h2>Picklist</h2>
            <div class="meta"><strong>Project:</strong> ${escapeHtml(o.projectName)} · <strong>Team:</strong> ${escapeHtml(o.team)} · <strong>Ship By:</strong> ${fmtDate(o.shipBy)} · <strong>Ship Via:</strong> ${escapeHtml(o.shipVia)}</div>
          </div>
          <div class="hdr-right">
            <div class="bc-block"><div class="bc-cap">Order #</div><svg class="bc bc-lg" data-code="${escapeHtml(o.order)}"></svg><div class="bc-label">${escapeHtml(o.order)}</div></div>
            <div class="bc-block"><div class="bc-cap">Project ID</div><svg class="bc bc-lg" data-code="${escapeHtml(o.projectName)}"></svg><div class="bc-label">${escapeHtml(o.projectName)}</div></div>
          </div>
        </header>
        <table class="lines">
          <thead><tr><th>Ln.Rel</th><th>Ship By</th><th>Job #</th><th>Part # / Bins</th><th>Qty</th><th>Source</th></tr></thead>
          <tbody>${linesHtml}</tbody>
        </table>
        ${o.comments ? `<p class="cmt"><strong>Comments:</strong> ${escapeHtml(o.comments)}</p>` : ""}
      </section>`;
    }).join("");
    w.document.write(`<!doctype html><html><head><title>Picklists</title>
      <style>
        @page{size:11in 8.5in;margin:.4in}
        body{margin:0;font-family:system-ui,Arial,sans-serif;color:#111}
        .pick{page-break-after:always;padding:0 0 12pt}
        header{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid #111;padding-bottom:8pt;margin-bottom:10pt}
        h2{margin:0;font-size:24pt;letter-spacing:.04em;text-transform:uppercase}
        .meta{font-size:10pt;margin-top:4pt;color:#333}
        .hdr-right{display:flex;gap:18pt}
        .bc-block{text-align:center}
        .bc-cap{font-size:8pt;text-transform:uppercase;letter-spacing:.08em;color:#666;margin-bottom:2pt}
        .bc{height:36px;width:160px}
        .bc-lg{height:48px;width:200px}
        .bc-label{font-family:'Courier New',monospace;font-size:9pt;margin-top:1pt}
        table.lines{width:100%;border-collapse:collapse;font-size:10pt}
        table.lines th{background:#eee;text-align:left;padding:5pt 6pt;border:1px solid #999;text-transform:uppercase;font-size:8.5pt;letter-spacing:.06em}
        table.lines td{padding:5pt 6pt;border:1px solid #ccc;vertical-align:middle}
        table.lines td.qty{text-align:right;font-weight:700}
        .bins{margin-top:3pt;font-size:9pt;color:#333}
        .bins .neg{color:#b00020;font-weight:700}
        .cmt{margin-top:10pt;font-size:10pt;border-top:1px solid #ddd;padding-top:6pt}
      </style>
      </head><body>${picks}
      <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.6/dist/JsBarcode.all.min.js"></script>
      <script>
        document.querySelectorAll('svg.bc').forEach(function(el){
          try { JsBarcode(el, el.getAttribute('data-code') || ' ', { format:'CODE128', displayValue:false, margin:0, height: el.classList.contains('bc-lg') ? 48 : 36 }); } catch(e){}
        });
        setTimeout(function(){ window.print(); }, 400);
      </script>
      </body></html>`);
    w.document.close();
  };

  const openEdit = (id: string) => {
    const o = orders.find((x) => x.id === id);
    setEditOrderId(id);
    setEditComments(o?.comments ?? "");
    setEditHoldReason("");
    setEditHoldNote("");
    setEditSeeNote("");
  };

  const saveEdit = () => {
    if (!editOrderId) return;
    setCommentsStore(editOrderId, editComments);
    if (editHoldReason) {
      if (editHoldReason === "Other" && !editHoldNote.trim()) {
        toast({ title: "Note required", description: "HOLD — Other requires a typed note.", variant: "destructive" });
        return;
      }
      setHoldStore(editOrderId, editHoldReason as HoldReason, editHoldNote.trim() || undefined);
    }
    if (editSeeNote.trim()) {
      setSeeCommentsStore(editOrderId, editSeeNote.trim());
    }
    toast({ title: "Saved", description: "Order updated." });
    setEditOrderId(null);
  };

  return (
    <div className="p-6 space-y-4">
      {fullscreen ? (
        <div className="flex justify-end">
          {onToggleFullscreen && (
            <Button variant="outline" size="sm" className="gap-2" onClick={onToggleFullscreen}>
              <Minimize className="w-4 h-4" /> Exit Fullscreen
            </Button>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">ILD</h1>
            <p className="text-sm text-muted-foreground">Interactive Logistics Dashboard</p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-2 bg-card border border-border rounded-full px-3 py-1 w-[220px]">
              <Search className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              <Input
                placeholder="Search…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="border-0 shadow-none focus-visible:ring-0 px-0 h-6 bg-transparent text-xs"
              />
            </div>
            <DashboardFilters value={filters} onChange={setFilters} columns={COLUMN_DEFS} />
            <Button size="sm" className="resume-shift-btn gap-2 rounded-md font-semibold">
              <PlayCircle className="w-4 h-4" /> Resume Shift
            </Button>
            <Button variant="outline" size="sm" className="gap-2" onClick={handleExport}>
              <Download className="w-4 h-4" /> Export
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="gap-2 border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
              onClick={handleReport}
            >
              <FileText className="w-4 h-4" /> Report
            </Button>
            <Button
              size="sm"
              disabled={selectedIds.length === 0}
              className="gap-2 bg-[hsl(43_90%_50%)] text-black hover:bg-[hsl(43_90%_45%)] disabled:opacity-40"
              onClick={handlePrint}
            >
              <Printer className="w-4 h-4" /> Print
            </Button>
            <Button
              size="sm"
              disabled={!hasPendingChanges}
              className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-40"
              onClick={handlePush}
            >
              <Send className="w-4 h-4" /> Push
            </Button>
            {/* Animated VIEW slider — right aligned next to Fullscreen */}
            {(() => {
              const VIEW_OPTIONS = [
                { key: "full", label: "Full View" },
                { key: "live", label: "Live" },
                { key: "shipped", label: "Shipped" },
              ] as const;
              const idx = VIEW_OPTIONS.findIndex((v) => v.key === view);
              const itemW = 88; // px per option
              const viewCounts = {
                full: orders.length,
                live: orders.filter((o) => o.status !== "PRE" && o.status !== "SHIPPED").length,
                shipped: orders.filter((o) => o.status === "SHIPPED").length,
              };
              return (
                <div className="ml-auto flex flex-col items-center gap-0.5">
                  <div
                    className="relative inline-flex items-center bg-card border border-border rounded-full p-0.5 text-[11px] font-bold uppercase tracking-widest"
                    role="tablist"
                    aria-label="View"
                  >
                    <span
                      className="absolute top-0.5 bottom-0.5 rounded-full bg-[hsl(43_90%_50%)] shadow-[0_0_12px_hsl(43_90%_50%/0.6)] transition-transform duration-300 ease-out"
                      style={{
                        width: `${itemW}px`,
                        transform: `translateX(${idx * itemW}px)`,
                      }}
                      aria-hidden="true"
                    />
                    {VIEW_OPTIONS.map((v) => {
                      const active = view === v.key;
                      return (
                        <button
                          key={v.key}
                          type="button"
                          role="tab"
                          aria-selected={active}
                          onClick={() => setView(v.key)}
                          className={`relative z-10 text-center px-3 py-1 rounded-full transition-colors ${
                            active ? "text-black" : "text-muted-foreground hover:text-foreground"
                          }`}
                          style={{ width: `${itemW}px` }}
                        >
                          {v.label}
                        </button>
                      );
                    })}
                  </div>
                  <div className="flex">
                    {VIEW_OPTIONS.map((v) => {
                      const active = view === v.key;
                      return (
                        <div
                          key={`count-${v.key}`}
                          className={`text-center text-[10px] font-bold transition-colors ${
                            active ? "text-[hsl(43_90%_50%)]" : "text-muted-foreground"
                          }`}
                          style={{ width: `${itemW}px` }}
                        >
                          {viewCounts[v.key]}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}
            {onToggleFullscreen && (
              <Button variant="outline" size="sm" className="gap-2" onClick={onToggleFullscreen}>
                <Maximize className="w-4 h-4" /> Fullscreen
              </Button>
            )}
          </div>

          <div className="bg-card border border-border rounded-lg overflow-hidden self-start max-w-full overflow-x-auto flex flex-col">
            <div className="flex items-stretch flex-1">
              <div className="flex flex-col border-r border-border bg-muted/20 text-right shrink-0">
                <div className="px-3 h-9 flex items-center justify-end text-[11px] font-bold uppercase tracking-widest text-muted-foreground border-b border-border">
                  Status
                </div>
                {statsExpanded ? (
                  <div className="flex-1 flex flex-col justify-around">
                    <div className="px-3 py-1 flex items-center justify-end text-xs font-semibold uppercase tracking-wide text-destructive">Past</div>
                    <div className="px-3 py-1 flex items-center justify-end text-xs font-semibold uppercase tracking-wide text-orange-500">Today</div>
                    <div className="px-3 py-1 flex items-center justify-end text-xs font-semibold uppercase tracking-wide text-green-600 dark:text-green-500">Future</div>
                  </div>
                ) : (
                  <div className="flex-1 flex items-center justify-end px-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Total</div>
                )}
              </div>

              {bucketStats.map((b) => (
                <div key={b.key} className="flex flex-col border-r border-border last:border-r-0 text-center min-w-[88px]">
                  <div className="px-2 h-9 border-b border-border flex items-center justify-center">
                    <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider whitespace-nowrap ${b.chip}`}>
                      {b.label}
                    </span>
                  </div>
                  {statsExpanded ? (
                    <div className="flex-1 flex flex-col justify-around">
                      <div className="px-2 py-1 flex items-center justify-center text-xs tabular-nums font-bold text-foreground">{b.pastDue}</div>
                      <div className="px-2 py-1 flex items-center justify-center text-xs tabular-nums font-bold text-foreground">{b.dueToday}</div>
                      <div className="px-2 py-1 flex items-center justify-center text-xs tabular-nums font-bold text-foreground">{b.future}</div>
                    </div>
                  ) : (
                    <div className="flex-1 flex items-center justify-center px-2 text-sm tabular-nums font-bold text-foreground">{b.total}</div>
                  )}
                </div>
              ))}

              <div className="flex items-start p-1 border-l border-border">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0"
                  onClick={() => setStatsExpanded((v) => !v)}
                  aria-label={statsExpanded ? "Collapse" : "Expand"}
                >
                  {statsExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </Button>
              </div>
            </div>
          </div>

        </div>
      )}

      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/40">
            <tr className="text-left text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
              <th className="px-2 py-1.5 w-8"></th>
              {visibleCol("order") && <th className="px-2 py-1.5">Order</th>}
              {visibleCol("projectName") && <th className="px-2 py-1.5">Project Name</th>}
              {visibleCol("shipBy") && <th className="px-2 py-1.5">Ship By</th>}
              {visibleCol("shipVia") && <th className="px-2 py-1.5">Ship Via</th>}
              {visibleCol("team") && <th className="px-2 py-1.5">Team</th>}
              {visibleCol("status") && <th className="px-2 py-1.5">Status</th>}
              {visibleCol("priority") && <th className="px-2 py-1.5">Priority</th>}
              {visibleCol("mode") && <th className="px-2 py-1.5">Processed Mode</th>}
              {visibleCol("completedValue") && <th className="px-2 py-1.5">Completed Value</th>}
              {visibleCol("comments") && <th className="px-2 py-1.5">Comments</th>}
              {visibleCol("times") && (
                <th className="px-2 py-1.5">
                  <button
                    type="button"
                    onClick={() => setTimesExpanded((v) => !v)}
                    className="inline-flex items-center gap-1 hover:text-foreground transition-colors"
                    aria-label={timesExpanded ? "Collapse Times" : "Expand Times"}
                  >
                    Times {timesExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                  </button>
                </th>
              )}
              {visibleCol("swp") && <th className="px-2 py-1.5 w-10">SWP</th>}
              <th className="px-2 py-1.5 w-10">Ack</th>
              <th className="px-2 py-1.5 w-10">Edit</th>
              <th className="px-2 py-1.5 w-8"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((o) => {
              const isOpen = !!expandedRows[o.id];
              const parts = isOpen ? partsFor(o.id) : [];
              const visibleColCount =
                1 +
                ["order","projectName","shipBy","shipVia","team","status","priority","mode","completedValue","comments","times","swp"]
                  .filter((k) => visibleCol(k)).length +
                3; // Ack + Edit + Expand
              return (
                <Fragment key={o.id}>
                  <tr className={`border-t border-border ${rowClass(o.status, o.priority, o.requiresAck)} ${selected[o.id] ? "!bg-foreground !text-background [&_td]:!text-background" : ""}`}>
                    <td className="px-2 py-1.5 align-top">
                      <Checkbox checked={!!selected[o.id]} onCheckedChange={() => toggle(o.id)} />
                    </td>
                    {visibleCol("order") && <td className="px-2 py-1.5 font-semibold align-top whitespace-normal break-words">{o.order}</td>}
                    {visibleCol("projectName") && <td className="px-2 py-1.5 align-top whitespace-normal break-words">{o.projectName}</td>}
                    {visibleCol("shipBy") && <td className="px-2 py-1.5 tabular-nums align-top whitespace-nowrap">{fmtDate(o.shipBy)}</td>}
                    {visibleCol("shipVia") && <td className="px-2 py-1.5 align-top whitespace-normal break-words">{o.shipVia}</td>}
                    {visibleCol("team") && (
                      <td className="px-2 py-1.5 align-top">
                        {o.status === "IN-STASIS" ? (
                          <span className="text-xs text-muted-foreground">—</span>
                        ) : (
                          <Select
                            value={teamFor(o)}
                            onValueChange={(v) => setTeamOverrides((p) => ({ ...p, [o.id]: v as Team }))}
                          >
                            <SelectTrigger className="h-7 w-[120px] text-foreground bg-background text-xs"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {TEAMS.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        )}
                      </td>
                    )}
                    {visibleCol("status") && (
                      <td className="px-2 py-1.5 align-top">
                        <Badge className={`${statusBadgeClass(o.status)} font-bold whitespace-nowrap text-[10px] pointer-events-none`}>{o.status}</Badge>
                      </td>
                    )}
                    {visibleCol("priority") && (
                      <td className="px-2 py-1.5 align-top">
                        {o.status === "IN-STASIS" ? (
                          <span className="text-xs text-muted-foreground">—</span>
                        ) : (
                          <Select
                            value={o.priority}
                            onValueChange={(v) => {
                              setPriority(o.id, v as Priority);
                              setPriorityDirty((p) => ({ ...p, [o.id]: true }));
                            }}
                          >
                            <SelectTrigger
                              className={`h-7 w-[90px] border-0 font-bold uppercase justify-center [&>svg]:hidden text-xs ${priorityStyles[o.priority]}`}
                            >
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="top">TOP</SelectItem>
                              <SelectItem value="hot">HOT</SelectItem>
                              <SelectItem value="normal">NORMAL</SelectItem>
                            </SelectContent>
                          </Select>
                        )}
                      </td>
                    )}
                    {visibleCol("mode") && <td className="px-2 py-1.5 align-top whitespace-normal break-words">{["IN-PROCESS","PROCESSED","SHIPPED"].includes(o.status) ? o.mode : ""}</td>}
                    {visibleCol("completedValue") && <td className="px-2 py-1.5 tabular-nums align-top whitespace-nowrap">{o.completedValue}</td>}
                    {visibleCol("comments") && (
                      <td className="px-2 py-1.5 align-top">
                        {o.comments ? (
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-6 px-1.5">
                                <MessageSquare className="w-3.5 h-3.5 mr-1" /> View
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="text-sm max-w-xs whitespace-pre-wrap">{o.comments}</PopoverContent>
                          </Popover>
                        ) : (
                          <span className="text-muted-foreground/50 text-xs">—</span>
                        )}
                      </td>
                    )}
                    {visibleCol("times") && (
                      <td className="px-2 py-1.5 align-top whitespace-nowrap text-xs">
                        {timesExpanded ? (
                          <div className="space-y-0.5">
                            <div><span className="text-muted-foreground">Appeared:</span> <span className="tabular-nums">{fmtDateTime(o.appearedAt)}</span></div>
                            <div><span className="text-muted-foreground">Printed:</span> <span className="tabular-nums">{fmtDateTime(o.printedAt)}</span></div>
                            {o.statusHistory.length > 0 && (
                              <div className="pt-1 mt-1 border-t border-border/50">
                                <div className="text-[10px] font-semibold uppercase text-muted-foreground mb-0.5">Status timeline</div>
                                {o.statusHistory.map((h, i) => (
                                  <div key={i} className="flex gap-2">
                                    <span className="font-semibold w-[88px] truncate">{h.status}</span>
                                    <span className="tabular-nums text-muted-foreground">{fmtDateTime(h.at)}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">…</span>
                        )}
                      </td>
                    )}
                    {visibleCol("swp") && (
                      <td className="px-2 py-1.5 align-top">
                        <span className="inline-flex items-center justify-center text-foreground" title="Ship When Possible (set by data)">
                          {o.swp ? <CheckSquare className="w-4 h-4" strokeWidth={2.25} /> : <Square className="w-4 h-4 text-muted-foreground/60" strokeWidth={2.25} />}
                        </span>
                      </td>
                    )}
                    <td className="px-2 py-1.5 align-top">
                      {o.requiresAck ? (() => {
                        const isAttention = o.status === "ATTENTION";
                        const isHold = o.status === "HOLD";
                        const twoStage = isAttention || isHold;
                        const disabled = twoStage && !o.attentionAckByKiosk;
                        return (
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={disabled}
                            className="h-6 w-6 p-0 text-purple-600 hover:text-purple-700 disabled:opacity-40"
                            aria-label="Acknowledge"
                            title={
                              disabled
                                ? "Awaiting Kiosk acknowledgement"
                                : isAttention
                                  ? "Acknowledge ATTENTION (order → PRE)"
                                  : "Acknowledge"
                            }
                            onClick={() => {
                              acknowledge(o.id, "ild");
                              toast({
                                title: isAttention ? "Acknowledged — order set to PRE" : "Acknowledged",
                              });
                            }}
                          >
                            <Check className="w-3.5 h-3.5" />
                          </Button>
                        );
                      })() : (
                        <span className="text-muted-foreground/30 text-xs">—</span>
                      )}
                    </td>
                    <td className="px-2 py-1.5 align-top">
                      <Button variant="ghost" size="sm" className="h-6 w-6 p-0" aria-label="Edit order" onClick={() => openEdit(o.id)}>
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                    </td>
                    <td className="px-2 py-1.5 align-top">
                      <Button variant="ghost" size="sm" className="h-6 w-6 p-0" aria-label={isOpen ? "Collapse order" : "Expand order"} onClick={() => toggleExpand(o.id)}>
                        {isOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                      </Button>
                    </td>
                  </tr>
                  {isOpen && (
                    <tr key={`${o.id}-children`} className="bg-muted/20 border-t border-border">
                      <td colSpan={visibleColCount} className="px-3 py-3">
                        <div className="ml-8 border-l-2 border-primary/40 pl-4">
                          {(() => {
                            const orderLineKeys = parts.map((p, idx) => `${o.id}:${p.line}:${p.release}:${idx}`);
                            const anyLineSelected = orderLineKeys.some((k) => selectedLines[k]);
                            return (
                          <div className="flex items-start justify-between gap-3 mb-2">
                            <div className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground shrink-0 pt-1">
                              Line Items
                            </div>
                            <div className="flex items-center gap-1.5 flex-nowrap">
                              <Button
                                variant="outline" size="sm" disabled={!anyLineSelected}
                                className="gap-1 h-6 px-2 text-[11px] disabled:opacity-40 whitespace-nowrap shrink-0"
                                onClick={() => { setPackagingType(null); setPackagingOpen(true); }}
                              >
                                <Package className="w-3 h-3" /> ORDER PACKAGING
                              </Button>
                              <Button
                                variant="outline" size="sm" disabled={!anyLineSelected}
                                className="gap-1 h-6 px-2 text-[11px] disabled:opacity-40 whitespace-nowrap shrink-0"
                                onClick={() => toast({ title: "Assign", description: "Assign flow coming soon." })}
                              >
                                <Send className="w-3 h-3" /> ASSIGN
                              </Button>
                              <Button
                                variant="outline" size="sm" className="gap-1 h-6 px-2 text-[11px] whitespace-nowrap shrink-0"
                                onClick={() => { prevStage(o.id); toast({ title: "Stage rolled back" }); }}
                              >
                                <ArrowLeft className="w-3 h-3" /> BACK A STAGE
                              </Button>
                              {view !== "shipped" && (
                                <Button
                                  size="sm"
                                  className="gap-1 h-6 px-2 text-[11px] bg-[hsl(43_90%_50%)] text-black hover:bg-[hsl(43_90%_45%)] whitespace-nowrap shrink-0"
                                  onClick={() => { nextStage(o.id); toast({ title: "Stage advanced" }); }}
                                >
                                  <ArrowRight className="w-3 h-3" /> NEXT STAGE
                                </Button>
                              )}
                            </div>
                          </div>
                            );
                          })()}
                          <table className="w-full text-xs">
                            <thead>
                              <tr className="text-left text-muted-foreground">
                                <th className="py-1 pr-2 font-semibold w-6"></th>
                                <th className="py-1 pr-2 font-semibold">Line</th>
                                <th className="py-1 pr-2 font-semibold">Release</th>
                                <th className="py-1 pr-2 font-semibold">Ship By</th>
                                <th className="py-1 pr-2 font-semibold">Job Number</th>
                                <th className="py-1 pr-2 font-semibold">Part Number</th>
                                <th className="py-1 pr-2 font-semibold">Qty</th>
                                <th className="py-1 pr-2 font-semibold">Source</th>
                              </tr>
                            </thead>
                            <tbody>
                              {parts.map((p, idx) => {
                                const lineKey = `${o.id}:${p.line}:${p.release}:${idx}`;
                                return (
                                  <tr key={idx} className="border-t border-border/60 align-top">
                                    <td className="py-1 pr-2">
                                      <Checkbox
                                        checked={!!selectedLines[lineKey]}
                                        onCheckedChange={() => setSelectedLines((s) => ({ ...s, [lineKey]: !s[lineKey] }))}
                                      />
                                    </td>
                                    <td className="py-1 pr-2 tabular-nums">{p.line}</td>
                                    <td className="py-1 pr-2 tabular-nums">{p.release}</td>
                                    <td className="py-1 pr-2 tabular-nums">{fmtDate(p.needBy)}</td>
                                    <td className="py-1 pr-2 font-mono">
                                      {p.source === "Stock" ? <span className="text-muted-foreground/50">—</span> : p.jobNo}
                                    </td>
                                    <td className="py-1 pr-2 font-mono">
                                      <div className="flex items-center gap-1.5">
                                        <span>{p.partNo}</span>
                                        <button
                                          type="button"
                                          onClick={() => copyPart(p.partNo)}
                                          className="text-muted-foreground hover:text-foreground transition-colors"
                                          aria-label={`Copy ${p.partNo}`}
                                          title="Copy part number"
                                        >
                                          {copiedPart === p.partNo ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
                                        </button>
                                      </div>
                                      <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-sm mt-1">
                                        {p.bins.map((b, bi) => (
                                          <div
                                            key={bi}
                                            className={`tabular-nums ${b.qty < 0 ? "text-red-600 font-bold" : "text-muted-foreground"}`}
                                          >
                                            Bin {bi + 1}: {b.loc} ({b.qty})
                                          </div>
                                        ))}
                                      </div>
                                    </td>
                                    <td className="py-1 pr-2 tabular-nums font-semibold">{p.qty}</td>
                                    <td className="py-1 pr-2">
                                      <span
                                        className={
                                          "inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide " +
                                          (p.source === "Direct (WIP)"
                                            ? "bg-amber-500/15 text-amber-600 dark:text-amber-400 ring-1 ring-amber-500/30"
                                            : "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 ring-1 ring-emerald-500/30")
                                        }
                                      >
                                        {p.source}
                                      </span>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={16} className="px-3 py-10 text-center text-muted-foreground text-sm">No orders.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Edit Order overlay */}
      <Dialog open={editOrderId !== null} onOpenChange={(o) => { if (!o) setEditOrderId(null); }}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Edit Order</DialogTitle>
            <DialogDescription>
              {editOrderId ? `Order #${orders.find((x) => x.id === editOrderId)?.order ?? ""}` : ""}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Comments</Label>
              <Textarea value={editComments} onChange={(e) => setEditComments(e.target.value)} rows={4} placeholder="Add comments…" />
            </div>

            <div className="space-y-2 border-t border-border pt-3">
              <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Set HOLD</Label>
              <RadioGroup
                value={editHoldReason}
                onValueChange={(v) => setEditHoldReason(v as HoldReason | "")}
                className="grid grid-cols-1 gap-1"
              >
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="" id="hold-none" />
                  <Label htmlFor="hold-none" className="text-xs text-muted-foreground">— None —</Label>
                </div>
                {(["Sales Changes", "Material Issues", "Other"] as HoldReason[]).map((r) => (
                  <div key={r} className="flex items-center gap-2">
                    <RadioGroupItem value={r} id={`hold-${r}`} />
                    <Label htmlFor={`hold-${r}`} className="text-sm">{r}</Label>
                  </div>
                ))}
              </RadioGroup>
              {editHoldReason === "Other" && (
                <Textarea
                  value={editHoldNote}
                  onChange={(e) => setEditHoldNote(e.target.value)}
                  rows={2}
                  placeholder="Required: describe the hold reason (auto-added to comments)…"
                />
              )}
            </div>

            <div className="space-y-2 border-t border-border pt-3">
              <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Set SEE COMMENTS</Label>
              <Textarea
                value={editSeeNote}
                onChange={(e) => setEditSeeNote(e.target.value)}
                rows={2}
                placeholder="Other — required note (auto-added to comments). Leave blank to skip."
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              className="mr-auto border-purple-600/60 text-purple-600 hover:bg-purple-600/10 hover:text-purple-600"
              onClick={() => {
                if (!editOrderId) return;
                const o = orders.find((x) => x.id === editOrderId);
                const wasStasis = o?.status === "IN-STASIS";
                fallOff(editOrderId);
                setEditOrderId(null);
                toast({
                  title: wasStasis ? "Order set to PRE" : "Order set to ATTENTION",
                  description: wasStasis
                    ? "Was IN-STASIS — skipped ATTENTION and ack flow."
                    : "Will pulse on Kiosk until acked, then on ILD until finalized to PRE.",
                });
              }}
            >
              Fall Off (Simulate ERP)
            </Button>
            <Button variant="outline" onClick={() => setEditOrderId(null)}>Cancel</Button>
            <Button onClick={saveEdit}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Order Packaging overlay */}
      <Dialog open={packagingOpen} onOpenChange={(o) => { setPackagingOpen(o); if (!o) setPackagingType(null); }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {packagingType
                ? `Request ${packagingType === "crate" ? "Crate" : packagingType === "pallet" ? "Pallet" : "Combo"}`
                : "Order Packaging"}
            </DialogTitle>
            <DialogDescription>
              {packagingType ? "Submit a packaging request to the Woodshop." : "Choose the packaging type to request."}
            </DialogDescription>
          </DialogHeader>

          {!packagingType ? (
            <div className="grid grid-cols-3 gap-4 py-4">
              {[
                { key: "crate", label: "Crate", Icon: Box },
                { key: "pallet", label: "Pallet", Icon: Layers },
                { key: "combo", label: "Combo", Icon: Package },
              ].map(({ key, label, Icon }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setPackagingType(key as "crate" | "pallet" | "combo")}
                  className="group flex flex-col items-center justify-center gap-3 rounded-xl border border-border p-6 transition-all hover:scale-[1.02] hover:border-[hsl(43_90%_50%)] hover:shadow-lg bg-gradient-to-br from-white to-[hsl(43_90%_50%)] dark:from-black dark:to-[hsl(43_90%_50%)]"
                >
                  <Icon className="w-20 h-20 text-foreground/80 group-hover:text-foreground" strokeWidth={1.5} />
                  <span className="text-sm font-bold uppercase tracking-widest text-foreground">{label}</span>
                </button>
              ))}
            </div>
          ) : (
            <div className="space-y-3 py-2">
              <p className="text-sm text-muted-foreground">
                {packagingType === "combo"
                  ? "Combo request: custom calculation form will go here. Submission will later be linked to the Woodshop Manager via API."
                  : `${packagingType === "crate" ? "Crate" : "Pallet"} request form placeholder. Submission will later be linked to the Woodshop Manager via API.`}
              </p>
              <div className="rounded-md border border-dashed border-border p-4 text-xs text-muted-foreground">
                Selected line items from the order will be attached to this request to drive paperwork notation.
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setPackagingType(null)}>Back</Button>
                <Button onClick={() => { toast({ title: "Request queued", description: `${packagingType} request prepared.` }); setPackagingOpen(false); setPackagingType(null); }}>
                  Submit
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Dashboard;
