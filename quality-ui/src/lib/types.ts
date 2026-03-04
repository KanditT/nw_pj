export type InspectionStatus =
  | "draft" | "pending" | "in_review" | "approved" | "rejected" | "cancelled";

export type ApprovalStatus = "pending" | "approved" | "rejected" | "cancelled";

export interface InspectionItem {
  id: string;
  parameter: string;
  specification?: string;
  min_value?: number;
  max_value?: number;
  actual_value?: number;
  status?: string;
  remarks?: string;
}

export interface QualityInspection {
  id: string;
  erpnext_name?: string;
  inspection_type: string;
  item_code: string;
  item_name?: string;
  reference_type?: string;
  reference_name?: string;
  batch_no?: string;
  sample_size?: number;
  status: InspectionStatus;
  remarks?: string;
  inspected_by?: string;
  inspected_at?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  items: InspectionItem[];
}

export interface ApprovalDecision {
  id: string;
  request_id: string;
  decided_by: string;
  decided_at: string;
  decision: "approved" | "rejected";
  comments?: string;
  erpnext_synced: boolean;
}

export interface ApprovalRequest {
  id: string;
  inspection_id: string;
  requested_by: string;
  requested_at: string;
  status: ApprovalStatus;
  priority: string;
  notes?: string;
  deadline?: string;
  decisions: ApprovalDecision[];
}

export interface ChecklistItem {
  id: string;
  checklist_id: string;
  order: number;
  description: string;
  is_mandatory: boolean;
  expected_value?: string;
  remarks?: string;
}

export interface Checklist {
  id: string;
  name: string;
  description?: string;
  category?: string;
  is_active: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
  items: ChecklistItem[];
}

export interface AuditLog {
  id: string;
  timestamp: string;
  actor: string;
  action: string;
  resource_type: string;
  resource_id?: string;
  old_value?: Record<string, unknown>;
  new_value?: Record<string, unknown>;
  ip_address?: string;
  details?: string;
  result: "success" | "failure";
}

export interface InspectionRule {
  id: string;
  name: string;
  description?: string;
  item_code?: string;
  inspection_type?: string;
  conditions: Record<string, unknown>;
  severity: "warning" | "critical";
  is_active: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
}
