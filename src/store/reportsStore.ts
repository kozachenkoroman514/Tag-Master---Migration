import { create } from "zustand";

export interface ReportRecord {
  id: string;
  title: string;
  date: string;
  type: string;
  status: "pending" | "completed";
}

interface ReportsStore {
  records: ReportRecord[];
}

export const useReportsStore = create<ReportsStore>(() => ({
  records: [
    { id: "1", title: "Monthly Production Summary", date: "2023-10-01", type: "Production", status: "completed" },
    { id: "2", title: "Q3 Inventory Audit", date: "2023-10-05", type: "Inventory", status: "pending" },
  ],
}));
