import { Header } from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ClipboardCheck, CheckSquare, AlertTriangle, Activity } from "lucide-react";

async function getStats() {
  const base = process.env.INTERNAL_API_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
  try {
    const [inspections, approvals, audits] = await Promise.all([
      fetch(`${base}/api/v1/inspections/?limit=200`, { next: { revalidate: 30 } }).then((r) => r.json()),
      fetch(`${base}/api/v1/approvals/`, { next: { revalidate: 30 } }).then((r) => r.json()),
      fetch(`${base}/api/v1/audits/?limit=10`, { next: { revalidate: 30 } }).then((r) => r.json()),
    ]);
    return { inspections, approvals, audits };
  } catch {
    return { inspections: [], approvals: [], audits: [] };
  }
}

export default async function DashboardPage() {
  const { inspections, approvals, audits } = await getStats();

  const pending = approvals.filter((a: { status: string }) => a.status === "pending").length;
  const approved = inspections.filter((i: { status: string }) => i.status === "approved").length;
  const rejected = inspections.filter((i: { status: string }) => i.status === "rejected").length;

  const stats = [
    { label: "Total Inspections", value: inspections.length, icon: ClipboardCheck, color: "text-blue-600" },
    { label: "Pending Approvals", value: pending, icon: CheckSquare, color: "text-yellow-600" },
    { label: "Approved",          value: approved, icon: Activity,     color: "text-green-600" },
    { label: "Rejected",          value: rejected, icon: AlertTriangle, color: "text-red-600" },
  ];

  return (
    <div>
      <Header title="Dashboard" description="Quality Management Overview" />
      <div className="p-6 space-y-6">
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {stats.map(({ label, value, icon: Icon, color }) => (
            <Card key={label}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
                <Icon className={`h-5 w-5 ${color}`} />
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{value}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Recent Audit Activity</CardTitle>
          </CardHeader>
          <CardContent>
            {audits.length === 0 ? (
              <p className="text-sm text-muted-foreground">No audit records yet.</p>
            ) : (
              <div className="space-y-2">
                {audits.map((log: { id: string; timestamp: string; actor: string; action: string; resource_type: string; result: string }) => (
                  <div key={log.id} className="flex items-center justify-between text-sm border-b pb-2 last:border-0">
                    <div>
                      <span className="font-medium">{log.actor}</span>
                      <span className="text-muted-foreground mx-1">·</span>
                      <span>{log.action}</span>
                      <span className="text-muted-foreground mx-1">on</span>
                      <span>{log.resource_type}</span>
                    </div>
                    <span className="text-muted-foreground text-xs">
                      {new Date(log.timestamp).toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
