"use client";
import { useState, useEffect, useCallback } from "react";
import { Header } from "@/components/layout/header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { StatusBadge } from "@/components/status-badge";
import { api } from "@/lib/api";
import type { ApprovalRequest } from "@/lib/types";
import { CheckCircle, XCircle, Clock } from "lucide-react";

export default function ApprovalsPage() {
  const [requests, setRequests] = useState<ApprovalRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<ApprovalRequest | null>(null);
  const [comments, setComments] = useState("");
  const [actor, setActor] = useState("quality.manager");
  const [processing, setProcessing] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const data = await api.approvals.list();
    setRequests(data);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleDecision = async (decision: "approve" | "reject") => {
    if (!selected) return;
    setProcessing(true);
    try {
      if (decision === "approve") {
        await api.approvals.approve(selected.id, actor, comments);
      } else {
        await api.approvals.reject(selected.id, actor, comments);
      }
      setSelected(null);
      setComments("");
      await load();
    } finally {
      setProcessing(false);
    }
  };

  const pending = requests.filter((r) => r.status === "pending");
  const decided = requests.filter((r) => r.status !== "pending");

  return (
    <div>
      <Header title="Approval Dashboard" description="Review and decide on quality inspection approvals" />
      <div className="flex gap-6 p-6">
        {/* Queue */}
        <div className="flex-1 space-y-3">
          <h3 className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
            <Clock className="h-4 w-4" /> Pending ({pending.length})
          </h3>
          {loading && <p className="text-sm text-muted-foreground">Loading…</p>}
          {!loading && pending.length === 0 && (
            <p className="text-sm text-muted-foreground">No pending approvals.</p>
          )}
          {pending.map((req) => (
            <Card
              key={req.id}
              className={`cursor-pointer transition-all hover:shadow-md ${selected?.id === req.id ? "ring-2 ring-primary" : ""}`}
              onClick={() => setSelected(req)}
            >
              <CardContent className="p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs text-muted-foreground">{req.id.slice(0, 8)}…</span>
                  <Badge variant={req.priority === "high" ? "destructive" : "secondary"}>
                    {req.priority}
                  </Badge>
                </div>
                <p className="text-sm">Inspection: <span className="font-medium">{req.inspection_id.slice(0, 8)}…</span></p>
                <p className="text-xs text-muted-foreground">By {req.requested_by} · {new Date(req.requested_at).toLocaleDateString()}</p>
                {req.notes && <p className="text-xs italic text-muted-foreground">{req.notes}</p>}
              </CardContent>
            </Card>
          ))}

          <h3 className="text-sm font-semibold text-muted-foreground mt-6">Decided ({decided.length})</h3>
          {decided.map((req) => (
            <Card key={req.id} className="opacity-70">
              <CardContent className="p-4 flex items-center justify-between">
                <span className="text-xs font-mono">{req.id.slice(0, 8)}…</span>
                <StatusBadge status={req.status} />
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Decision Panel */}
        {selected && (
          <div className="w-80 space-y-4">
            <Card>
              <CardContent className="p-4 space-y-3">
                <h3 className="font-semibold">Decision</h3>
                <div className="space-y-1">
                  <Label htmlFor="actor">Your Name</Label>
                  <input
                    id="actor"
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
                    value={actor}
                    onChange={(e) => setActor(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="comments">Comments</Label>
                  <Textarea
                    id="comments"
                    placeholder="Add comments…"
                    value={comments}
                    onChange={(e) => setComments(e.target.value)}
                    rows={3}
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    className="flex-1 bg-green-600 hover:bg-green-700"
                    disabled={processing}
                    onClick={() => handleDecision("approve")}
                  >
                    <CheckCircle className="h-4 w-4" /> Approve
                  </Button>
                  <Button
                    variant="destructive"
                    className="flex-1"
                    disabled={processing}
                    onClick={() => handleDecision("reject")}
                  >
                    <XCircle className="h-4 w-4" /> Reject
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
