import { create } from "zustand";

export type OrderStatus =
  | "PRE"
  | "IN-STASIS"
  | "QUEUED"
  | "ORDERED"
  | "CUTTING"
  | "PENDING"
  | "IN-BUILD"
  | "PICK"
  | "PICKING"
  | "PICKED"
  | "PACKING"
  | "PACKED"
  | "IN-PROCESS"
  | "PROCESSED"
  | "SHIPPED"
  | "HOLD"
  | "ATTENTION"
  | "SEE COMMENTS";

export type Priority = "top" | "hot" | "normal";

export type ShipVia =
  | "Best Way"
  | "3rd Party"
  | "Collect"
  | "Delivery"
  | "3rd Party Billed"
  | "Overnight"
  | "2 Day"
  | "Willcall"
  | "Dropship";

export type Mode =
  | "LTL - R+L"
  | "LTL - ESTES"
  | "LTL - FedEx Economy"
  | "Parcel - FedEx Overnight Standard"
  | "Parcel - FedEx 2Day"
  | "Delivery"
  | "Willcall"
  | "Dropship";

export type Team =
  | "P"
  | "C"
  | "C/F C-Pallet"
  | "F"
  | "F C-Pallet"
  | "F Spec"
  | "F Spec/Pack"
  | "Delivery"
  | "Dropship";

export const SHIP_VIAS: ShipVia[] = [
  "Best Way",
  "3rd Party",
  "Collect",
  "Delivery",
  "3rd Party Billed",
  "Overnight",
  "2 Day",
  "Willcall",
  "Dropship",
];

export const MODE_OPTIONS_BY_SHIP_VIA: Record<ShipVia, Mode[]> = {
  "Best Way": ["LTL - R+L", "LTL - ESTES", "LTL - FedEx Economy"],
  "3rd Party": ["LTL - R+L", "LTL - ESTES", "LTL - FedEx Economy"],
  "Collect": ["LTL - R+L", "LTL - ESTES", "LTL - FedEx Economy"],
  "Delivery": ["Delivery"],
  "3rd Party Billed": ["LTL - R+L", "LTL - ESTES", "LTL - FedEx Economy"],
  "Overnight": ["Parcel - FedEx Overnight Standard"],
  "2 Day": ["Parcel - FedEx 2Day"],
  "Willcall": ["Willcall"],
  "Dropship": ["Dropship"],
};
export const TEAMS: Team[] = [
  "P",
  "C",
  "C/F C-Pallet",
  "F",
  "F C-Pallet",
  "F Spec",
  "F Spec/Pack",
  
  "Delivery",
  "Dropship",
];
export const STATUSES: OrderStatus[] = [
  "PRE",
  "IN-STASIS",
  "QUEUED",
  "ORDERED",
  "CUTTING",
  "PENDING",
  "IN-BUILD",
  "PICK",
  "PICKING",
  "PICKED",
  "PACKING",
  "PACKED",
  "IN-PROCESS",
  "PROCESSED",
  "SHIPPED",
];

// Statuses tracked from the production system — Next/Back a Stage warnings on these.
export const WSM_STATUSES: OrderStatus[] = ["ORDERED", "CUTTING", "PENDING", "IN-BUILD"];

export type HoldReason = "Sales Changes" | "Material Issues" | "Other";

export interface StatusHistoryEntry {
  status: OrderStatus;
  at: string;
}

export interface MockOrder {
  id: string;
  order: string;
  projectName: string;
  shipBy: string; // ISO yyyy-mm-dd
  shipVia: ShipVia;
  mode: Mode;
  team: Team;
  status: OrderStatus;
  priority: Priority;
  completedValue: string;
  comments: string;
  swp: boolean;
  appearedAt: string; // ISO datetime
  printedAt: string | null; // only set when status === PICKING
  statusHistory: StatusHistoryEntry[];
  holdReason?: { reason: HoldReason; note?: string; at: string };
  seeCommentsReason?: { note: string; at: string };
  requiresAck: boolean; // pulse until acknowledged
  erpHoldFall: boolean; // legacy demo flag
  attentionAckByKiosk: boolean; // ATTENTION: kiosk-side ack done, ILD can finalize
}

