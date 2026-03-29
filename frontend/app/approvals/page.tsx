"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import { Check, ChevronsUpDown } from "lucide-react";
import { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/data-table";
import { Paginate } from "@/types/paginate";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldGroup } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

// ── Types ─────────────────────────────────────────────────────────────────────

interface ApprovalRequest {
  name: string;
  reference_name: string;
  status: string;
  approved_by?: string;
  approved_at?: string;
  comment?: string;
}

interface UserOption {
  email: string;
}

interface QIDetail {
  name: string;
  naming_series: string;
  report_date: string;
  status: string;
  inspection_type: string;
  reference_type: string;
  reference_name: string;
  item_code: string;
  sample_size: string;
  quality_inspection_template: string;
  inspected_by: string;
  readings: { specification: string; reading_1: string }[];
}

type Tab = "pending" | "history";

// ── HeaderCheckbox — handles indeterminate state inside ColumnDef ─────────────

function HeaderCheckbox({
  checked,
  indeterminate,
  onChange,
}: {
  checked: boolean;
  indeterminate: boolean;
  onChange: () => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (ref.current) ref.current.indeterminate = indeterminate;
  }, [indeterminate]);
  return (
    <input
      ref={ref}
      type="checkbox"
      checked={checked}
      onChange={onChange}
      className="h-4 w-4 cursor-pointer"
    />
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

const Page = () => {
  const [tab, setTab] = useState<Tab>("pending");

  const [pending, setPending] = useState<ApprovalRequest[]>([]);
  const [pendingPaginate, setPendingPaginate] = useState<Paginate>({
    current_page: 1, total_page: 1, total: 0, page_size: 10,
  });
  const [pendingKeyword, setPendingKeyword] = useState("");

  const [history, setHistory] = useState<ApprovalRequest[]>([]);
  const [historyPaginate, setHistoryPaginate] = useState<Paginate>({
    current_page: 1, total_page: 1, total: 0, page_size: 10,
  });
  const [historyKeyword, setHistoryKeyword] = useState("");

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [users, setUsers] = useState<UserOption[]>([]);

  // View QI dialog
  const [viewOpen, setViewOpen] = useState(false);
  const [viewItem, setViewItem] = useState<QIDetail | null>(null);

  // Bulk action dialog
  const [actionOpen, setActionOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<"approve" | "reject">("approve");
  const [approvedBy, setApprovedBy] = useState("");
  const [comment, setComment] = useState("");
  const [approvedByOpen, setApprovedByOpen] = useState(false);
  const [actionError, setActionError] = useState("");

  // ── Fetch ──────────────────────────────────────────────────────────────────

  async function fetchPending() {
    try {
      const res = await axios.get(`${process.env.NEXT_PUBLIC_API_BASE_URL}approvals`, {
        params: {
          current_page: pendingPaginate.current_page,
          page_size: pendingPaginate.page_size,
          ...(pendingKeyword && { keyword: pendingKeyword }),
        },
      });
      setPending(res.data.data ?? []);
      setPendingPaginate(res.data.pagination);
    } catch {
      setPending([]);
    }
  }

  async function fetchHistory() {
    try {
      const res = await axios.get(`${process.env.NEXT_PUBLIC_API_BASE_URL}approvals/history`, {
        params: {
          current_page: historyPaginate.current_page,
          page_size: historyPaginate.page_size,
          ...(historyKeyword && { keyword: historyKeyword }),
        },
      });
      setHistory(res.data.data ?? []);
      setHistoryPaginate(res.data.pagination);
    } catch {
      setHistory([]);
    }
  }

  async function fetchUsers() {
    try {
      const res = await axios.get(`${process.env.NEXT_PUBLIC_API_BASE_URL}users`);
      setUsers(res.data.data ?? []);
    } catch {
      setUsers([]);
    }
  }

  useEffect(() => { fetchUsers(); }, []);
  useEffect(() => { fetchPending(); }, [pendingPaginate.current_page, pendingPaginate.page_size, pendingKeyword]);
  useEffect(() => { fetchHistory(); }, [historyPaginate.current_page, historyPaginate.page_size, historyKeyword]);

  // ── Selection ──────────────────────────────────────────────────────────────

  function toggleAll() {
    setSelected((prev) =>
      prev.size === pending.length
        ? new Set()
        : new Set(pending.map((d) => d.name)),
    );
  }

  function toggleOne(name: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(name) ? next.delete(name) : next.add(name);
      return next;
    });
  }

  // ── View QI ────────────────────────────────────────────────────────────────

  async function handleViewOpen(row: ApprovalRequest) {
    if (!row.reference_name) return;
    try {
      const res = await axios.get(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}quality-inspections/${row.reference_name}`,
      );
      const qi = res.data.data;
      setViewItem({
        name: qi.name,
        naming_series: qi.naming_series ?? "",
        report_date: qi.report_date ?? "",
        status: qi.status ?? "",
        inspection_type: qi.inspection_type ?? "",
        reference_type: qi.reference_type ?? "",
        reference_name: qi.reference_name ?? "",
        item_code: qi.item_code ?? "",
        sample_size: String(qi.sample_size ?? 0),
        quality_inspection_template: qi.quality_inspection_template ?? "",
        inspected_by: qi.inspected_by ?? "",
        readings: (qi.readings ?? []).map(
          (r: { specification?: string; reading_1?: string }) => ({
            specification: r.specification ?? "",
            reading_1: r.reading_1 ?? "",
          }),
        ),
      });
      setViewOpen(true);
    } catch { /* ignore */ }
  }

  // ── Bulk approve/reject ────────────────────────────────────────────────────

  function openAction(action: "approve" | "reject") {
    setPendingAction(action);
    setApprovedBy("");
    setComment("");
    setActionError("");
    setActionOpen(true);
  }

  async function executeAction() {
    if (!approvedBy) { setActionError("Approved By is required"); return; }
    try {
      await Promise.all(
        Array.from(selected).map((name) =>
          axios.post(
            `${process.env.NEXT_PUBLIC_API_BASE_URL}approvals/${name}`,
            null,
            { params: { action: pendingAction, user: approvedBy, comment } },
          ),
        ),
      );
      setActionOpen(false);
      setSelected(new Set());
      fetchPending();
      fetchHistory();
    } catch {
      setActionError("Failed to execute action. Please try again.");
    }
  }

  // ── Cancel approval ────────────────────────────────────────────────────────

  async function handleCancel(name: string) {
    try {
      await axios.post(`${process.env.NEXT_PUBLIC_API_BASE_URL}approvals/${name}/cancel`);
      fetchPending();
      fetchHistory();
    } catch { /* ignore */ }
  }

  // ── Columns ───────────────────────────────────────────────────────────────

  const pendingColumns = useMemo<ColumnDef<ApprovalRequest>[]>(
    () => [
      {
        id: "select",
        header: () => (
          <HeaderCheckbox
            checked={pending.length > 0 && selected.size === pending.length}
            indeterminate={selected.size > 0 && selected.size < pending.length}
            onChange={toggleAll}
          />
        ),
        cell: ({ row }) => (
          <div onClick={(e) => e.stopPropagation()}>
            <input
              type="checkbox"
              checked={selected.has(row.original.name)}
              onChange={() => toggleOne(row.original.name)}
              className="h-4 w-4 cursor-pointer"
            />
          </div>
        ),
      },
      { accessorKey: "name", header: "Request No." },
      { accessorKey: "reference_name", header: "Quality Inspection" },
      { accessorKey: "status", header: "Status" },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [pending, selected],
  );

  const historyColumns = useMemo<ColumnDef<ApprovalRequest>[]>(
    () => [
      { accessorKey: "name", header: "Request No." },
      { accessorKey: "reference_name", header: "Quality Inspection" },
      { accessorKey: "status", header: "Status" },
      { accessorKey: "approved_by", header: "Approved By" },
      {
        accessorKey: "comment",
        header: "Comment",
        cell: ({ row }) => (
          <span className="block max-w-xs truncate">
            {row.original.comment || "—"}
          </span>
        ),
      },
      {
        id: "actions",
        header: "Action",
        cell: ({ row }) => (
          <div onClick={(e) => e.stopPropagation()}>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleCancel(row.original.name)}
            >
              Cancel
            </Button>
          </div>
        ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div>
      {/* ── View QI Dialog ────────────────────────────────────────────────── */}
      <Dialog open={viewOpen} onOpenChange={setViewOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Quality Inspection</DialogTitle>
            <DialogDescription>
              <span className="font-medium text-foreground">{viewItem?.name}</span>
            </DialogDescription>
          </DialogHeader>
          {viewItem && (
            <>
              <FieldGroup>
                <Field><Label>Series</Label><Input value={viewItem.naming_series} disabled /></Field>
                <Field><Label>Report Date</Label><Input type="date" value={viewItem.report_date} disabled /></Field>
                <Field><Label>Status</Label><Input value={viewItem.status} disabled /></Field>
                <Field><Label>Inspection Type</Label><Input value={viewItem.inspection_type} disabled /></Field>
                <Field><Label>Reference Type</Label><Input value={viewItem.reference_type} disabled /></Field>
                <Field><Label>Reference Name</Label><Input value={viewItem.reference_name} disabled /></Field>
                <Field><Label>Item Code</Label><Input value={viewItem.item_code} disabled /></Field>
                <Field><Label>Sample Size</Label><Input value={viewItem.sample_size} disabled /></Field>
                <Field><Label>QI Template</Label><Input value={viewItem.quality_inspection_template} disabled /></Field>
                <Field><Label>Inspected By</Label><Input value={viewItem.inspected_by} disabled /></Field>
              </FieldGroup>
              {viewItem.readings.length > 0 && (
                <div className="mt-4">
                  <Label>Readings</Label>
                  <div className="border rounded-md mt-2 overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-muted">
                        <tr>
                          <th className="text-left p-2 font-medium">Parameter</th>
                          <th className="text-left p-2 font-medium w-36">Reading Value</th>
                        </tr>
                      </thead>
                      <tbody>
                        {viewItem.readings.map((r, i) => (
                          <tr key={i} className="border-t">
                            <td className="p-2 text-sm">{r.specification}</td>
                            <td className="p-2"><Input value={r.reading_1} disabled /></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}
          <DialogFooter className="mt-4">
            <DialogClose asChild>
              <Button type="button" variant="outline">Close</Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Action Dialog ──────────────────────────────────────────────────── */}
      <Dialog open={actionOpen} onOpenChange={setActionOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>
              {pendingAction === "approve" ? "Approve" : "Reject"} Selected ({selected.size})
            </DialogTitle>
            <DialogDescription>
              This will {pendingAction} {selected.size} approval request{selected.size > 1 ? "s" : ""}.
            </DialogDescription>
          </DialogHeader>
          <FieldGroup>
            <Field>
              <Label>Approved By <span className="text-destructive">*</span></Label>
              <Popover open={approvedByOpen} onOpenChange={setApprovedByOpen}>
                <PopoverTrigger asChild>
                  <Button type="button" variant="outline" role="combobox" className="w-full justify-between font-normal">
                    {approvedBy || "Select user..."}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Search user..." />
                    <CommandList>
                      <CommandEmpty>No user found.</CommandEmpty>
                      <CommandGroup>
                        {users.map((u) => (
                          <CommandItem
                            key={u.email}
                            value={u.email}
                            onSelect={() => {
                              setApprovedBy(u.email);
                              setApprovedByOpen(false);
                              setActionError("");
                            }}
                          >
                            <Check className={cn("mr-2 h-4 w-4", approvedBy === u.email ? "opacity-100" : "opacity-0")} />
                            {u.email}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
              {actionError && <p className="text-sm text-destructive mt-1">{actionError}</p>}
            </Field>
            <Field>
              <Label>Comment</Label>
              <Textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Optional comment..."
                rows={3}
              />
            </Field>
          </FieldGroup>
          <DialogFooter className="mt-4">
            <DialogClose asChild>
              <Button type="button" variant="outline">Cancel</Button>
            </DialogClose>
            <Button
              type="button"
              variant={pendingAction === "approve" ? "default" : "destructive"}
              onClick={executeAction}
            >
              Confirm {pendingAction === "approve" ? "Approve" : "Reject"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Tabs ───────────────────────────────────────────────────────────── */}
      <div className="flex gap-1 border-b mb-6">
        {(["pending", "history"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              "px-4 py-2 text-sm font-medium border-b-2 capitalize transition-colors",
              tab === t
                ? "border-foreground text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {t}
            {t === "pending" && pending.length > 0 && (
              <span className="ml-2 rounded-full bg-muted px-2 py-0.5 text-xs">{pending.length}</span>
            )}
            {t === "history" && history.length > 0 && (
              <span className="ml-2 rounded-full bg-muted px-2 py-0.5 text-xs">{history.length}</span>
            )}
          </button>
        ))}
      </div>

      {/* ── Pending Tab ────────────────────────────────────────────────────── */}
      {tab === "pending" && (
        <DataTable
          columns={pendingColumns}
          data={pending}
          paginate={pendingPaginate}
          changeRowPerPage={(v) => {
            setSelected(new Set());
            setPendingPaginate((prev) => ({ ...prev, current_page: 1, page_size: v }));
          }}
          changePaginate={(p) => setPendingPaginate((prev) => ({ ...prev, current_page: p }))}
          onRowClick={handleViewOpen}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Input
                placeholder="Search..."
                value={pendingKeyword}
                onChange={(e) => {
                  setPendingKeyword(e.target.value);
                  setPendingPaginate((prev) => ({ ...prev, current_page: 1 }));
                  setSelected(new Set());
                }}
                className="max-w-sm"
              />
              {selected.size > 0 && (
                <span className="text-sm text-muted-foreground">
                  {selected.size} of {pendingPaginate.total} selected
                </span>
              )}
            </div>
            <div className="flex gap-2">
              <Button disabled={selected.size === 0} onClick={() => openAction("approve")}>
                Approve Selected
              </Button>
              <Button variant="destructive" disabled={selected.size === 0} onClick={() => openAction("reject")}>
                Reject Selected
              </Button>
            </div>
          </div>
        </DataTable>
      )}

      {/* ── History Tab ────────────────────────────────────────────────────── */}
      {tab === "history" && (
        <DataTable
          columns={historyColumns}
          data={history}
          paginate={historyPaginate}
          changeRowPerPage={(v) =>
            setHistoryPaginate((prev) => ({ ...prev, current_page: 1, page_size: v }))
          }
          changePaginate={(p) =>
            setHistoryPaginate((prev) => ({ ...prev, current_page: p }))
          }
          onRowClick={handleViewOpen}
        >
          <div className="mb-4">
            <Input
              placeholder="Search..."
              value={historyKeyword}
              onChange={(e) => {
                setHistoryKeyword(e.target.value);
                setHistoryPaginate((prev) => ({ ...prev, current_page: 1 }));
              }}
              className="max-w-sm"
            />
          </div>
        </DataTable>
      )}
    </div>
  );
};

export default Page;
