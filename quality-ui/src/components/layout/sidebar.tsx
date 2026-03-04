"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  ClipboardCheck,
  CheckSquare,
  ListChecks,
  ScrollText,
  ShieldCheck,
  BookOpen,
} from "lucide-react";

const nav = [
  { href: "/", label: "Dashboard", icon: ShieldCheck },
  { href: "/approvals", label: "Approvals", icon: CheckSquare },
  { href: "/inspections", label: "Inspections", icon: ClipboardCheck },
  { href: "/checklists", label: "Checklists", icon: ListChecks },
  { href: "/audits", label: "Audit Trail", icon: ScrollText },
  { href: "/rules", label: "Rules", icon: BookOpen },
];

export function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="flex h-screen w-56 flex-col border-r bg-card px-3 py-4">
      <div className="mb-6 px-3">
        <h1 className="text-lg font-bold text-primary">Quality</h1>
        <p className="text-xs text-muted-foreground">Inspection & Approval</p>
      </div>
      <nav className="flex flex-col gap-1">
        {nav.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
              pathname === href
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            )}
          >
            <Icon className="h-4 w-4" />
            {label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