const today = new Date();
const addDays = (n: number) => {
  const d = new Date(today);
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
};

const projectNames = [
  "Atlas Frame","Beacon Crate","Cobalt Pallet","Delta Skid","Echo Box",
  "Falcon Lift","Granite Hold","Helix Rack","Ironside","Juniper Case",
  "Kestrel Pack","Lumen Build","Mariner Crate","Nova Skid","Onyx Frame",
  "Pioneer Pack","Quartz Lift","Redwood Box","Sable Case","Titan Pallet",
  "Umber Hold","Vortex Frame","Willow Crate","Xenon Skid","Yuma Pack",
  "Zephyr Lift","Apex Box","Boreal Case","Cinder Pallet","Drift Frame",
  "Ember Crate","Flint Skid","Gale Hold","Harbor Rack","Indigo Build",
  "Jasper Case","Krypton Lift","Larkspur Box","Magnet Pallet","Nimbus Frame",
];

const normalStatuses: OrderStatus[] = [
  "IN-STASIS","QUEUED","ORDERED","CUTTING","PENDING","IN-BUILD","PICK","PICKING","PICKED",
  "PACKING","PACKED","IN-PROCESS","PROCESSED",
];
const statusPool: OrderStatus[] = Array.from(
  { length: 80 },
  (_, i) => normalStatuses[i % normalStatuses.length],
);
// All normal by default; rare HOT/TOP applied below.
const priorityPool: Priority[] = ["normal"];
const shipPool: ShipVia[] = SHIP_VIAS;
const teamPool: Team[] = TEAMS;

const seed: MockOrder[] = Array.from({ length: 80 }, (_, i) => {
  const sv = shipPool[i % shipPool.length];
  const modeOpts = MODE_OPTIONS_BY_SHIP_VIA[sv];
  const status = statusPool[i % statusPool.length];
  const appearedAt = new Date(today.getTime() - ((i * 3600_000 * 5) % (1000 * 3600 * 24 * 7))).toISOString();
  // Seed status history: walk from IN-STASIS up to current (linearly) with synthetic timestamps.
  const idx = normalStatuses.indexOf(status);
  const history: StatusHistoryEntry[] = [];
  if (idx >= 0) {
    for (let s = 0; s <= idx; s++) {
      history.push({
        status: normalStatuses[s],
        at: new Date(new Date(appearedAt).getTime() + s * 1000 * 60 * 47).toISOString(),
      });
    }
  } else {
    history.push({ status, at: appearedAt });
  }
  return {
    id: String(i + 1),
    order: String(430000 + Math.floor(Math.random() * 9999) + i * 7),
    projectName: projectNames[i % projectNames.length],
    shipBy: addDays(((i * 3) % 14) - 3),
    shipVia: sv,
    mode: modeOpts[i % modeOpts.length],
    team: teamPool[i % teamPool.length],
    status,
    priority: priorityPool[i % priorityPool.length],
    completedValue: i % 4 === 0 ? "$0" : `$${(500 + i * 137).toLocaleString()}`,
    comments: i % 3 === 0 ? `Note for order ${i + 1}` : "",
    swp: i % 5 === 0,
    appearedAt,
    // Printed times only exist for orders in PICKING status.
    printedAt:
      status === "PICKING"
        ? new Date(today.getTime() - ((i * 3600_000 * 3) % (1000 * 3600 * 24 * 2))).toISOString()
        : null,
    statusHistory: history,
    requiresAck: false,
    erpHoldFall: false,
    attentionAckByKiosk: false,
  };
});

// Rare priorities: 1 TOP, 2 HOT.
[4].forEach((i) => seed[i] && (seed[i].priority = "top"));
[12, 31].forEach((i) => seed[i] && (seed[i].priority = "hot"));

// Rare HOLD (ERP fall demo).
if (seed[7]) {
  seed[7].status = "HOLD";
  seed[7].requiresAck = true;
  seed[7].erpHoldFall = true;
  seed[7].holdReason = { reason: "Other", note: "ERP placed on hold", at: new Date().toISOString() };
}
// Rare SEE COMMENTS.
if (seed[22]) {
  seed[22].status = "SEE COMMENTS";
  seed[22].seeCommentsReason = { note: "Customer requested confirmation", at: new Date().toISOString() };
}
// One ATTENTION order (lost allocated parts).
if (seed[16]) {
  seed[16].status = "ATTENTION";
  seed[16].requiresAck = true;
  seed[16].attentionAckByKiosk = false;
}

