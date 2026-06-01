import { useState } from "react";
import AppSidebar from "@/components/AppSidebar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Plus, X } from "lucide-react";

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

        {size === "4x6" ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {(
              [
                { kind: "part", label: "Part" },
                { kind: "pack-unit", label: "Pack Unit" },
                { kind: "status-note", label: "Status Note" },
                { kind: "misc", label: "Misc" },
              ] as { kind: LabelKind; label: string }[]
            ).map((tile) => (
              <button
                key={tile.kind}
                type="button"
                onClick={() => setOpenKind(tile.kind)}
                className="bg-card border border-border rounded-lg p-6 min-h-[260px] flex flex-col items-center justify-start gap-4 hover:border-ring transition-colors text-left"
              >
                <div className="text-xs uppercase tracking-widest text-muted-foreground">
                  {tile.label}
                </div>
                <div className="w-48">
                  <LabelTileIcon size="4x6" />
                </div>
                <div className="text-xs text-muted-foreground">4" × 6" label</div>
              </button>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {Array.from({ length: 3 }).map((_, col) => (
              <div
                key={col}
                className="bg-card border border-border rounded-lg p-6 min-h-[420px] flex flex-col items-center justify-start gap-4"
              >
                <div className="text-xs uppercase tracking-widest text-muted-foreground">
                  Column {col + 1}
                </div>
                <div className="w-32">
                  <LabelTileIcon size="2x4" />
                </div>
                <div className="text-xs text-muted-foreground">2" × 4" label preview</div>
              </div>
            ))}
          </div>
        )}

        <PartLabelDialog open={openKind === "part"} onOpenChange={(o) => !o && setOpenKind(null)} />
        <PackUnitLabelDialog open={openKind === "pack-unit"} onOpenChange={(o) => !o && setOpenKind(null)} />
        <StatusNoteLabelDialog open={openKind === "status-note"} onOpenChange={(o) => !o && setOpenKind(null)} />
        <MiscLabelDialog open={openKind === "misc"} onOpenChange={(o) => !o && setOpenKind(null)} />
      </main>
    </div>
  );
};

export default LabelsPage;

// ----------------- Part Label -----------------
const PartLabelDialog = ({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) => {
  const [partType, setPartType] = useState<"wip" | "stock" | "">("");
  const [partNumber, setPartNumber] = useState("");
  const [qty, setQty] = useState("");
  const [jobNumber, setJobNumber] = useState("");
  const [soNumber, setSoNumber] = useState("");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Part Label</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Type *</Label>
            <div className="flex gap-6">
              <label className="flex items-center gap-2 cursor-pointer">
                <Checkbox
                  checked={partType === "wip"}
                  onCheckedChange={(c) => setPartType(c ? "wip" : "")}
                />
                <span className="text-sm">WIP (Direct)</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <Checkbox
                  checked={partType === "stock"}
                  onCheckedChange={(c) => setPartType(c ? "stock" : "")}
                />
                <span className="text-sm">Stock</span>
              </label>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="part-number">Part Number *</Label>
            <Input id="part-number" value={partNumber} onChange={(e) => setPartNumber(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="part-qty">Qty *</Label>
            <Input id="part-qty" type="number" value={qty} onChange={(e) => setQty(e.target.value)} />
          </div>
          {partType === "wip" && (
            <>
              <div className="space-y-2">
                <Label htmlFor="part-job">Job Number *</Label>
                <Input id="part-job" value={jobNumber} onChange={(e) => setJobNumber(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="part-so">SO Number</Label>
                <Input id="part-so" value={soNumber} onChange={(e) => setSoNumber(e.target.value)} />
              </div>
            </>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button>Print</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// ----------------- Pack Unit Label -----------------
const MultiInput = ({
  label,
  values,
  setValues,
  required,
}: {
  label: string;
  values: string[];
  setValues: (v: string[]) => void;
  required?: boolean;
}) => (
  <div className="space-y-2">
    <Label>
      {label} {required && "*"}
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

const PackUnitLabelDialog = ({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) => {
  const [soNumbers, setSoNumbers] = useState<string[]>([""]);
  const [jobNumbers, setJobNumbers] = useState<string[]>([""]);
  const [projectId, setProjectId] = useState("");
  const [unitX, setUnitX] = useState("");
  const [unitN, setUnitN] = useState("");
  const [date, setDate] = useState("");
  const [unitSel, setUnitSel] = useState("");
  const [area, setArea] = useState("");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Pack Unit Label</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <MultiInput label="SO Number" values={soNumbers} setValues={setSoNumbers} required />
          <MultiInput label="Job Number" values={jobNumbers} setValues={setJobNumbers} />
          <div className="space-y-2">
            <Label htmlFor="proj-id">Project ID</Label>
            <Input id="proj-id" value={projectId} onChange={(e) => setProjectId(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Unit Number *</Label>
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
            <Label htmlFor="pack-date">Date (mm/dd/yy) *</Label>
            <Input
              id="pack-date"
              placeholder="mm/dd/yy"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Unit *</Label>
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
          <div className="space-y-2">
            <Label>Area *</Label>
            <Select value={area} onValueChange={setArea}>
              <SelectTrigger>
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
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button>Print</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// ----------------- Status Note Label -----------------
const StatusNoteLabelDialog = ({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) => {
  const [status, setStatus] = useState("");
  const [reason, setReason] = useState("");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Status Note Label</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Status *</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger>
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
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button>Print</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// ----------------- Misc Label -----------------
const MiscLabelDialog = ({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) => {
  const [text, setText] = useState("");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Misc Label</DialogTitle>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="misc-text">Text *</Label>
          <Textarea id="misc-text" value={text} onChange={(e) => setText(e.target.value)} />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button>Print</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};