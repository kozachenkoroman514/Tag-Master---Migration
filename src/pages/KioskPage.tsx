import AppSidebar from "@/components/AppSidebar";
import { useMemo, useState } from "react";
import {
  useDashboardStore,
  type OrderStatus,
  WSM_STATUSES,
  STATUSES,
} from "@/store/dashboardStore";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import {
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  ArrowDown,
  Check,
  Printer,
  FileText,
} from "lucide-react";

const TEAM_GROUPS: { key: string; label: string; teams: string[] }[] = [
  { key: "P", label: "Parcel", teams: ["P"] },
  { key: "C", label: "Combos", teams: ["C", "C/F C-Pallet"] },
  { key: "F", label: "Freight", teams: ["F", "F C-Pallet"] },
  { key: "S", label: "SPEC", teams: ["F Spec", "Delivery"] },
  { key: "D", label: "Dropship", teams: ["Dropship"] },
];

const STATUS_CHIP: Record<OrderStatus, string> = {
  PRE: "bg-muted text-muted-foreground border border-border",
  "IN-STASIS": "bg-black text-white dark:bg-white dark:text-black",
  QUEUED: "bg-muted text-foreground",
  ORDERED: "bg-transparent hover:bg-transparent border-2 border-yellow-400 text-yellow-500",
  CUTTING: "bg-transparent hover:bg-transparent border-2 border-yellow-400 text-yellow-500",
  PENDING: "bg-transparent hover:bg-transparent border-2 border-yellow-400 text-yellow-500",
  "IN-BUILD": "bg-yellow-400 text-black",
  PICK: "bg-transparent hover:bg-transparent border-2 border-blue-600 text-blue-600",
  PICKING: "bg-transparent hover:bg-transparent border-2 border-blue-600 text-blue-600",
  PICKED: "bg-blue-600 text-white",
  PACKING: "bg-transparent hover:bg-transparent border-2 border-orange-500 text-orange-500",
  PACKED: "bg-orange-500 text-white",
  "IN-PROCESS": "bg-transparent hover:bg-transparent border-2 border-green-600 text-green-600",
  PROCESSED: "bg-green-600 text-white",
  SHIPPED: "bg-emerald-700 text-white",
  HOLD: "bg-transparent text-purple-600 border-2 border-purple-600",
  ATTENTION: "bg-purple-600 text-white",
  "SEE COMMENTS": "bg-sky-500 text-white",
};

const fmtDate = (iso: string) => {
  const d = new Date(iso + "T00:00:00");
  return `${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")}/${String(d.getFullYear()).slice(-2)}`;
};

// Kiosk visibility: QUEUED is first appearance; disappear once past IN-PROCESS.
// SEE COMMENTS is ILD-only. HOLD shows only while it still requires acknowledgement;
// once acknowledged (manual or ERP-fall) it falls off Kiosk and lives on ILD only.
const VISIBLE_FOR_KIOSK = new Set<OrderStatus>([
  "QUEUED", "ORDERED", "CUTTING", "PENDING", "IN-BUILD",
  "PICK", "PICKING", "PICKED", "PACKING", "PACKED", "IN-PROCESS",
  "HOLD", "ATTENTION",
]);

// Kiosk stage clamps: can't go back past QUEUED, can't go forward past IN-PROCESS.
const KIOSK_MIN_STATUS: OrderStatus = "QUEUED";
const KIOSK_MAX_STATUS: OrderStatus = "IN-PROCESS";

type SortKey = "order" | "projectName" | "team" | "shipBy" | "status";
type SortDir = "asc" | "desc";

