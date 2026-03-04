import { Badge } from "@/components/ui/badge";
import type { InspectionStatus, ApprovalStatus } from "@/lib/types";

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" | "success" | "warning" }> = {
  draft:      { label: "Draft",      variant: "secondary" },
  pending:    { label: "Pending",    variant: "warning" },
  in_review:  { label: "In Review",  variant: "default" },
  approved:   { label: "Approved",   variant: "success" },
  rejected:   { label: "Rejected",   variant: "destructive" },
  cancelled:  { label: "Cancelled",  variant: "outline" },
  success:    { label: "Success",    variant: "success" },
  failure:    { label: "Failure",    variant: "destructive" },
};

export function StatusBadge({ status }: { status: InspectionStatus | ApprovalStatus | string }) {
  const cfg = statusConfig[status] ?? { label: status, variant: "secondary" };
  return <Badge variant={cfg.variant}>{cfg.label}</Badge>;
}
