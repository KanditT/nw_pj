"use client";
import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import { Header } from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/status-badge";
import { api } from "@/lib/api";
import type { QualityInspection } from "@/lib/types";
import { CheckCircle, AlertTriangle, Send, RefreshCw } from "lucide-react";

export default function InspectionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [inspection, setInspection] = useState<QualityInspection | null>(null);
  const [validation, setValidation] = useState<{ passed: boolean; violations: unknown[]; warnings: unknown[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [requesting, setRequesting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const data = await api.inspections.get(id);
    setInspection(data);
    setLoading(false);
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const validate = async () => {
    const result = await api.inspections.validate(id);
    setValidation(result);
  };

  const syncErpnext = async () => {
    setSyncing(true);
    try { await api.inspections.syncErpnext(id); await load(); } finally { setSyncing(false); }
  };

  const requestApproval = async () => {
    setRequesting(true);
    try {
      await api.approvals.create({
        inspection_id: id,
        requested_by: "inspector",
        priority: "normal",
      });
      await load();
    } finally {
      setRequesting(false);
    }
  };

  if (loading) return <div className="p-6 text-sm text-muted-foreground">Loading…</div>;
  if (!inspection) return <div className="p-6 text-sm text-red-500">Inspection not found.</div>;

  return (
    <div>
      <Header
        title={`Inspection — ${inspection.item_code}`}
        description={inspection.item_name}
        action={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={validate}><CheckCircle className="h-4 w-4" /> Validate Rules</Button>
            <Button variant="outline" size="sm" onClick={syncErpnext} disabled={syncing}><RefreshCw className="h-4 w-4" /> {syncing ? "Syncing…" : "Sync ERPNext"}</Button>
            {inspection.status === "draft" && (
              <Button size="sm" onClick={requestApproval} disabled={requesting}>
                <Send className="h-4 w-4" /> {requesting ? "Requesting…" : "Request Approval"}
              </Button>
            )}
          </div>
        }
      />
      <div className="p-6 space-y-4">
        <Card>
          <CardHeader><CardTitle className="text-sm">Details</CardTitle></CardHeader>
          <CardContent>
            <dl className="grid grid-cols-2 gap-3 text-sm">
              {[
                ["Status", <StatusBadge key="s" status={inspection.status} />],
                ["Type", inspection.inspection_type],
                ["ERPNext", inspection.erpnext_name || "—"],
                ["Batch", inspection.batch_no || "—"],
                ["Inspector", inspection.inspected_by || "—"],
                ["Created By", inspection.created_by],
                ["Created", new Date(inspection.created_at).toLocaleString()],
              ].map(([k, v]) => (
                <div key={String(k)}>
                  <dt className="text-muted-foreground">{k}</dt>
                  <dd className="font-medium">{v}</dd>
                </div>
              ))}
            </dl>
            {inspection.remarks && <p className="mt-3 text-sm text-muted-foreground italic">{inspection.remarks}</p>}
          </CardContent>
        </Card>

        {inspection.items.length > 0 && (
          <Card>
            <CardHeader><CardTitle className="text-sm">Inspection Items</CardTitle></CardHeader>
            <CardContent>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-muted-foreground text-xs border-b">
                    <th className="text-left pb-2">Parameter</th>
                    <th className="text-right pb-2">Min</th>
                    <th className="text-right pb-2">Max</th>
                    <th className="text-right pb-2">Actual</th>
                    <th className="text-right pb-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {inspection.items.map((item) => (
                    <tr key={item.id} className="border-b last:border-0">
                      <td className="py-2">{item.parameter}</td>
                      <td className="text-right">{item.min_value ?? "—"}</td>
                      <td className="text-right">{item.max_value ?? "—"}</td>
                      <td className="text-right font-medium">{item.actual_value ?? "—"}</td>
                      <td className="text-right">{item.status ? <StatusBadge status={item.status} /> : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        )}

        {validation && (
          <Card className={validation.passed ? "border-green-200" : "border-red-200"}>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                {validation.passed ? <CheckCircle className="h-4 w-4 text-green-600" /> : <AlertTriangle className="h-4 w-4 text-red-600" />}
                Rule Validation — {validation.passed ? "Passed" : "Failed"}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {(validation.violations as { rule: string; parameter: string; actual_value: unknown }[]).map((v, i) => (
                <div key={i} className="text-sm text-red-700 bg-red-50 rounded p-2">
                  Critical: {v.rule} — {v.parameter} = {String(v.actual_value)}
                </div>
              ))}
              {(validation.warnings as { rule: string; parameter: string; actual_value: unknown }[]).map((w, i) => (
                <div key={i} className="text-sm text-yellow-700 bg-yellow-50 rounded p-2">
                  Warning: {w.rule} — {w.parameter} = {String(w.actual_value)}
                </div>
              ))}
              {validation.passed && validation.warnings.length === 0 && (
                <p className="text-sm text-green-700">All rules passed. No violations.</p>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