const KioskPage = () => {
  const orders = useDashboardStore((s) => s.orders);
  const nextStage = useDashboardStore((s) => s.nextStage);
  const prevStage = useDashboardStore((s) => s.prevStage);
  const acknowledge = useDashboardStore((s) => s.acknowledge);

  const [tab, setTab] = useState(TEAM_GROUPS[0].key);
  const [sortKey, setSortKey] = useState<SortKey>("shipBy");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [confirm, setConfirm] = useState<null | { id: string; direction: "next" | "prev" }>(null);

  const visibleOrders = useMemo(
    () => orders.filter((o) =>
      VISIBLE_FOR_KIOSK.has(o.status)
      && !(o.status === "HOLD" && (!o.requiresAck || o.attentionAckByKiosk))
      && !(o.status === "ATTENTION" && o.attentionAckByKiosk)
    ),
    [orders],
  );

  const grouped = useMemo(() => {
    const map: Record<string, typeof orders> = {};
    for (const g of TEAM_GROUPS) map[g.key] = [];
    for (const o of visibleOrders) {
      for (const g of TEAM_GROUPS) {
        if (g.teams.includes(o.team)) { map[g.key].push(o); break; }
      }
    }
    // sort
    const dir = sortDir === "asc" ? 1 : -1;
    for (const k of Object.keys(map)) {
      map[k] = [...map[k]].sort((a, b) => {
        const av = a[sortKey] as unknown as string;
        const bv = b[sortKey] as unknown as string;
        if (av < bv) return -1 * dir;
        if (av > bv) return 1 * dir;
        return 0;
      });
    }
    return map;
  }, [visibleOrders, sortKey, sortDir]);

  const toggleSort = (k: SortKey) => {
    if (sortKey === k) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(k); setSortDir("asc"); }
  };

  const SortHead = ({ k, children }: { k: SortKey; children: React.ReactNode }) => (
    <th className="px-2 py-1.5">
      <button
        type="button"
        onClick={() => toggleSort(k)}
        className="inline-flex items-center gap-1 hover:text-foreground transition-colors"
      >
        {children}
        {sortKey === k && (sortDir === "asc" ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />)}
      </button>
    </th>
  );

  // Stage warning: triggered when the resulting status falls under WSM control.
  // Clamps: Kiosk cannot go back past QUEUED, nor forward past IN-PROCESS.
  const requestStage = (id: string, direction: "next" | "prev") => {
    const o = orders.find((x) => x.id === id);
    if (!o) return;
    if (direction === "next" && o.status === KIOSK_MAX_STATUS) {
      toast({ title: "Cannot advance", description: "IN-PROCESS is the furthest Kiosk can take an order." });
      return;
    }
    if (direction === "prev" && o.status === KIOSK_MIN_STATUS) {
      toast({ title: "Cannot go back", description: "QUEUED is the furthest back Kiosk can roll an order." });
      return;
    }
    const i = STATUSES.indexOf(o.status);
    const targetIdx =
      direction === "next" ? Math.min(STATUSES.length - 1, (i === -1 ? 0 : i) + 1)
                           : Math.max(0, (i === -1 ? 1 : i) - 1);
    const target = STATUSES[targetIdx];
    const currentIsWsm = WSM_STATUSES.includes(o.status);
    const targetIsWsm = WSM_STATUSES.includes(target);
    if (currentIsWsm || targetIsWsm) {
      setConfirm({ id, direction });
      return;
    }
    if (direction === "next") nextStage(id); else prevStage(id);
    toast({ title: direction === "next" ? "Stage advanced" : "Stage rolled back" });
  };

  const applyConfirm = () => {
    if (!confirm) return;
    if (confirm.direction === "next") nextStage(confirm.id); else prevStage(confirm.id);
    toast({ title: "Override applied", description: "Manual stage change recorded." });
    setConfirm(null);
  };

  const printLabels = (orderIds: string[]) => {
    const w = window.open("", "_blank", "width=900,height=700");
    if (!w) return;
    const escapeHtml = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
    const pages = orderIds.map((id) => {
      const o = orders.find((x) => x.id === id);
      if (!o) return "";
      return `
        <section class="lbl">
          <header>
            <div class="title">ORDER LABEL</div>
            <div class="team">${escapeHtml(o.team)}</div>
          </header>
          <div class="body">
            <div class="row"><span class="k">Order</span><span class="v">${escapeHtml(o.order)}</span></div>
            <div class="row"><span class="k">Project</span><span class="v">${escapeHtml(o.projectName)}</span></div>
            <div class="row"><span class="k">Ship By</span><span class="v">${fmtDate(o.shipBy)}</span></div>
            <div class="row"><span class="k">Ship Via</span><span class="v">${escapeHtml(o.shipVia)}</span></div>
            <div class="row"><span class="k">Status</span><span class="v">${o.status}</span></div>
            <div class="bcs">
              <div><svg class="bc" data-code="${escapeHtml(o.order)}"></svg><div class="lab">${escapeHtml(o.order)}</div></div>
              <div><svg class="bc" data-code="${escapeHtml(o.projectName)}"></svg><div class="lab">${escapeHtml(o.projectName)}</div></div>
            </div>
          </div>
        </section>`;
    }).join("");
    w.document.write(`<!doctype html><html><head><title>Order Labels</title>
      <style>
        @page{size:6in 4in;margin:.15in}
        body{margin:0;font-family:system-ui,Arial,sans-serif;color:#111}
        .lbl{page-break-after:always;width:5.7in;height:3.7in;display:flex;flex-direction:column;border:2px solid #111;padding:8pt;box-sizing:border-box}
        header{display:flex;justify-content:space-between;align-items:center;border-bottom:1.5px solid #111;padding-bottom:4pt;margin-bottom:6pt}
        .title{font-size:14pt;font-weight:800;letter-spacing:.06em}
        .team{font-size:18pt;font-weight:900;padding:2pt 6pt;border:2px solid #111}
        .body{flex:1;display:flex;flex-direction:column;gap:3pt}
        .row{display:flex;gap:8pt;font-size:11pt}
        .k{width:64pt;color:#555;font-weight:600;text-transform:uppercase;font-size:8pt;letter-spacing:.06em;align-self:center}
        .v{font-weight:700}
        .bcs{display:flex;justify-content:space-around;margin-top:auto;gap:8pt}
        .bc{height:38px;width:170px}
        .lab{font-family:'Courier New',monospace;font-size:8pt;text-align:center}
      </style>
      </head><body>${pages}
      <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.6/dist/JsBarcode.all.min.js"></script>
      <script>
        document.querySelectorAll('svg.bc').forEach(function(el){
          try { JsBarcode(el, el.getAttribute('data-code')||' ', { format:'CODE128', displayValue:false, margin:0, height:38 }); } catch(e){}
        });
        setTimeout(function(){ window.print(); }, 350);
      </script>
      </body></html>`);
    w.document.close();
  };

  return (
    <div className="min-h-screen bg-background flex">
      <AppSidebar />
      <main className="flex-1 ml-[100px]">
        <div className="p-6 space-y-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Kiosk</h1>
            <p className="text-sm text-muted-foreground">Team views for Orders — sortable, action-driven</p>
          </div>

          <Tabs value={tab} onValueChange={setTab}>
            <TabsList>
              {TEAM_GROUPS.map((g) => (
                <TabsTrigger key={g.key} value={g.key} className="gap-2">
                  <span className="font-bold">{g.key}</span>
                  <span className="text-xs text-muted-foreground">{g.label}</span>
                  <span className="ml-1 inline-flex items-center justify-center min-w-5 h-5 px-1 rounded-full bg-muted text-foreground text-[10px] font-bold">
                    {grouped[g.key]?.length ?? 0}
                  </span>
                </TabsTrigger>
              ))}
            </TabsList>

            {TEAM_GROUPS.map((g) => (
              <TabsContent key={g.key} value={g.key} className="mt-4">
                <div className="bg-card border border-border rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/40">
                      <tr className="text-left text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                        <SortHead k="order">Order</SortHead>
                        <SortHead k="projectName">Project</SortHead>
                        <SortHead k="team">Team</SortHead>
                        <SortHead k="shipBy">Ship By</SortHead>
                        <SortHead k="status">Status</SortHead>
                        <th className="px-2 py-1.5 w-[280px]">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {grouped[g.key].length === 0 && (
                        <tr>
                          <td colSpan={6} className="px-2 py-8 text-center text-muted-foreground text-sm">
                            No orders for this team.
                          </td>
                        </tr>
                      )}
                      {grouped[g.key].map((o) => {
                        const ackRow = o.requiresAck ? "animate-pulse ring-2 ring-purple-500/60" : "";
                        return (
                          <tr key={o.id} className={`border-t border-border hover:bg-muted/30 ${ackRow}`}>
                            <td className="px-2 py-1.5 font-semibold">{o.order}</td>
                            <td className="px-2 py-1.5">{o.projectName}</td>
                            <td className="px-2 py-1.5"><Badge variant="outline" className="text-[10px]">{o.team}</Badge></td>
                            <td className="px-2 py-1.5 tabular-nums">{fmtDate(o.shipBy)}</td>
                            <td className="px-2 py-1.5">
                              <Badge className={`${STATUS_CHIP[o.status]} font-bold whitespace-nowrap text-[10px] pointer-events-none`}>{o.status}</Badge>
                            </td>
                            <td className="px-2 py-1.5">
                              <div className="flex items-center gap-1 flex-nowrap">
                                <Button size="sm" variant="outline" className="h-6 gap-1 px-1.5 text-[11px] whitespace-nowrap shrink-0" onClick={() => printLabels([o.id])}>
                                  <Printer className="w-3 h-3" /> Labels
                                </Button>
                                <Button
                                  size="sm" variant="outline" className="h-6 gap-1 px-1.5 text-[11px] whitespace-nowrap shrink-0"
                                  onClick={() => toast({ title: "Paperwork — coming soon", description: "Will pull ILD details + ERP API." })}
                                >
                                  <FileText className="w-3 h-3" /> Paperwork
                                </Button>
                                <Button size="sm" variant="outline" className="h-6 gap-1 px-1.5 text-[11px] whitespace-nowrap shrink-0" onClick={() => requestStage(o.id, "prev")}>
                                  <ArrowLeft className="w-3 h-3" /> Back a Stage
                                </Button>
                                <Button
                                  size="sm"
                                  className="h-6 gap-1 px-1.5 text-[11px] bg-[hsl(43_90%_50%)] text-black hover:bg-[hsl(43_90%_45%)] whitespace-nowrap shrink-0"
                                  onClick={() => requestStage(o.id, "next")}
                                >
                                  <ArrowRight className="w-3 h-3" /> Next Stage
                                </Button>
                                {o.requiresAck && (
                                  <Button
                                    size="sm" variant="ghost"
                                    className="h-6 gap-1 px-1.5 text-[11px] text-purple-600 hover:text-purple-700 whitespace-nowrap shrink-0"
                                    onClick={() => {
                                      const twoStage = o.status === "ATTENTION" || o.status === "HOLD";
                                      acknowledge(o.id, "kiosk");
                                      toast({ title: twoStage ? "Acknowledged — removed from Kiosk" : "Acknowledged" });
                                    }}
                                  >
                                    <Check className="w-3 h-3" /> Ack
                                  </Button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </TabsContent>
            ))}
          </Tabs>
        </div>
      </main>

      {/* WSM override confirmation */}
      <Dialog open={!!confirm} onOpenChange={(o) => { if (!o) setConfirm(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Override Woodshop Manager?</DialogTitle>
            <DialogDescription>
              These statuses are tracked from Woodshop Manager automatically. Progress SHOULD be made in
              Woodshop Manager. Do you want to override the automatic status update?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirm(null)}>Cancel</Button>
            <Button onClick={applyConfirm}>Override</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default KioskPage;
