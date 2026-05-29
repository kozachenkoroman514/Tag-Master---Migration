import { create } from "zustand";

export type BugUrgency = "low" | "medium" | "high";
export type BugStatus = "open" | "in-progress" | "resolved";

export interface BugReport {
  id: string;
  title: string;
  description: string;
  urgency: BugUrgency;
  location: string;
  status: BugStatus;
  createdAt: string;
}

interface BugReportsStore {
  reports: BugReport[];
  add: (r: Omit<BugReport, "id" | "status" | "createdAt">) => void;
  remove: (id: string) => void;
}

export const useBugReportsStore = create<BugReportsStore>((set) => ({
  reports: [],
  add: (r) =>
    set((s) => ({
      reports: [
        {
          ...r,
          id: crypto.randomUUID(),
          status: "open",
          createdAt: new Date().toISOString(),
        },
        ...s.reports,
      ],
    })),
  remove: (id) => set((s) => ({ reports: s.reports.filter((x) => x.id !== id) })),
}));
