"use client";

import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/data-table";
import { Paginate } from "@/types/paginate";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// ── Types ─────────────────────────────────────────────────────────────────────

interface AuditLog {
  name: string;
  timestamp: string;
  action: string;
  document_type: string;
  document_name: string;
  user: string;
  detail: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const ACTION_COLORS: Record<string, string> = {
  create:         "bg-blue-100 text-blue-700",
  approve:        "bg-green-100 text-green-700",
  reject:         "bg-red-100 text-red-700",
  cancel:         "bg-gray-100 text-gray-500",
  cancel_approval:"bg-amber-100 text-amber-700",
  delete:         "bg-rose-100 text-rose-700",
};

function ActionBadge({ action }: { action: string }) {
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${ACTION_COLORS[action] ?? "bg-muted text-muted-foreground"}`}>
      {action.replace("_", " ")}
    </span>
  );
}

const ACTIONS = ["create", "approve", "reject", "cancel", "cancel_approval", "delete"];
const DOC_TYPES = ["Quality Inspection", "Approval Request"];

// ── Page ──────────────────────────────────────────────────────────────────────

const Page = () => {
  const [data, setData] = useState<AuditLog[]>([]);
  const [paginate, setPaginate] = useState<Paginate>({
    current_page: 1, total_page: 1, total: 0, page_size: 20,
  });
  const [keyword, setKeyword] = useState("");
  const [filterAction, setFilterAction] = useState("all");
  const [filterDocType, setFilterDocType] = useState("all");

  async function fetchData() {
    try {
      const res = await axios.get(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}audit-logs`,
        {
          params: {
            current_page: paginate.current_page,
            page_size: paginate.page_size,
            ...(keyword && { keyword }),
            ...(filterAction !== "all" && { action: filterAction }),
            ...(filterDocType !== "all" && { document_type: filterDocType }),
          },
        },
      );
      setData(res.data.data ?? []);
      setPaginate(res.data.pagination);
    } catch {
      setData([]);
    }
  }

  useEffect(() => {
    fetchData();
  }, [paginate.current_page, paginate.page_size, keyword, filterAction, filterDocType]);

  function handleKeywordChange(e: React.ChangeEvent<HTMLInputElement>) {
    setKeyword(e.target.value);
    setPaginate((prev) => ({ ...prev, current_page: 1 }));
  }

  const columns = useMemo<ColumnDef<AuditLog>[]>(
    () => [
      {
        accessorKey: "timestamp",
        header: "Timestamp",
        cell: ({ row }) => (
          <span className="text-xs text-muted-foreground whitespace-nowrap">
            {row.original.timestamp
              ? new Date(row.original.timestamp).toLocaleString("th-TH")
              : "—"}
          </span>
        ),
      },
      {
        accessorKey: "action",
        header: "Action",
        cell: ({ row }) => <ActionBadge action={row.original.action} />,
      },
      { accessorKey: "document_type", header: "Document Type" },
      { accessorKey: "document_name", header: "Document" },
      {
        accessorKey: "user",
        header: "User",
        cell: ({ row }) => (
          <span className="text-sm">{row.original.user || "—"}</span>
        ),
      },
      {
        accessorKey: "detail",
        header: "Detail",
        cell: ({ row }) => (
          <span className="block max-w-xs truncate text-xs text-muted-foreground">
            {row.original.detail || "—"}
          </span>
        ),
      },
    ],
    [],
  );

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Audit Log</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Activity trail for Quality Inspections and Approvals
        </p>
      </div>

      <DataTable
        columns={columns}
        data={data}
        paginate={paginate}
        changeRowPerPage={(v) =>
          setPaginate((prev) => ({ ...prev, current_page: 1, page_size: v }))
        }
        changePaginate={(p) =>
          setPaginate((prev) => ({ ...prev, current_page: p }))
        }
      >
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <Input
            placeholder="Search document / user / action..."
            value={keyword}
            onChange={handleKeywordChange}
            className="max-w-xs"
          />

          <Select
            value={filterAction}
            onValueChange={(v) => {
              setFilterAction(v);
              setPaginate((prev) => ({ ...prev, current_page: 1 }));
            }}
          >
            <SelectTrigger className="w-44">
              <SelectValue placeholder="All Actions" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Actions</SelectItem>
              {ACTIONS.map((a) => (
                <SelectItem key={a} value={a}>
                  {a.replace("_", " ")}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={filterDocType}
            onValueChange={(v) => {
              setFilterDocType(v);
              setPaginate((prev) => ({ ...prev, current_page: 1 }));
            }}
          >
            <SelectTrigger className="w-52">
              <SelectValue placeholder="All Document Types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Document Types</SelectItem>
              {DOC_TYPES.map((d) => (
                <SelectItem key={d} value={d}>
                  {d}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </DataTable>
    </div>
  );
};

export default Page;
