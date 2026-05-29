import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Filter, Save, Trash2, ArrowUpDown, X, Plus } from "lucide-react";

export type SortDir = "asc" | "desc" | null;

export interface ColumnFilter {
  key: string;
  values: string[]; // multi-value match (OR within column, AND across columns)
}

export interface FilterState {
  sortKey: string | null;
  sortDir: SortDir;
  dateFrom: string;
  dateTo: string;
  hiddenColumns: string[];
  columnFilters: ColumnFilter[];
}

export interface FilterColumn {
  key: string;
  label: string;
  sortable?: boolean;
  /** Available values for value-filtering. Omit for free-text/unfilterable columns. */
  options?: string[];
}

export const DEFAULT_FILTERS: FilterState = {
  sortKey: null,
  sortDir: null,
  dateFrom: "",
  dateTo: "",
  hiddenColumns: [],
  columnFilters: [],
};

const STORAGE_KEY = "ild.filterPresets.v2";

interface Preset {
  name: string;
  state: FilterState;
}

const loadPresets = (): Preset[] => {
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    return raw.map((p: Preset) => ({
      ...p,
      state: { ...DEFAULT_FILTERS, ...p.state, columnFilters: p.state.columnFilters ?? [] },
    }));
  } catch {
    return [];
  }
};
const savePresets = (p: Preset[]) =>
  localStorage.setItem(STORAGE_KEY, JSON.stringify(p));

interface Props {
  value: FilterState;
  onChange: (v: FilterState) => void;
  columns: FilterColumn[];
}