// Seed some PRE-state orders (not yet on ILD LIVE) and SHIPPED orders.
[2, 11, 19, 26, 33, 38, 47, 55, 63, 71].forEach((i) => {
  if (seed[i]) {
    seed[i].status = "PRE";
    seed[i].statusHistory = [{ status: "PRE", at: seed[i].appearedAt }];
    seed[i].printedAt = null;
    seed[i].requiresAck = false;
  }
});
[5, 14, 24, 41, 52, 67, 75].forEach((i) => {
  if (seed[i]) {
    seed[i].status = "SHIPPED";
    seed[i].statusHistory = [
      ...normalStatuses.map((s, idx) => ({
        status: s,
        at: new Date(new Date(seed[i].appearedAt).getTime() + idx * 1000 * 60 * 47).toISOString(),
      })),
      { status: "SHIPPED" as OrderStatus, at: new Date().toISOString() },
    ];
    seed[i].printedAt = null;
    seed[i].requiresAck = false;
  }
});


interface DashboardStore {
  orders: MockOrder[];
  setSwp: (id: string, value: boolean) => void;
  setShipVia: (id: string, value: ShipVia) => void;
  setMode: (id: string, value: Mode) => void;
  setPriority: (id: string, value: Priority) => void;
  setStatus: (id: string, value: OrderStatus) => void;
  setComments: (id: string, value: string) => void;
  nextStage: (id: string) => void;
  prevStage: (id: string) => void;
  setHold: (id: string, reason: HoldReason, note?: string) => void;
  setSeeComments: (id: string, note: string) => void;
  acknowledge: (id, surface?: "kiosk" | "ild") => void;
  fallOff: (id: string) => void;
  setPrintedNow: (id: string) => void;
}

const stamp = (o: MockOrder, value: OrderStatus): MockOrder => {
  // printedAt only valid in PICKING — clear on any transition out.
  const printedAt = value === "PICKING" ? o.printedAt : null;
  return {
    ...o,
    status: value,
    printedAt,
    statusHistory: [...o.statusHistory, { status: value, at: new Date().toISOString() }],
  };
};

