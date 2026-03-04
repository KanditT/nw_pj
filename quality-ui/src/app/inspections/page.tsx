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
import type { QualityInspection } from "@/lib/types";
import { Plus, X, RefreshCw } from "lucide-react";

interface NewItem { parameter: string; min_value: string; max_value: string; actual_value: string }

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
  const [items, setItems] = useState<NewItem[]>([{ parameter: "", min_value: "", max_value: "", actual_value: "" }]);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const data = await api.inspections.list();
    setInspections(data);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const addItem = () => setItems([...items, { parameter: "", min_value: "", max_value: "", actual_value: "" }]);
  const removeItem = (i: number) => setItems(items.filter((_, idx) => idx !== i));

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
            actual_value: i.actual_value ? parseFloat(i.actual_value) : undefined,
          })),
      });
      setShowForm(false);
      setForm({ inspection_type: "Incoming", item_code: "", item_name: "", created_by: "inspector", remarks: "" });
      setItems([{ parameter: "", min_value: "", max_value: "", actual_value: "" }]);
      await load();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <Header
        title="Inspections"
        description="Manage quality inspections"
        action={
          <div className="flex gap-2">
            <Button variant="outline" size="icon" onClick={load}><RefreshCw className="h-4 w-4" /></Button>
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
                  onChange={(e) => setForm({ ...form, inspection_type: e.target.value })}
                >
                  <option>Incoming</option>
                  <option>In Process</option>
                  <option>Outgoing</option>
                </select>
              </div>
              <div className="space-y-1">
                <Label>Item Code *</Label>
                <Input required value={form.item_code} onChange={(e) => setForm({ ...form, item_code: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label>Item Name</Label>
                <Input value={form.item_name} onChange={(e) => setForm({ ...form, item_name: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label>Inspector</Label>
                <Input value={form.created_by} onChange={(e) => setForm({ ...form, created_by: e.target.value })} />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Remarks</Label>
              <Textarea value={form.remarks} onChange={(e) => setForm({ ...form, remarks: e.target.value })} rows={2} />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Inspection Items</Label>
                <Button type="button" variant="outline" size="sm" onClick={addItem}><Plus className="h-3 w-3" /> Add</Button>
              </div>
              {items.map((item, i) => (
                <div key={i} className="flex gap-2 items-center">
                  <Input placeholder="Parameter" value={item.parameter} onChange={(e) => { const n = [...items]; n[i].parameter = e.target.value; setItems(n); }} />
                  <Input placeholder="Min" type="number" value={item.min_value} onChange={(e) => { const n = [...items]; n[i].min_value = e.target.value; setItems(n); }} className="w-24" />
                  <Input placeholder="Max" type="number" value={item.max_value} onChange={(e) => { const n = [...items]; n[i].max_value = e.target.value; setItems(n); }} className="w-24" />
                  <Input placeholder="Actual" type="number" value={item.actual_value} onChange={(e) => { const n = [...items]; n[i].actual_value = e.target.value; setItems(n); }} className="w-24" />
                  <Button type="button" variant="ghost" size="icon" onClick={() => removeItem(i)}><X className="h-4 w-4" /></Button>
                </div>
              ))}
            </div>

            <div className="flex gap-2">
              <Button type="submit" disabled={saving}>{saving ? "Saving…" : "Create Inspection"}</Button>
              <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
            </div>
          </form>
        </div>
      )}

      <div className="p-6">
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : (
          <div className="space-y-2">
            {inspections.length === 0 && <p className="text-sm text-muted-foreground">No inspections yet.</p>}
            {inspections.map((insp) => (
              <Card key={insp.id} className="cursor-pointer hover:shadow-md transition-all" onClick={() => router.push(`/inspections/${insp.id}`)}>
                <CardContent className="p-4 flex items-center justify-between">
                  <div>
                    <p className="font-medium">{insp.item_code} {insp.item_name && `— ${insp.item_name}`}</p>
                    <p className="text-xs text-muted-foreground">{insp.inspection_type} · {new Date(insp.created_at).toLocaleDateString()} · {insp.created_by}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    {insp.erpnext_name && <span className="text-xs text-muted-foreground">{insp.erpnext_name}</span>}
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
