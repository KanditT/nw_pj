export interface QualityInspection {
  name: string;
  status: string;
  report_date: string;
  item_code: string;
  inspected_by: string;
  docstatus: number; // 1 = Submitted, 2 = Cancelled
}
