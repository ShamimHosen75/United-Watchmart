import {
  BarChart3, Boxes, Building2, CalendarClock, LayoutDashboard, Receipt, Settings, ShieldCheck, Truck, UserCog,
  Users, Watch, Wrench, ArrowLeftRight, ClipboardList, Globe, Images, type LucideIcon,
} from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Phase in which the module is built. */
  phase: number;
}
export interface NavGroup {
  label: string;
  items: NavItem[];
}

export const CURRENT_PHASE = 6;

export const nav: NavGroup[] = [
  { label: "Overview", items: [{ href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, phase: 1 }] },
  {
    label: "Sales",
    items: [
      { href: "/orders", label: "Orders", icon: Receipt, phase: 2 },
      { href: "/customers", label: "Customers", icon: Users, phase: 2 },
      { href: "/viewings", label: "Viewings", icon: CalendarClock, phase: 2 },
      { href: "/warranties", label: "Warranties", icon: ShieldCheck, phase: 2 },
    ],
  },
  {
    label: "Stock",
    items: [
      { href: "/watches", label: "Watches", icon: Watch, phase: 1 },
      { href: "/inventory", label: "Inventory", icon: Boxes, phase: 1 },
      { href: "/purchases", label: "Purchases", icon: ClipboardList, phase: 3 },
      { href: "/suppliers", label: "Suppliers", icon: Truck, phase: 3 },
      { href: "/transfers", label: "Transfers", icon: ArrowLeftRight, phase: 3 },
    ],
  },
  { label: "Service", items: [{ href: "/repairs", label: "Repairs", icon: Wrench, phase: 4 }] },
  {
    label: "Website",
    items: [
      { href: "/website", label: "Pages", icon: Globe, phase: 6 },
      { href: "/media", label: "Media", icon: Images, phase: 6 },
    ],
  },
  {
    label: "Business",
    items: [
      { href: "/reports", label: "Reports", icon: BarChart3, phase: 5 },
      { href: "/branches", label: "Branches", icon: Building2, phase: 5 },
      { href: "/users", label: "Users", icon: UserCog, phase: 5 },
      { href: "/settings", label: "Settings", icon: Settings, phase: 5 },
    ],
  },
];
