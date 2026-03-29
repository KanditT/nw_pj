import {
  BadgeCheck,
  Building2,
  LayoutDashboard,
  Package,
  Receipt,
  ScrollText,
  ShieldCheck,
  SlidersHorizontal,
  ClipboardList,
} from "lucide-react";

export const MENU = [
  {
    name: "Dashboard",
    href: "/",
    icon: LayoutDashboard,
  },
  {
    name: "Item",
    href: "/item",
    icon: Package,
  },
  {
    name: "Supplier",
    href: "/supplier",
    icon: Building2,
  },
  {
    name: "Purchase Receipt",
    href: "/purchase-receipt",
    icon: Receipt,
  },
  {
    name: "QI Parameter",
    href: "/quality-inspection-parameter",
    icon: SlidersHorizontal,
  },
  {
    name: "QI Template",
    href: "/quality-inspection-template",
    icon: ClipboardList,
  },
  {
    name: "Quality Inspection",
    href: "/quality-inspection",
    icon: ShieldCheck,
  },
  {
    name: "Approvals",
    href: "/approvals",
    icon: BadgeCheck,
  },
  {
    name: "Audit Log",
    href: "/audit-log",
    icon: ScrollText,
  },
];
