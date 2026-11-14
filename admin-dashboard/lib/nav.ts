import {
  ArrowLeftRight, BarChart3, Boxes, Building2, CalendarClock, ClipboardList, Images, LayoutDashboard, Map as MapIcon, Megaphone,
  MessageSquare, PanelsTopLeft, Receipt, Settings, ShieldAlert, ShieldCheck, ShoppingCart, TicketPercent, Truck, UserCog,
  UserRoundSearch, Users, Watch, Wrench, Hand, GalleryHorizontalEnd, FolderOpen, Award, type LucideIcon,
} from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}
export interface NavGroup {
  label: string;
  items: NavItem[];
}

export const nav: NavGroup[] = [
  {
    label: "Store",
    items: [
      { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { href: "/watches", label: "Watches", icon: Watch },
      { href: "/brands", label: "Watch brands", icon: Award },
      { href: "/categories", label: "Categories", icon: FolderOpen },
      { href: "/inventory", label: "Inventory", icon: Boxes },
      { href: "/orders", label: "Orders", icon: Receipt },
      { href: "/checkout-leads", label: "Checkout leads", icon: UserRoundSearch },
      { href: "/risk-review", label: "Risk review", icon: ShieldAlert },
    ],
  },
  {
    label: "Storefront",
    items: [
      { href: "/slider", label: "Slider", icon: GalleryHorizontalEnd },
      { href: "/website", label: "Content & hero", icon: PanelsTopLeft },
      { href: "/media", label: "Media", icon: Images },
      { href: "/reviews", label: "Reviews", icon: MessageSquare },
      { href: "/try-on", label: "Wrist try-on", icon: Hand },
    ],
  },
  {
    label: "Sales & delivery",
    items: [
      { href: "/coupons", label: "Coupons", icon: TicketPercent },
      { href: "/settings/marketing", label: "Marketing", icon: Megaphone },
      { href: "/shipping-zones", label: "Shipping zones", icon: MapIcon },
      { href: "/shipping-methods", label: "Shipping methods", icon: Truck },
    ],
  },
  {
    label: "Clients & service",
    items: [
      { href: "/customers", label: "Customers", icon: Users },
      { href: "/viewings", label: "Viewings", icon: CalendarClock },
      { href: "/warranties", label: "Warranties", icon: ShieldCheck },
      { href: "/repairs", label: "Repairs", icon: Wrench },
    ],
  },
  {
    label: "Supply",
    items: [
      { href: "/purchases", label: "Purchases", icon: ClipboardList },
      { href: "/suppliers", label: "Suppliers", icon: ShoppingCart },
      { href: "/transfers", label: "Transfers", icon: ArrowLeftRight },
    ],
  },
  {
    label: "Business",
    items: [
      { href: "/reports", label: "Reports", icon: BarChart3 },
      { href: "/branches", label: "Branches", icon: Building2 },
      { href: "/users", label: "Users", icon: UserCog },
      { href: "/settings", label: "Settings", icon: Settings },
    ],
  },
];

/** The nav item for a path: the longest href that matches, so /settings/marketing lights Marketing, not Settings. */
export function activeHref(pathname: string): string | null {
  let best: string | null = null;
  for (const g of nav) for (const i of g.items) {
    if ((pathname === i.href || pathname.startsWith(i.href + "/")) && (!best || i.href.length > best.length)) best = i.href;
  }
  return best;
}
