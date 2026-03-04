"use client";
import { useState, useEffect, useCallback } from "react";
import { Header } from "@/components/layout/header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { api } from "@/lib/api";
import type { InspectionRule } from "@/lib/types";
import { Plus, Trash2 } from "lucide-react";

export default function RulesPage() {
  const [rules, setRules] = useState<InspectionRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    name: "", description: "", item_code: "", inspection_type: "",
    severity: "warning", created_by: "system",
    condition_parameter: "", condition_operator: "between",
    condition_min: "", condition_max: "", condition_value: "",
  });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setRules(await api.rules.list());
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const conditions: Record<string, unknown> = {
      parameter: form.condition_parameter,
      operator: form.condition_operator,
    };
    if (form.condition_operator === "between") {
      conditions.min = parseFloat(form.condition_min);
      conditions.max = parseFloat(form.condition_max);
    } else {
      conditions.value = parseFloat(form.condition_value);
    }
    try {
      await api.rules.create({
        name: form.name, description: form.description,
        item_code: form.item_code || undefined,
        inspection_type: form.inspection_type || undefined,
        severity: form.severity, created_by: form.created_by,
        conditions,
      });
      setShowForm(false);
      await load();
    } finally {
      setSaving(false);
    }
  };

  const deleteRule = async (id: string) => {
    await api.rules.delete(id);
    await load();
  };

  return (
    <div>
      <Header
        title="Inspection Rules"
        description="Rule-based validation engine configuration"
        action={
          <Button onClick={() => setShowForm(!showForm)}>
            <Plus className="h-4 w-4" /> New Rule
          </Button>
        }
      />

      {showForm && (
        <div className="border-b bg-muted/30 p-6">
          <form onSubmit={handleSubmit} className="space-y-4 max-w-xl">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1 col-span-2"><Label>Rule Name *</Label><Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
              <div className="space-y-1"><Label>Item Code (blank = all)</Label><Input value={form.item_code} onChange={(e) => setForm({ ...form, item_code: e.target.value })} /></div>
              <div className="space-y-1"><Label>Inspection Type (blank = all)</Label><Input value={form.inspection_type} onChange={(e) => setForm({ ...form, inspection_type: e.target.value })} /></div>
              <div className="space-y-1">
                <Label>Severity</Label>
                <select className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm" value={form.severity} onChange={(e) => setForm({ ...form, severity: e.target.value })}>
                  <option value="warning">Warning</option>
                  <option value="critical">Critical</option>
                </select>
              </div>
              <div className="space-y-1">
                <Label>Condition Parameter</Label>
                <Input value={form.condition_parameter} onChange={(e) => setForm({ ...form, condition_parameter: e.target.value })} placeholder="e.g. thickness" />
              </div>
              <div className="space-y-1">
                <Label>Operator</Label>
                <select className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm" value={form.condition_operator} onChange={(e) => setForm({ ...form, condition_operator: e.target.value })}>
                  <option value="between">between</option>
                  <option value="gt">gt (&gt;)</option>
                  <option value="gte">gte (&ge;)</option>
                  <option value="lt">lt (&lt;)</option>
                  <option value="lte">lte (&le;)</option>
                  <option value="eq">eq (=)</option>
                </select>
              </div>
              {form.condition_operator === "between" ? (
                <>
                  <div className="space-y-1"><Label>Min Value</Label><Input type="number" value={form.condition_min} onChange={(e) => setForm({ ...form, condition_min: e.target.value })} /></div>
                  <div className="space-y-1"><Label>Max Value</Label><Input type="number" value={form.condition_max} onChange={(e) => setForm({ ...form, condition_max: e.target.value })} /></div>
                </>
              ) : (
                <div className="space-y-1 col-span-2"><Label>Value</Label><Input type="number" value={form.condition_value} onChange={(e) => setForm({ ...form, condition_value: e.target.value })} /></div>
              )}
            </div>
            <div className="space-y-1"><Label>Description</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} /></div>
            <div className="flex gap-2">
              <Button type="submit" disabled={saving}>{saving ? "Saving…" : "Create Rule"}</Button>
              <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
            </div>
          </form>
        </div>
      )}

      <div className="p-6 space-y-3">
        {loading && <p className="text-sm text-muted-foreground">Loading…</p>}
        {!loading && rules.length === 0 && <p className="text-sm text-muted-foreground">No rules defined. Rules validate inspection readings automatically.</p>}
        {rules.map((rule) => (
          <Card key={rule.id}>
            <CardContent className="p-4 flex items-center justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{rule.name}</span>
                  <Badge variant={rule.severity === "critical" ? "destructive" : "warning"}>{rule.severity}</Badge>
                  {!rule.is_active && <Badge variant="outline">inactive</Badge>}
                </div>
                <p className="text-xs text-muted-foreground">
                  {rule.item_code ? `Item: ${rule.item_code}` : "All items"} ·{" "}
                  {rule.inspection_type ? `Type: ${rule.inspection_type}` : "All types"} ·{" "}
                  Condition: {JSON.stringify(rule.conditions)}
                </p>
                {rule.description && <p className="text-xs italic text-muted-foreground">{rule.description}</p>}
              </div>
              <Button variant="ghost" size="icon" onClick={() => deleteRule(rule.id)}>
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
