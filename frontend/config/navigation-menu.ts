import { CheckCircle, ClipboardCheck, LayoutDashboard } from "lucide-react";

export const MENU = [
  {
    name: "Dashboard",
    href: "/",
    icon: LayoutDashboard,
  },
  {
    name: "Item",
    href: "/item",
    icon: ClipboardCheck,
  },
  {
    name: "Supplier",
    href: "/supplier",
    icon: ClipboardCheck,
  },
  {
    name: "Purchase Receipt",
    href: "/purchase-receipt",
    icon: ClipboardCheck,
  },
  {
    name: "QI Parameter",
    href: "/quality-inspection-parameter",
    icon: ClipboardCheck,
  },
  {
    name: "QI Template",
    href: "/quality-inspection-template",
    icon: ClipboardCheck,
  },
  {
    name: "Quality Inspection",
    href: "/quality-inspection",
    icon: ClipboardCheck,
  },
  {
    name: "Approvals",
    href: "/approvals",
    icon: CheckCircle,
  },
];
