"use client";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { StatusBadge } from "@/components/status-badge";
import { api } from "@/lib/api";
import type { QualityInspection, Checklist } from "@/lib/types";
import { Plus, X, RefreshCw, ClipboardList } from "lucide-react";

interface NewItem {
  parameter: string;
  min_value: string;
  max_value: string;
  actual_value: string;
  is_mandatory?: boolean;
}

const EMPTY_ITEM: NewItem = {
  parameter: "",
  min_value: "",
  max_value: "",
  actual_value: "",
};

export default function InspectionsPage() {
  const router = useRouter();
  const [inspections, setInspections] = useState<QualityInspection[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    inspection_type: "Incoming",
    item_code: "",
    item_name: "",
    created_by: "inspector",
    remarks: "",
  });
  const [items, setItems] = useState<NewItem[]>([{ ...EMPTY_ITEM }]);
  const [saving, setSaving] = useState(false);

  // Checklist state
  const [checklists, setChecklists] = useState<Checklist[]>([]);
  const [selectedChecklistId, setSelectedChecklistId] = useState("");
  const [checklistsLoading, setChecklistsLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const data = await api.inspections.list();
    setInspections(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Load checklists when form opens
  useEffect(() => {
    if (!showForm) return;
    setChecklistsLoading(true);
    api.checklists
      .list()
      .then(setChecklists)
      .finally(() => setChecklistsLoading(false));
  }, [showForm]);

  const handleChecklistSelect = (checklistId: string) => {
    setSelectedChecklistId(checklistId);
    if (!checklistId) return;
    const checklist = checklists.find((c) => c.id === checklistId);
    if (!checklist || checklist.items.length === 0) return;

    const sorted = [...checklist.items].sort((a, b) => a.order - b.order);
    setItems(
      sorted.map((ci) => ({
        parameter: ci.description,
        min_value: "",
        max_value: "",
        actual_value: "",
        is_mandatory: ci.is_mandatory,
      })),
    );
  };

  const addItem = () => setItems([...items, { ...EMPTY_ITEM }]);
  const removeItem = (i: number) =>
    setItems(items.filter((_, idx) => idx !== i));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.inspections.create({
        ...form,
        items: items
          .filter((i) => i.parameter)
          .map((i) => ({
            parameter: i.parameter,
            min_value: i.min_value ? parseFloat(i.min_value) : undefined,
            max_value: i.max_value ? parseFloat(i.max_value) : undefined,
            actual_value: i.actual_value
              ? parseFloat(i.actual_value)
              : undefined,
          })),
      });
      setShowForm(false);
      setForm({
        inspection_type: "Incoming",
        item_code: "",
        item_name: "",
        created_by: "inspector",
        remarks: "",
      });
      setItems([{ ...EMPTY_ITEM }]);
      setSelectedChecklistId("");
      await load();
    } finally {
      setSaving(false);
    }
  };

  const handleCancelForm = () => {
    setShowForm(false);
    setSelectedChecklistId("");
    setItems([{ ...EMPTY_ITEM }]);
  };

  return (
    <div>
      <Header
        title="Inspections"
        description="Manage quality inspections"
        action={
          <div className="flex gap-2">
            <Button variant="outline" size="icon" onClick={load}>
              <RefreshCw className="h-4 w-4" />
            </Button>
            <Button onClick={() => setShowForm(!showForm)}>
              <Plus className="h-4 w-4" /> New Inspection
            </Button>
          </div>
        }
      />

      {showForm && (
        <div className="border-b bg-muted/30 p-6">
          <form onSubmit={handleSubmit} className="space-y-4 max-w-2xl">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Inspection Type</Label>
                <select
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
                  value={form.inspection_type}
                  onChange={(e) =>
                    setForm({ ...form, inspection_type: e.target.value })
                  }
                >
                  <option>Incoming</option>
                  <option>In Process</option>
                  <option>Outgoing</option>
                </select>
              </div>
              <div className="space-y-1">
                <Label>Item Code *</Label>
                <Input
                  required
                  value={form.item_code}
                  onChange={(e) =>
                    setForm({ ...form, item_code: e.target.value })
                  }
                />
              </div>
              <div className="space-y-1">
                <Label>Item Name</Label>
                <Input
                  value={form.item_name}
                  onChange={(e) =>
                    setForm({ ...form, item_name: e.target.value })
                  }
                />
              </div>
              <div className="space-y-1">
                <Label>Inspector</Label>
                <Input
                  value={form.created_by}
                  onChange={(e) =>
                    setForm({ ...form, created_by: e.target.value })
                  }
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Remarks</Label>
              <Textarea
                value={form.remarks}
                onChange={(e) => setForm({ ...form, remarks: e.target.value })}
                rows={2}
              />
            </div>

            {/* ── Checklist Loader ─────────────────────────────────── */}
            <div className="rounded-md border border-dashed border-muted-foreground/40 bg-muted/20 p-3 space-y-1">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <ClipboardList className="h-4 w-4" />
                Load from Checklist
              </div>
              <select
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                value={selectedChecklistId}
                onChange={(e) => handleChecklistSelect(e.target.value)}
                disabled={checklistsLoading}
              >
                <option value="">
                  {checklistsLoading
                    ? "Loading checklists…"
                    : checklists.length === 0
                      ? "No checklists available"
                      : "— select a checklist to auto-fill items —"}
                </option>
                {checklists.map((cl) => (
                  <option key={cl.id} value={cl.id}>
                    {cl.name}
                    {cl.category ? ` [${cl.category}]` : ""}
                  </option>
                ))}
              </select>
              {selectedChecklistId && (
                <p className="text-xs text-muted-foreground">
                  ✓ {items.length} item{items.length !== 1 ? "s" : ""} loaded —
                  <span className="text-red-500 font-medium"> Required</span> items are locked (name &amp; deletion). Fill in actual values below.
                </p>
              )}
            </div>

            {/* ── Inspection Items ──────────────────────────────────── */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Inspection Items</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addItem}
                >
                  <Plus className="h-3 w-3" /> Add
                </Button>
              </div>

              {/* Column headers */}
              <div className="flex gap-2 items-center text-xs text-muted-foreground px-1">
                <span className="flex-1">Parameter</span>
                <span className="w-24 text-center">Min</span>
                <span className="w-24 text-center">Max</span>
                <span className="w-24 text-center">Actual</span>
                <span className="w-8" />
              </div>

              {items.map((item, i) => (
                <div key={i} className={`flex gap-2 items-center rounded-md p-1 ${item.is_mandatory ? "bg-red-50/50 dark:bg-red-900/10" : ""}`}>
                  <div className="flex-1 flex items-center gap-1">
                    {item.is_mandatory ? (
                      <div className="flex-1 flex items-center gap-1.5 h-9 rounded-md border border-input bg-muted/50 px-3 py-1 text-sm cursor-not-allowed">
                        <span className="flex-1 truncate text-muted-foreground">{item.parameter}</span>
                        <span className="shrink-0 text-[10px] font-semibold px-1.5 py-0.5 rounded bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400">
                          Required
                        </span>
                      </div>
                    ) : (
                      <Input
                        placeholder="Parameter name"
                        value={item.parameter}
                        onChange={(e) => {
                          const n = [...items];
                          n[i].parameter = e.target.value;
                          setItems(n);
                        }}
                      />
                    )}
                  </div>
                  <Input
                    placeholder="Min"
                    type="number"
                    value={item.min_value}
                    onChange={(e) => {
                      const n = [...items];
                      n[i].min_value = e.target.value;
                      setItems(n);
                    }}
                    className="w-24"
                  />
                  <Input
                    placeholder="Max"
                    type="number"
                    value={item.max_value}
                    onChange={(e) => {
                      const n = [...items];
                      n[i].max_value = e.target.value;
                      setItems(n);
                    }}
                    className="w-24"
                  />
                  <Input
                    placeholder="Actual"
                    type="number"
                    value={item.actual_value}
                    onChange={(e) => {
                      const n = [...items];
                      n[i].actual_value = e.target.value;
                      setItems(n);
                    }}
                    className="w-24"
                  />
                  {item.is_mandatory ? (
                    <div className="w-8 h-8 shrink-0" /> /* spacer — mandatory items cannot be removed */
                  ) : (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeItem(i)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>

            <div className="flex gap-2">
              <Button type="submit" disabled={saving}>
                {saving ? "Saving…" : "Create Inspection"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={handleCancelForm}
              >
                Cancel
              </Button>
            </div>
          </form>
        </div>
      )}

      <div className="p-6">
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : (
          <div className="space-y-2">
            {inspections.length === 0 && (
              <p className="text-sm text-muted-foreground">
                No inspections yet.
              </p>
            )}
            {inspections.map((insp) => (
              <Card
                key={insp.id}
                className="cursor-pointer hover:shadow-md transition-all"
                onClick={() => router.push(`/inspections/${insp.id}`)}
              >
                <CardContent className="p-4 flex items-center justify-between">
                  <div>
                    <p className="font-medium">
                      {insp.item_code} {insp.item_name && `— ${insp.item_name}`}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {insp.inspection_type} ·{" "}
                      {new Date(insp.created_at).toLocaleDateString()} ·{" "}
                      {insp.created_by}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    {insp.erpnext_name && (
                      <span className="text-xs text-muted-foreground">
                        {insp.erpnext_name}
                      </span>
                    )}
                    <StatusBadge status={insp.status} />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
