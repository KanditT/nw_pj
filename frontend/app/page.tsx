"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import axios from "axios";
import { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/data-table";
import {
  Clock,
  CheckCircle2,
  XCircle,
  ClipboardList,
  Package,
  Truck,
  ShieldCheck,
  ArrowRight,
  Users,
  FileSearch,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// ── Types ─────────────────────────────────────────────────────────────────────

interface Stats {
  approval: { pending: number; approved: number; rejected: number };
  totals: {
    quality_inspection: number;
    purchase_receipt: number;
    item: number;
    supplier: number;
  };
}

interface RecentQI {
  name: string;
  item_code: string;
  status: string;
  report_date: string;
  inspected_by: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    Accepted: "bg-green-100 text-green-700",
    Rejected: "bg-red-100 text-red-700",
    Cancelled: "bg-gray-100 text-gray-500",
  };
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
        colors[status] ?? "bg-yellow-100 text-yellow-700"
      }`}
    >
      {status}
    </span>
  );
}

function Skeleton() {
  return <div className="h-8 w-16 animate-pulse rounded bg-muted" />;
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function Home() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [recentQIs, setRecentQIs] = useState<RecentQI[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchAll() {
      try {
        const [statsRes, qiRes] = await Promise.all([
          axios.get(`${process.env.NEXT_PUBLIC_API_BASE_URL}approvals/stats`),
          axios.get(`${process.env.NEXT_PUBLIC_API_BASE_URL}quality-inspections`, {
            params: { page_size: 5, current_page: 1 },
          }),
        ]);
        setStats(statsRes.data);
        setRecentQIs(qiRes.data.data ?? []);
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    }
    fetchAll();
  }, []);

  const approval = stats?.approval ?? { pending: 0, approved: 0, rejected: 0 };
  const totals = stats?.totals ?? {
    quality_inspection: 0,
    purchase_receipt: 0,
    item: 0,
    supplier: 0,
  };
  const totalApprovals = approval.pending + approval.approved + approval.rejected;

  function pct(n: number) {
    return totalApprovals > 0 ? Math.round((n / totalApprovals) * 100) : 0;
  }

  // ── KPI data ────────────────────────────────────────────────────────────────

  const approvalCards = [
    {
      title: "Pending Approvals",
      value: approval.pending,
      icon: Clock,
      color: "text-amber-600",
      bg: "bg-amber-50",
      href: "/approvals",
    },
    {
      title: "Approved",
      value: approval.approved,
      icon: CheckCircle2,
      color: "text-green-600",
      bg: "bg-green-50",
      href: "/approvals",
    },
    {
      title: "Rejected",
      value: approval.rejected,
      icon: XCircle,
      color: "text-red-600",
      bg: "bg-red-50",
      href: "/approvals",
    },
  ];

  const moduleCards = [
    {
      title: "Quality Inspections",
      value: totals.quality_inspection,
      icon: ClipboardList,
      color: "text-blue-600",
      bg: "bg-blue-50",
      href: "/quality-inspection",
    },
    {
      title: "Purchase Receipts",
      value: totals.purchase_receipt,
      icon: Truck,
      color: "text-indigo-600",
      bg: "bg-indigo-50",
      href: "/purchase-receipt",
    },
    {
      title: "Items",
      value: totals.item,
      icon: Package,
      color: "text-violet-600",
      bg: "bg-violet-50",
      href: "/item",
    },
    {
      title: "Suppliers",
      value: totals.supplier,
      icon: Users,
      color: "text-pink-600",
      bg: "bg-pink-50",
      href: "/supplier",
    },
  ];

  const qiColumns = useMemo<ColumnDef<RecentQI>[]>(
    () => [
      { accessorKey: "name", header: "QI No." },
      { accessorKey: "item_code", header: "Item" },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => <StatusBadge status={row.original.status} />,
      },
      { accessorKey: "report_date", header: "Date" },
      { accessorKey: "inspected_by", header: "Inspected By" },
    ],
    [],
  );

  const qiPaginate = useMemo(
    () => ({ current_page: 1, total_page: 1, total: recentQIs.length, page_size: recentQIs.length || 1 }),
    [recentQIs.length],
  );

  const quickActions = [
    { label: "Add Quality Inspection", href: "/quality-inspection", icon: ShieldCheck },
    { label: "View Pending Approvals", href: "/approvals", icon: Clock },
    { label: "Add Purchase Receipt", href: "/purchase-receipt", icon: Truck },
    { label: "Manage QI Templates", href: "/quality-inspection-template", icon: FileSearch },
  ];

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <div className="text-sm text-muted-foreground mt-1">
          Quality Inspection Overview
        </div>
      </div>

      {/* ── Approval Status ──────────────────────────────────────────────────── */}
      <div>
        <h2 className="text-sm font-medium text-muted-foreground mb-3">
          Approval Status
        </h2>
        <div className="grid grid-cols-3 gap-4">
          {approvalCards.map((card) => (
            <Link key={card.title} href={card.href}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="pt-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm text-muted-foreground">
                        {card.title}
                      </div>
                      <div className={`text-3xl font-bold mt-1 ${card.color}`}>
                        {loading ? <Skeleton /> : card.value}
                      </div>
                    </div>
                    <div className={`rounded-full p-3 ${card.bg}`}>
                      <card.icon className={`h-5 w-5 ${card.color}`} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>

      {/* ── Module Totals ────────────────────────────────────────────────────── */}
      <div>
        <h2 className="text-sm font-medium text-muted-foreground mb-3">
          Module Totals
        </h2>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {moduleCards.map((card) => (
            <Link key={card.title} href={card.href}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="pt-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm text-muted-foreground">
                        {card.title}
                      </div>
                      <div className={`text-3xl font-bold mt-1 ${card.color}`}>
                        {loading ? <Skeleton /> : card.value}
                      </div>
                    </div>
                    <div className={`rounded-full p-3 ${card.bg}`}>
                      <card.icon className={`h-5 w-5 ${card.color}`} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>

      {/* ── Bottom row ───────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Recent QIs */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base font-semibold">
              Recent Quality Inspections
            </CardTitle>
            <Link
              href="/quality-inspection"
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              View all <ArrowRight className="h-3 w-3" />
            </Link>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-2">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="h-10 rounded-md bg-muted animate-pulse" />
                ))}
              </div>
            ) : (
              <DataTable
                columns={qiColumns}
                data={recentQIs}
                paginate={qiPaginate}
                changeRowPerPage={() => {}}
                changePaginate={() => {}}
              />
            )}
          </CardContent>
        </Card>

        {/* Right column */}
        <div className="space-y-6">
          {/* Approval Breakdown */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">
                Approval Breakdown
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {totalApprovals === 0 && !loading ? (
                <div className="py-4 text-center text-sm text-muted-foreground">
                  No approvals yet
                </div>
              ) : (
                <>
                  {/* Stacked bar */}
                  <div className="flex h-3 w-full overflow-hidden rounded-full bg-muted">
                    {approval.approved > 0 && (
                      <div
                        className="bg-green-500 transition-all"
                        style={{ width: `${pct(approval.approved)}%` }}
                      />
                    )}
                    {approval.rejected > 0 && (
                      <div
                        className="bg-red-500 transition-all"
                        style={{ width: `${pct(approval.rejected)}%` }}
                      />
                    )}
                    {approval.pending > 0 && (
                      <div
                        className="bg-amber-400 transition-all"
                        style={{ width: `${pct(approval.pending)}%` }}
                      />
                    )}
                  </div>
                  {/* Legend */}
                  <div className="space-y-2 text-sm">
                    {[
                      { label: "Approved", count: approval.approved, dot: "bg-green-500" },
                      { label: "Rejected", count: approval.rejected, dot: "bg-red-500" },
                      { label: "Pending",  count: approval.pending,  dot: "bg-amber-400" },
                    ].map((item) => (
                      <div
                        key={item.label}
                        className="flex items-center justify-between"
                      >
                        <div className="flex items-center gap-2">
                          <span className={`h-2.5 w-2.5 rounded-full ${item.dot}`} />
                          <span className="text-muted-foreground">{item.label}</span>
                        </div>
                        <span className="font-medium">
                          {loading ? "—" : item.count}
                          <span className="ml-1 text-xs text-muted-foreground">
                            ({loading ? "—" : pct(item.count)}%)
                          </span>
                        </span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">
                Quick Actions
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              {quickActions.map((action) => (
                <Link
                  key={action.href}
                  href={action.href}
                  className="flex items-center justify-between rounded-md px-3 py-2 text-sm hover:bg-muted transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <action.icon className="h-4 w-4 text-muted-foreground" />
                    {action.label}
                  </div>
                  <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                </Link>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
