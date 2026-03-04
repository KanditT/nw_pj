"use client";
import { useState, useEffect, useCallback } from "react";
import { Header } from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/lib/api";
import type { Checklist } from "@/lib/types";
import { Plus, X } from "lucide-react";

export default function ChecklistsPage() {
  const [checklists, setChecklists] = useState<Checklist[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", description: "", category: "", created_by: "system" });
  const [items, setItems] = useState([{ description: "", is_mandatory: true, expected_value: "" }]);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const data = await api.checklists.list();
    setChecklists(data);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.checklists.create({
        ...form,
        items: items.filter((i) => i.description).map((i, idx) => ({ ...i, order: idx })),
      });
      setShowForm(false);
      setForm({ name: "", description: "", category: "", created_by: "system" });
      setItems([{ description: "", is_mandatory: true, expected_value: "" }]);
      await load();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <Header
        title="Checklists"
        description="Reusable inspection checklists"
        action={
          <Button onClick={() => setShowForm(!showForm)}>
            <Plus className="h-4 w-4" /> New Checklist
          </Button>
        }
      />

      {showForm && (
        <div className="border-b bg-muted/30 p-6">
          <form onSubmit={handleSubmit} className="space-y-4 max-w-xl">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Name *</Label>
                <Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label>Category</Label>
                <Input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Description</Label>
              <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Items</Label>
                <Button type="button" variant="outline" size="sm" onClick={() => setItems([...items, { description: "", is_mandatory: true, expected_value: "" }])}>
                  <Plus className="h-3 w-3" /> Add
                </Button>
              </div>
              {items.map((item, i) => (
                <div key={i} className="flex gap-2 items-center">
                  <Input placeholder="Description" value={item.description} onChange={(e) => { const n = [...items]; n[i].description = e.target.value; setItems(n); }} />
                  <Input placeholder="Expected" value={item.expected_value} onChange={(e) => { const n = [...items]; n[i].expected_value = e.target.value; setItems(n); }} className="w-32" />
                  <label className="flex items-center gap-1 text-xs whitespace-nowrap">
                    <input type="checkbox" checked={item.is_mandatory} onChange={(e) => { const n = [...items]; n[i].is_mandatory = e.target.checked; setItems(n); }} />
                    Required
                  </label>
                  <Button type="button" variant="ghost" size="icon" onClick={() => setItems(items.filter((_, idx) => idx !== i))}><X className="h-4 w-4" /></Button>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <Button type="submit" disabled={saving}>{saving ? "Saving…" : "Create"}</Button>
              <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
            </div>
          </form>
        </div>
      )}

      <div className="p-6 grid gap-4 grid-cols-1 md:grid-cols-2">
        {loading && <p className="text-sm text-muted-foreground">Loading…</p>}
        {!loading && checklists.length === 0 && <p className="text-sm text-muted-foreground">No checklists yet.</p>}
        {checklists.map((cl) => (
          <Card key={cl.id}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">{cl.name}</CardTitle>
              {cl.category && <span className="text-xs text-muted-foreground">{cl.category}</span>}
            </CardHeader>
            <CardContent>
              <ul className="space-y-1">
                {cl.items.map((item) => (
                  <li key={item.id} className="text-xs flex items-center gap-2">
                    <span className={item.is_mandatory ? "text-red-500" : "text-muted-foreground"}>•</span>
                    {item.description}
                    {item.expected_value && <span className="text-muted-foreground">(Expected: {item.expected_value})</span>}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