export const useDashboardStore = create<DashboardStore>((set) => ({
  orders: seed,
  setSwp: (id, value) =>
    set((s) => ({ orders: s.orders.map((o) => (o.id === id ? { ...o, swp: value } : o)) })),
  setPriority: (id, value) =>
    set((s) => ({ orders: s.orders.map((o) => (o.id === id ? { ...o, priority: value } : o)) })),
  setStatus: (id, value) =>
    set((s) => ({ orders: s.orders.map((o) => (o.id === id ? stamp(o, value) : o)) })),
  setComments: (id, value) =>
    set((s) => ({ orders: s.orders.map((o) => (o.id === id ? { ...o, comments: value } : o)) })),
  setShipVia: (id, value) =>
    set((s) => ({
      orders: s.orders.map((o) => {
        if (o.id !== id) return o;
        const opts = MODE_OPTIONS_BY_SHIP_VIA[value];
        const mode = opts.includes(o.mode) ? o.mode : opts[0];
        return { ...o, shipVia: value, mode };
      }),
    })),
  setMode: (id, value) =>
    set((s) => ({ orders: s.orders.map((o) => (o.id === id ? { ...o, mode: value } : o)) })),
  nextStage: (id) =>
    set((s) => ({
      orders: s.orders.map((o) => {
        if (o.id !== id) return o;
        const i = STATUSES.indexOf(o.status);
        // From HOLD/SEE COMMENTS, treat IN-STASIS as starting point.
        const baseIdx = i === -1 ? 0 : i;
        let nextIdx = Math.min(STATUSES.length - 1, baseIdx + 1);
        // Combos (C, C/F C-Pallet) skip Packaging Ordered stages: ORDERED, CUTTING, PENDING, IN-BUILD.
        const isCombo = o.team === "C" || o.team === "C/F C-Pallet";
        if (isCombo) {
          while (
            nextIdx < STATUSES.length - 1 &&
            (["ORDERED", "CUTTING", "PENDING", "IN-BUILD"] as OrderStatus[]).includes(STATUSES[nextIdx])
          ) {
            nextIdx++;
          }
        }
        return stamp(o, STATUSES[nextIdx]);
      }),
    })),
  prevStage: (id) =>
    set((s) => ({
      orders: s.orders.map((o) => {
        if (o.id !== id) return o;
        const i = STATUSES.indexOf(o.status);
        const baseIdx = i === -1 ? 1 : i;
        let prevIdx = Math.max(0, baseIdx - 1);
        const isCombo = o.team === "C" || o.team === "C/F C-Pallet";
        if (isCombo) {
          while (
            prevIdx > 0 &&
            (["ORDERED", "CUTTING", "PENDING", "IN-BUILD"] as OrderStatus[]).includes(STATUSES[prevIdx])
          ) {
            prevIdx--;
          }
        }
        return stamp(o, STATUSES[prevIdx]);
      }),
    })),
  setHold: (id, reason, note) =>
    set((s) => ({
      orders: s.orders.map((o) => {
        if (o.id !== id) return o;
        const ts = new Date().toISOString();
        const appended = note
          ? `${o.comments ? o.comments + "\n" : ""}[HOLD — ${reason} — ${new Date(ts).toLocaleString()}] ${note}`
          : o.comments;
        return {
          ...stamp(o, "HOLD"),
          holdReason: { reason, note, at: ts },
          comments: appended,
          requiresAck: true,
        };
      }),
    })),
  setSeeComments: (id, note) =>
    set((s) => ({
      orders: s.orders.map((o) => {
        if (o.id !== id) return o;
        const ts = new Date().toISOString();
        const appended = `${o.comments ? o.comments + "\n" : ""}[SEE COMMENTS — Other — ${new Date(ts).toLocaleString()}] ${note}`;
        return {
          ...stamp(o, "SEE COMMENTS"),
          seeCommentsReason: { note, at: ts },
          comments: appended,
        };
      }),
    })),
  acknowledge: (id, surface = "ild") =>
    set((s) => ({
      orders: s.orders.map((o) => {
        if (o.id !== id) return o;
        // ATTENTION two-stage ack: kiosk acks first, ILD finalizes -> PRE.
        if (o.status === "ATTENTION") {
          if (surface === "kiosk") {
            // Kiosk side: mark as kiosk-acked so it falls off Kiosk; ILD keeps pulsing.
            return { ...o, attentionAckByKiosk: true };
          }
          // ILD side: only allowed after kiosk ack. Finalize -> PRE.
          if (!o.attentionAckByKiosk) return o;
          return {
            ...stamp(o, "PRE"),
            requiresAck: false,
            attentionAckByKiosk: false,
          };
        }
        // HOLD two-stage ack: kiosk ack hides from Kiosk, ILD keeps pulsing
        // until ILD ack clears it. Order stays on ILD with HOLD status.
        if (o.status === "HOLD") {
          if (surface === "kiosk") {
            return { ...o, attentionAckByKiosk: true };
          }
          if (!o.attentionAckByKiosk) return o;
          return { ...o, requiresAck: false, attentionAckByKiosk: false };
        }
        // other: just clear the pulse (do NOT remove from board).
        return { ...o, requiresAck: false };
      }),
    })),
  fallOff: (id) =>
    set((s) => ({
      orders: s.orders.map((o) => {
        if (o.id !== id) return o;
        // Simulates ERP "fall off" condition.
        if (o.status === "IN-STASIS") {
          // No ack flow — straight to PRE.
          return {
            ...stamp(o, "PRE"),
            requiresAck: false,
            attentionAckByKiosk: false,
          };
        }
        return {
          ...stamp(o, "ATTENTION"),
          requiresAck: true,
          attentionAckByKiosk: false,
        };
      }),
    })),
  setPrintedNow: (id) =>
    set((s) => ({
      orders: s.orders.map((o) =>
        o.id === id && o.status === "PICKING" ? { ...o, printedAt: new Date().toISOString() } : o,
      ),
    })),
}));
