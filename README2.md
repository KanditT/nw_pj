# Quality UI Guide — http://localhost:3000

---

## Dashboard ( / )

- View summary stats: total inspections, pending approvals, approved, rejected
- See recent audit activity log

---

## Inspections ( /inspections )

### What you can do:
- **List all inspections** — shows all records with status, item code, type
- **Create a new inspection** — fill in:
  - Item Code (e.g. `ITEM-001`)
  - Inspection Type (`incoming` / `in-process` / `outgoing`)
  - Sample Size
  - Created By (your name)
  - Add inspection items (parameter name + reading value + min/max spec)
- **View inspection detail** — click any inspection to open it
  - See all items and their readings
  - **Validate** — run rule engine to check if readings pass/fail against saved rules
  - **Sync to ERPNext** — push this inspection into ERPNext as a Quality Inspection document
  - **Request Approval** — submit inspection for approval review

---

## Approvals ( /approvals )

### What you can do:
- **List pending approvals** — see all inspections waiting for a decision
- **Approve** — mark an inspection as approved (with optional comments)
  - Syncs the decision back to ERPNext workflow
- **Reject** — mark an inspection as rejected (with optional comments)
- **List all approvals** — filter by status (pending / approved / rejected / cancelled)

---

## Checklists ( /checklists )

### What you can do:
- **List all checklists** — view saved inspection checklists
- **Create a checklist** — define a reusable checklist with:
  - Name and description
  - Multiple checklist items (each with a label and required flag)
- **Delete a checklist** — soft-delete (hides from list, data kept)

---

## Rules ( /rules )

### What you can do:
- **List all validation rules** — see active/inactive rules
- **Create a rule** — define a rule that the rule engine uses during validation:
  - Item Code to apply to
  - Parameter name (must match inspection item parameter)
  - Operator: `between`, `gt`, `gte`, `lt`, `lte`, `eq`
  - Min / Max values
  - Severity: `warning` or `critical`
- **Edit a rule** — update operator, thresholds, severity
- **Delete a rule** — permanently removes the rule

### How rules work:
When you click **Validate** on an inspection, the rule engine checks each inspection item reading against all active rules matching that item code + parameter. It returns pass/fail with details.

---

## Audits ( /audits )

### What you can do:
- **View full audit trail** — immutable log of every action in the system
- **Filter by:**
  - Actor (who did it)
  - Action (e.g. `create_inspection`, `approve`, `sync_to_erpnext`)
  - Resource type
- Every create, update, approve, reject, sync, and webhook event is logged here

---

## Typical Workflow

```
1. Create a Rule        → /rules         (set thresholds for an item)
2. Create a Checklist   → /checklists    (optional, for reference)
3. Create Inspection    → /inspections   (record readings)
4. Validate             → /inspections/{id}  (check against rules)
5. Sync to ERPNext      → /inspections/{id}  (push to ERPNext)
6. Request Approval     → /inspections/{id}  (submit for review)
7. Approve / Reject     → /approvals     (make decision)
8. View Audit Trail     → /audits        (see full history)
```

---

## API Docs
Full interactive API: http://localhost:8000/docs
