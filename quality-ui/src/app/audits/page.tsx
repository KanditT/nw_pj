"use client";
import { useState, useEffect, useCallback } from "react";
import { Header } from "@/components/layout/header";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/status-badge";
import { api } from "@/lib/api";
import type { AuditLog } from "@/lib/types";

export default function AuditsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({ actor: "", action: "", resource_type: "" });

  const load = useCallback(async () => {
    setLoading(true);
    const params: Record<string, string> = {};
    if (filter.actor) params.actor = filter.actor;
    if (filter.action) params.action = filter.action;
    if (filter.resource_type) params.resource_type = filter.resource_type;
    const data = await api.audits.list(Object.keys(params).length ? params : undefined);
    setLogs(data);
    setLoading(false);
  }, [filter]);

  useEffect(() => { load(); }, [load]);

  return (
    <div>
      <Header title="Audit Trail" description="Immutable record of all system actions" />
      <div className="p-6 space-y-4">
        <div className="flex gap-3">
          <Input placeholder="Filter by actor…" value={filter.actor} onChange={(e) => setFilter({ ...filter, actor: e.target.value })} className="max-w-xs" />
          <Input placeholder="Filter by action…" value={filter.action} onChange={(e) => setFilter({ ...filter, action: e.target.value })} className="max-w-xs" />
          <Input placeholder="Filter by resource type…" value={filter.resource_type} onChange={(e) => setFilter({ ...filter, resource_type: e.target.value })} className="max-w-xs" />
        </div>

        {loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : (
          <Card>
            <CardContent className="p-0">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-muted-foreground border-b">
                    <th className="text-left p-3">Timestamp</th>
                    <th className="text-left p-3">Actor</th>
                    <th className="text-left p-3">Action</th>
                    <th className="text-left p-3">Resource</th>
                    <th className="text-left p-3">Result</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.length === 0 && (
                    <tr><td colSpan={5} className="p-4 text-center text-muted-foreground">No audit logs found.</td></tr>
                  )}
                  {logs.map((log) => (
                    <tr key={log.id} className="border-b last:border-0 hover:bg-muted/30">
                      <td className="p-3 font-mono text-xs">{new Date(log.timestamp).toLocaleString()}</td>
                      <td className="p-3 font-medium">{log.actor}</td>
                      <td className="p-3">{log.action}</td>
                      <td className="p-3 text-muted-foreground">{log.resource_type} {log.resource_id ? `· ${log.resource_id.slice(0, 8)}…` : ""}</td>
                      <td className="p-3"><StatusBadge status={log.result} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
