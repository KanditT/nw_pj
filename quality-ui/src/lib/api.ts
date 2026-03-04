const BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}/api/v1${path}`, {
    headers: { "Content-Type": "application/json", ...init?.headers },
    ...init,
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`API ${res.status}: ${err}`);
  }
  return res.json() as Promise<T>;
}

// ─── Inspections ──────────────────────────────────────────────────────────────
export const api = {
  inspections: {
    list: (params?: Record<string, string>) => {
      const q = params ? "?" + new URLSearchParams(params) : "";
      return request<import("./types").QualityInspection[]>(`/inspections/${q}`);
    },
    get: (id: string) => request<import("./types").QualityInspection>(`/inspections/${id}`),
    create: (body: Record<string, unknown>) =>
      request<import("./types").QualityInspection>("/inspections/", {
        method: "POST",
        body: JSON.stringify(body),
      }),
    update: (id: string, body: Record<string, unknown>) =>
      request<import("./types").QualityInspection>(`/inspections/${id}`, {
        method: "PUT",
        body: JSON.stringify(body),
      }),
    validate: (id: string) =>
      request<{ passed: boolean; violations: unknown[]; warnings: unknown[] }>(
        `/inspections/${id}/validate`,
        { method: "POST" }
      ),
    syncErpnext: (id: string) =>
      request<import("./types").QualityInspection>(`/inspections/${id}/sync-erpnext`, {
        method: "POST",
      }),
  },

  approvals: {
    list: (status?: string) =>
      request<import("./types").ApprovalRequest[]>(
        `/approvals/${status ? "?status=" + status : ""}`
      ),
    get: (id: string) => request<import("./types").ApprovalRequest>(`/approvals/${id}`),
    create: (body: Record<string, unknown>) =>
      request<import("./types").ApprovalRequest>("/approvals/", {
        method: "POST",
        body: JSON.stringify(body),
      }),
    approve: (id: string, decided_by: string, comments?: string) =>
      request<import("./types").ApprovalRequest>(`/approvals/${id}/approve`, {
        method: "POST",
        body: JSON.stringify({ decided_by, decision: "approved", comments }),
      }),
    reject: (id: string, decided_by: string, comments?: string) =>
      request<import("./types").ApprovalRequest>(`/approvals/${id}/reject`, {
        method: "POST",
        body: JSON.stringify({ decided_by, decision: "rejected", comments }),
      }),
  },

  checklists: {
    list: () => request<import("./types").Checklist[]>("/checklists/"),
    get: (id: string) => request<import("./types").Checklist>(`/checklists/${id}`),
    create: (body: Record<string, unknown>) =>
      request<import("./types").Checklist>("/checklists/", {
        method: "POST",
        body: JSON.stringify(body),
      }),
  },

  audits: {
    list: (params?: Record<string, string>) => {
      const q = params ? "?" + new URLSearchParams(params) : "";
      return request<import("./types").AuditLog[]>(`/audits/${q}`);
    },
  },

  rules: {
    list: () => request<import("./types").InspectionRule[]>("/rules/"),
    create: (body: Record<string, unknown>) =>
      request<import("./types").InspectionRule>("/rules/", {
        method: "POST",
        body: JSON.stringify(body),
      }),
    update: (id: string, body: Record<string, unknown>) =>
      request<import("./types").InspectionRule>(`/rules/${id}`, {
        method: "PUT",
        body: JSON.stringify(body),
      }),
    delete: (id: string) =>
      fetch(`${BASE}/api/v1/rules/${id}`, { method: "DELETE" }),
  },
};
