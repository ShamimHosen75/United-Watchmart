import type { StaffRole } from "./types";

export const ROLES: { value: StaffRole; label: string; can: string }[] = [
  { value: "owner", label: "Owner", can: "Everything, including other owners" },
  { value: "admin", label: "Admin", can: "Everything except changing owners: staff, branches, settings" },
  { value: "manager", label: "Manager", can: "Catalogue, purchasing, suppliers, reports and marketing, plus daily work" },
  { value: "sales", label: "Sales", can: "Sales, clients, viewings, repairs and stock moves" },
  { value: "technician", label: "Technician", can: "Repairs and stock moves, plus daily work" },
];