const DashboardFilters = ({ value, onChange, columns }: Props) => {
  const [presets, setPresets] = useState<Preset[]>([]);
  const [newName, setNewName] = useState("");
  const [newFilterKey, setNewFilterKey] = useState<string>("");

  useEffect(() => {
    setPresets(loadPresets());
  }, []);

  const update = (patch: Partial<FilterState>) => onChange({ ...value, ...patch });

  const toggleHidden = (key: string) => {
    const set = new Set(value.hiddenColumns);
    if (set.has(key)) set.delete(key);
    else set.add(key);
    update({ hiddenColumns: Array.from(set) });
  };

  const sortableCols = columns.filter((c) => c.sortable !== false);
  const filterableCols = columns.filter((c) => c.options && c.options.length > 0);

  const activeCount =
    (value.sortKey ? 1 : 0) +
    (value.dateFrom || value.dateTo ? 1 : 0) +
    value.hiddenColumns.length +
    value.columnFilters.reduce((n, f) => n + (f.values.length > 0 ? 1 : 0), 0);

  const persist = (next: Preset[]) => {
    setPresets(next);
    savePresets(next);
  };

  const saveAs = () => {
    const name = newName.trim();
    if (!name) return;
    const next = [...presets.filter((p) => p.name !== name), { name, state: value }];
    persist(next);
    setNewName("");
  };

  const addColumnFilter = () => {
    if (!newFilterKey) return;
    if (value.columnFilters.some((f) => f.key === newFilterKey)) return;
    update({ columnFilters: [...value.columnFilters, { key: newFilterKey, values: [] }] });
    setNewFilterKey("");
  };

  const removeColumnFilter = (key: string) =>
    update({ columnFilters: value.columnFilters.filter((f) => f.key !== key) });

  const toggleColumnFilterValue = (key: string, val: string) => {
    update({
      columnFilters: value.columnFilters.map((f) => {
        if (f.key !== key) return f;
        const set = new Set(f.values);
        if (set.has(val)) set.delete(val);
        else set.add(val);
        return { ...f, values: Array.from(set) };
      }),
    });
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Filter className="w-4 h-4" />
          Filters
          {activeCount > 0 && (
            <span className="ml-1 inline-flex items-center justify-center min-w-5 h-5 px-1 rounded-full bg-primary text-primary-foreground text-[10px] font-bold">
              {activeCount}
            </span>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg p-0 gap-0">
        <DialogHeader className="px-5 py-4 border-b border-border">
          <DialogTitle className="flex items-center gap-2 text-base">
            <Filter className="w-4 h-4" /> Filters
          </DialogTitle>
        </DialogHeader>
        <div className="p-4 space-y-4 max-h-[70vh] overflow-y-auto">
          {/* Sort */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
              <ArrowUpDown className="w-3.5 h-3.5" /> Sort
            </div>
            <div className="flex gap-2">
              <Select
                value={value.sortKey ?? "__none"}
                onValueChange={(v) =>
                  update({ sortKey: v === "__none" ? null : v, sortDir: v === "__none" ? null : value.sortDir ?? "asc" })
                }
              >
                <SelectTrigger className="h-9 flex-1"><SelectValue placeholder="Column" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none">— None —</SelectItem>
                  {sortableCols.map((c) => (
                    <SelectItem key={c.key} value={c.key}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={value.sortDir ?? "asc"} onValueChange={(v) => update({ sortDir: v as SortDir })}>
                <SelectTrigger className="h-9 w-[120px]" disabled={!value.sortKey}><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="asc">Ascending</SelectItem>
                  <SelectItem value="desc">Descending</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Date range */}
          <div className="space-y-2">
            <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Ship By date range</div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-[10px] text-muted-foreground">From</Label>
                <Input type="date" value={value.dateFrom} onChange={(e) => update({ dateFrom: e.target.value })} className="h-9" />
              </div>
              <div>
                <Label className="text-[10px] text-muted-foreground">To</Label>
                <Input type="date" value={value.dateTo} onChange={(e) => update({ dateTo: e.target.value })} className="h-9" />
              </div>
            </div>
          </div>

          {/* Column value filters (multi) */}
          <div className="space-y-2">
            <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Column filters</div>
            <div className="flex gap-2">
              <Select value={newFilterKey} onValueChange={setNewFilterKey}>
                <SelectTrigger className="h-9 flex-1"><SelectValue placeholder="Add column…" /></SelectTrigger>
                <SelectContent>
                  {filterableCols
                    .filter((c) => !value.columnFilters.some((f) => f.key === c.key))
                    .map((c) => (
                      <SelectItem key={c.key} value={c.key}>{c.label}</SelectItem>
                    ))}
                </SelectContent>
              </Select>
              <Button size="sm" variant="outline" className="h-9 gap-1" onClick={addColumnFilter} disabled={!newFilterKey}>
                <Plus className="w-3.5 h-3.5" /> Add
              </Button>
            </div>
            {value.columnFilters.map((f) => {
              const col = columns.find((c) => c.key === f.key);
              if (!col?.options) return null;
              return (
                <div key={f.key} className="rounded border border-border p-2 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider">{col.label}</span>
                    <button
                      type="button"
                      onClick={() => removeColumnFilter(f.key)}
                      className="text-muted-foreground hover:text-destructive"
                      aria-label={`Remove ${col.label} filter`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-1">
                    {col.options.map((opt) => (
                      <label key={opt} className="flex items-center gap-2 text-xs cursor-pointer py-0.5 px-1.5 rounded hover:bg-muted/50">
                        <Checkbox checked={f.values.includes(opt)} onCheckedChange={() => toggleColumnFilterValue(f.key, opt)} />
                        <span className="truncate">{opt}</span>
                      </label>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Show columns */}
          <div className="space-y-2">
            <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Show columns</div>
            <div className="grid grid-cols-2 gap-1.5">
              {columns.map((c) => {
                const visible = !value.hiddenColumns.includes(c.key);
                return (
                  <label key={c.key} className="flex items-center gap-2 text-xs cursor-pointer py-1 px-1.5 rounded hover:bg-muted/50">
                    <Checkbox checked={visible} onCheckedChange={() => toggleHidden(c.key)} />
                    <span>{c.label}</span>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Presets */}
          <div className="space-y-2 border-t border-border pt-3">
            <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Presets</div>
            <div className="flex gap-2">
              <Input placeholder="Preset name" value={newName} onChange={(e) => setNewName(e.target.value)} className="h-9" />
              <Button size="sm" variant="outline" onClick={saveAs} className="h-9 gap-1">
                <Save className="w-3.5 h-3.5" /> Save
              </Button>
            </div>
            <div className="space-y-1">
              {presets.length === 0 && <div className="text-xs text-muted-foreground italic">No saved presets.</div>}
              {presets.map((p) => (
                <div key={p.name} className="flex items-center justify-between gap-2 px-2 py-1 rounded bg-muted/40">
                  <button type="button" className="text-xs font-medium flex-1 text-left hover:underline" onClick={() => onChange(p.state)}>
                    {p.name}
                  </button>
                  <button
                    type="button"
                    className="text-muted-foreground hover:text-destructive"
                    onClick={() => persist(presets.filter((x) => x.name !== p.name))}
                    aria-label={`Delete ${p.name}`}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end pt-1">
            <Button size="sm" variant="ghost" onClick={() => onChange(DEFAULT_FILTERS)} className="gap-1">
              <X className="w-3.5 h-3.5" /> Clear all
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default DashboardFilters;
