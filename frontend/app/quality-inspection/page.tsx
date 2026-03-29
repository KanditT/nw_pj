"use client";

import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { z } from "zod";
import { Check, ChevronsUpDown } from "lucide-react";
import { QualityInspection } from "@/types/quality-inspection";
import { DataTable } from "@/components/data-table";
import { ColumnDef } from "@tanstack/react-table";
import { Paginate } from "@/types/paginate";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Field, FieldError, FieldGroup } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

// ── Constants ─────────────────────────────────────────────────────────────────

const STATUS_OPTIONS = ["Accepted", "Rejected", "Cancelled"] as const;
const INSPECTION_TYPE_OPTIONS = ["Incoming", "Outgoing", "In Process"] as const;

// ── Types ────────────────────────────────────────────────────────────────────

interface ItemOption {
  name: string;
  item_name: string;
}
interface PurchaseReceiptOption {
  name: string;
}
interface QITemplateOption {
  name: string;
  quality_inspection_template_name: string;
}
interface UserOption {
  email: string;
}
interface TemplateParameter {
  specification: string;
}

type ReadingRow = { specification: string; reading_1: string };

type QIFormData = {
  naming_series: string;
  report_date: string;
  status: string;
  inspection_type: string;
  reference_type: string;
  reference_name: string;
  item_code: string;
  sample_size: string;
  quality_inspection_template: string;
  inspected_by: string;
  readings: ReadingRow[];
};

// ── Schema ───────────────────────────────────────────────────────────────────

const qiSchema = z.object({
  naming_series: z.string(),
  report_date: z.string().min(1, "Report Date is required"),
  status: z.string().min(1, "Status is required"),
  inspection_type: z.string().min(1, "Inspection Type is required"),
  reference_type: z.string(),
  reference_name: z.string().min(1, "Reference Name is required"),
  item_code: z.string().min(1, "Item Code is required"),
  sample_size: z.string().default("0"),
  quality_inspection_template: z.string().optional(),
  inspected_by: z.string().min(1, "Inspected By is required"),
  readings: z.array(
    z.object({
      specification: z.string(),
      reading_1: z.string().default(""),
    }),
  ),
});

type QIFormParsed = z.infer<typeof qiSchema>;

function todayStr() {
  return new Date().toLocaleDateString("en-CA");
}

const defaultFormData = (): QIFormData => ({
  naming_series: "MAT-QA-.YYYY.-",
  report_date: todayStr(),
  status: "Accepted",
  inspection_type: "Incoming",
  reference_type: "Purchase Receipt",
  reference_name: "",
  item_code: "",
  sample_size: "0",
  quality_inspection_template: "",
  inspected_by: "",
  readings: [],
});

// ── Combobox ─────────────────────────────────────────────────────────────────

interface GenericComboboxProps {
  value: string;
  options: { value: string; label: string }[];
  placeholder: string;
  onChange: (v: string) => void;
}

function GenericCombobox({
  value,
  options,
  placeholder,
  onChange,
}: GenericComboboxProps) {
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.value === value);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          className="w-full justify-between font-normal"
        >
          {selected ? selected.label : placeholder}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0" align="start">
        <Command>
          <CommandInput placeholder="Search..." />
          <CommandList>
            <CommandEmpty>No result found.</CommandEmpty>
            <CommandGroup>
              {options.map((o) => (
                <CommandItem
                  key={o.value}
                  value={o.value}
                  onSelect={() => {
                    onChange(o.value);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === o.value ? "opacity-100" : "opacity-0",
                    )}
                  />
                  {o.label}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

const Page = () => {
  const [data, setData] = useState<QualityInspection[] | null>(null);
  const [paginate, setPaginate] = useState<Paginate>({
    current_page: 1,
    total_page: 1,
    total: 0,
    page_size: 10,
  });
  const [keyword, setKeyword] = useState("");

  // lookup data
  const [itemOptions, setItemOptions] = useState<ItemOption[]>([]);
  const [prOptions, setPrOptions] = useState<PurchaseReceiptOption[]>([]);
  const [templateOptions, setTemplateOptions] = useState<QITemplateOption[]>(
    [],
  );
  const [userOptions, setUserOptions] = useState<UserOption[]>([]);

  // template parameters cache: templateName → parameters[]
  const [templateParams, setTemplateParams] = useState<
    Record<string, TemplateParameter[]>
  >({});

  // View dialog
  const [viewOpen, setViewOpen] = useState(false);
  const [viewItem, setViewItem] = useState<(QIFormData & { name: string }) | null>(null);

  // Add dialog
  const [addOpen, setAddOpen] = useState(false);
  const [formData, setFormData] = useState<QIFormData>(defaultFormData);
  const [errors, setErrors] = useState<Partial<Record<string, string>>>({});

  // ── Fetch helpers ─────────────────────────────────────────────────────────

  async function fetchData() {
    try {
      const res = await axios.get(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}quality-inspections`,
        {
          params: {
            current_page: paginate.current_page,
            page_size: paginate.page_size,
            ...(keyword && { keyword }),
          },
        },
      );
      setData(res.data.data);
      setPaginate(res.data.pagination);
    } catch {
      setData([]);
    }
  }

  async function fetchLookups() {
    try {
      const [itemsRes, prRes, tmplRes, userRes] = await Promise.all([
        axios.get(`${process.env.NEXT_PUBLIC_API_BASE_URL}items`, {
          params: { page_size: 200, current_page: 1 },
        }),
        axios.get(`${process.env.NEXT_PUBLIC_API_BASE_URL}purchase-receipts`, {
          params: { page_size: 200, current_page: 1 },
        }),
        axios.get(
          `${process.env.NEXT_PUBLIC_API_BASE_URL}quality-inspection-templates`,
          { params: { page_size: 200, current_page: 1 } },
        ),
        axios.get(`${process.env.NEXT_PUBLIC_API_BASE_URL}users`),
      ]);
      setItemOptions(itemsRes.data.data ?? []);
      setPrOptions(prRes.data.data ?? []);
      setTemplateOptions(tmplRes.data.data ?? []);
      setUserOptions(userRes.data.data ?? []);
    } catch {
      /* ignore */
    }
  }

  async function fetchTemplateParams(
    templateName: string,
  ): Promise<TemplateParameter[]> {
    if (templateParams[templateName]) return templateParams[templateName];
    try {
      const res = await axios.get(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}quality-inspection-templates/${templateName}`,
      );
      const params: TemplateParameter[] = (
        res.data.data?.item_quality_inspection_parameter ?? []
      ).map((r: { specification?: string }) => ({
        specification: r.specification ?? "",
      }));
      setTemplateParams((prev) => ({ ...prev, [templateName]: params }));
      return params;
    } catch {
      return [];
    }
  }

  useEffect(() => {
    fetchLookups();
  }, []);
  useEffect(() => {
    fetchData();
  }, [paginate.current_page, paginate.page_size, keyword]);

  function handleKeywordChange(e: React.ChangeEvent<HTMLInputElement>) {
    setKeyword(e.target.value);
    setPaginate((prev) => ({ ...prev, current_page: 1 }));
  }
  function handleChangeRowPerPage(v: number) {
    setPaginate((prev) => ({ ...prev, current_page: 1, page_size: v }));
  }
  function handleChangePaginate(p: number) {
    setPaginate((prev) => ({ ...prev, current_page: p }));
  }

  // ── Template selection ────────────────────────────────────────────────────

  async function applyTemplate(
    templateName: string,
    setter: React.Dispatch<React.SetStateAction<QIFormData>>,
  ) {
    if (!templateName) {
      setter((prev) => ({
        ...prev,
        quality_inspection_template: "",
        readings: [],
      }));
      return;
    }
    const params = await fetchTemplateParams(templateName);
    setter((prev) => ({
      ...prev,
      quality_inspection_template: templateName,
      readings: params.map((p) => ({
        specification: p.specification,
        reading_1: "",
      })),
    }));
  }

  // ── Build payload ─────────────────────────────────────────────────────────

  function buildPayload(parsed: QIFormParsed) {
    return {
      ...parsed,
      sample_size: parseFloat(parsed.sample_size) || 0,
      readings: parsed.readings.map((r) => ({
        specification: r.specification,
        reading_1: r.reading_1, // keep as string — ERPNext calls .strip() on it
      })),
    };
  }

  // ── View ─────────────────────────────────────────────────────────────────

  async function handleViewOpen(row: QualityInspection) {
    try {
      const res = await axios.get(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}quality-inspections/${row.name}`,
      );
      const qi = res.data.data;
      setViewItem({
        name: qi.name,
        naming_series: qi.naming_series ?? "",
        report_date: qi.report_date ?? "",
        status: qi.status ?? "",
        inspection_type: qi.inspection_type ?? "",
        reference_type: qi.reference_type ?? "",
        reference_name: qi.reference_name ?? "",
        item_code: qi.item_code ?? "",
        sample_size: String(qi.sample_size ?? 0),
        quality_inspection_template: qi.quality_inspection_template ?? "",
        inspected_by: qi.inspected_by ?? "",
        readings: (qi.readings ?? []).map((r: { specification?: string; reading_1?: string }) => ({
          specification: r.specification ?? "",
          reading_1: r.reading_1 ?? "",
        })),
      });
      setViewOpen(true);
    } catch {
      // don't open if fetch failed
    }
  }

  // ── Add ───────────────────────────────────────────────────────────────────

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const result = qiSchema.safeParse(formData);
    if (!result.success) {
      const errs: Partial<Record<string, string>> = {};
      for (const issue of result.error.issues) {
        const key = issue.path.join(".");
        if (!errs[key]) errs[key] = issue.message;
      }
      setErrors(errs);
      return;
    }
    try {
      await axios.post(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}quality-inspections`,
        buildPayload(result.data),
      );
      setErrors({});
      setFormData(defaultFormData());
      setAddOpen(false);
      fetchData();
    } catch {
      setErrors({ report_date: "Failed to create. Please try again." });
    }
  }

  // ── Cancel ────────────────────────────────────────────────────────────────

  async function handleCancel(name: string) {
    try {
      await axios.post(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}quality-inspections/${name}/cancel`,
      );
      fetchData();
    } catch {
      /* ignore */
    }
  }

  // ── Delete (cancel first, then delete — Frappe requires docstatus=2 before DELETE) ──

  async function handleDelete(name: string) {
    try {
      await axios.post(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}quality-inspections/${name}/cancel`,
      );
      await axios.delete(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}quality-inspections/${name}`,
      );
      fetchData();
    } catch {
      /* ignore */
    }
  }

  // ── Columns ───────────────────────────────────────────────────────────────

  const columns = useMemo<ColumnDef<QualityInspection>[]>(
    () => [
      { accessorKey: "name", header: "QI No." },
      { accessorKey: "item_code", header: "Item Code" },
      { accessorKey: "report_date", header: "Date" },
      {
        accessorKey: "status",
        header: "QI Status",
        cell: ({ row }) => {
          const s = row.original.status;
          const colors: Record<string, string> = {
            Accepted: "bg-green-100 text-green-700",
            Rejected: "bg-red-100 text-red-700",
            Cancelled: "bg-gray-100 text-gray-500",
          };
          return (
            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${colors[s] ?? "bg-yellow-100 text-yellow-700"}`}>
              {s}
            </span>
          );
        },
      },
      {
        accessorKey: "docstatus",
        header: "Doc Status",
        cell: ({ row }) =>
          row.original.docstatus === 2 ? (
            <span className="rounded-full px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-500">Cancelled</span>
          ) : (
            <span className="rounded-full px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-700">Submitted</span>
          ),
      },
      { accessorKey: "inspected_by", header: "Inspected By" },
      {
        id: "actions",
        header: "Action",
        cell: ({ row }) => {
          const cancelled = row.original.docstatus === 2;
          if (cancelled) return (
            <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => axios.delete(`${process.env.NEXT_PUBLIC_API_BASE_URL}quality-inspections/${row.original.name}`).then(() => fetchData())}
              >
                Delete
              </Button>
            </div>
          );
          return (
            <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => handleCancel(row.original.name)}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => handleDelete(row.original.name)}
              >
                Delete
              </Button>
            </div>
          );
        },
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  // ── Form render ───────────────────────────────────────────────────────────

  function renderForm(
    fd: QIFormData,
    errs: Partial<Record<string, string>>,
    setter: React.Dispatch<React.SetStateAction<QIFormData>>,
    errSetter: React.Dispatch<
      React.SetStateAction<Partial<Record<string, string>>>
    >,
    onSubmit: (e: React.FormEvent<HTMLFormElement>) => void,
    isEdit: boolean,
  ) {
    function set(field: keyof QIFormData, value: string) {
      setter((prev) => ({ ...prev, [field]: value }));
      errSetter((prev) => ({ ...prev, [field]: undefined }));
    }

    const itemOpts = itemOptions.map((i) => ({
      value: i.name,
      label: `${i.name}`,
    }));
    const prOpts = prOptions.map((p) => ({ value: p.name, label: p.name }));
    const tmplOpts = templateOptions.map((t) => ({
      value: t.name,
      label: t.quality_inspection_template_name || t.name,
    }));
    const userOpts = userOptions.map((u) => ({
      value: u.email,
      label: u.email,
    }));

    return (
      <form onSubmit={onSubmit}>
        <FieldGroup>
          {/* Series — disabled */}
          <Field>
            <Label>Series</Label>
            <Input value={fd.naming_series} disabled />
          </Field>

          {/* Report Date */}
          <Field>
            <Label htmlFor={`${isEdit ? "e_" : ""}report_date`}>
              Report Date <span className="text-destructive">*</span>
            </Label>
            <Input
              id={`${isEdit ? "e_" : ""}report_date`}
              type="date"
              value={fd.report_date}
              onChange={(e) => set("report_date", e.target.value)}
            />
            <FieldError>{errs.report_date}</FieldError>
          </Field>

          {/* Status */}
          <Field>
            <Label>
              Status <span className="text-destructive">*</span>
            </Label>
            <Select value={fd.status} onValueChange={(v) => set("status", v)}>
              <SelectTrigger>
                <SelectValue placeholder="Select status..." />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FieldError>{errs.status}</FieldError>
          </Field>

          {/* Inspection Type */}
          <Field>
            <Label>
              Inspection Type <span className="text-destructive">*</span>
            </Label>
            <Select
              value={fd.inspection_type}
              onValueChange={(v) => set("inspection_type", v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select type..." />
              </SelectTrigger>
              <SelectContent>
                {INSPECTION_TYPE_OPTIONS.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FieldError>{errs.inspection_type}</FieldError>
          </Field>

          {/* Reference Type — disabled */}
          <Field>
            <Label>Reference Type</Label>
            <Input value={fd.reference_type} disabled />
          </Field>

          {/* Reference Name */}
          <Field>
            <Label>
              Reference Name <span className="text-destructive">*</span>
            </Label>
            <GenericCombobox
              value={fd.reference_name}
              options={prOpts}
              placeholder="Select purchase receipt..."
              onChange={(v) => set("reference_name", v)}
            />
            <FieldError>{errs.reference_name}</FieldError>
          </Field>

          {/* Item Code */}
          <Field>
            <Label>
              Item Code <span className="text-destructive">*</span>
            </Label>
            <GenericCombobox
              value={fd.item_code}
              options={itemOpts}
              placeholder="Select item..."
              onChange={(v) => set("item_code", v)}
            />
            <FieldError>{errs.item_code}</FieldError>
          </Field>

          {/* Sample Size */}
          <Field>
            <Label htmlFor={`${isEdit ? "e_" : ""}sample_size`}>
              Sample Size
            </Label>
            <Input
              id={`${isEdit ? "e_" : ""}sample_size`}
              type="number"
              step="any"
              value={fd.sample_size}
              onChange={(e) => set("sample_size", e.target.value)}
            />
          </Field>

          {/* Quality Inspection Template */}
          <Field>
            <Label>Quality Inspection Template</Label>
            <GenericCombobox
              value={fd.quality_inspection_template ?? ""}
              options={[{ value: "", label: "— None —" }, ...tmplOpts]}
              placeholder="Select template (optional)..."
              onChange={(v) => applyTemplate(v, setter)}
            />
          </Field>

          {/* Readings table — shown only when template selected */}
          {fd.readings.length > 0 && (
            <div className="mt-4">
              <Label>Quality Inspection Readings</Label>
              <div className="border rounded-md mt-2 overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted">
                    <tr>
                      <th className="text-left p-2 font-medium">Parameter</th>
                      <th className="text-left p-2 font-medium w-36">
                        Reading Value
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {fd.readings.map((row, i) => (
                      <tr key={i} className="border-t">
                        <td className="p-2 text-sm">{row.specification}</td>
                        <td className="p-2">
                          <Input
                            type="number"
                            step="any"
                            value={row.reading_1}
                            placeholder="—"
                            onChange={(e) => {
                              setter((prev) => {
                                const readings = [...prev.readings];
                                readings[i] = {
                                  ...readings[i],
                                  reading_1: e.target.value,
                                };
                                return { ...prev, readings };
                              });
                            }}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Inspected By */}
          <Field>
            <Label>
              Inspected By <span className="text-destructive">*</span>
            </Label>
            <GenericCombobox
              value={fd.inspected_by}
              options={userOpts}
              placeholder="Select user..."
              onChange={(v) => set("inspected_by", v)}
            />
            <FieldError>{errs.inspected_by}</FieldError>
          </Field>
        </FieldGroup>

        <DialogFooter className="mt-4">
          <DialogClose asChild>
            <Button type="button" variant="outline">
              Cancel
            </Button>
          </DialogClose>
          <Button type="submit">Save changes</Button>
        </DialogFooter>
      </form>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div>
      {/* ── View Dialog ─────────────────────────────────────────────────── */}
      <Dialog open={viewOpen} onOpenChange={setViewOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Quality Inspection</DialogTitle>
            <DialogDescription>
              <span className="font-medium text-foreground">{viewItem?.name}</span>
            </DialogDescription>
          </DialogHeader>
          {viewItem && (
            <>
              <FieldGroup>
                <Field><Label>Series</Label><Input value={viewItem.naming_series} disabled /></Field>
                <Field><Label>Report Date</Label><Input type="date" value={viewItem.report_date} disabled /></Field>
                <Field><Label>Status</Label><Input value={viewItem.status} disabled /></Field>
                <Field><Label>Inspection Type</Label><Input value={viewItem.inspection_type} disabled /></Field>
                <Field><Label>Reference Type</Label><Input value={viewItem.reference_type} disabled /></Field>
                <Field><Label>Reference Name</Label><Input value={viewItem.reference_name} disabled /></Field>
                <Field><Label>Item Code</Label><Input value={viewItem.item_code} disabled /></Field>
                <Field><Label>Sample Size</Label><Input value={viewItem.sample_size} disabled /></Field>
                <Field><Label>Quality Inspection Template</Label><Input value={viewItem.quality_inspection_template} disabled /></Field>
                <Field><Label>Inspected By</Label><Input value={viewItem.inspected_by} disabled /></Field>
              </FieldGroup>
              {viewItem.readings.length > 0 && (
                <div className="mt-4">
                  <Label>Quality Inspection Readings</Label>
                  <div className="border rounded-md mt-2 overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-muted">
                        <tr>
                          <th className="text-left p-2 font-medium">Parameter</th>
                          <th className="text-left p-2 font-medium w-36">Reading Value</th>
                        </tr>
                      </thead>
                      <tbody>
                        {viewItem.readings.map((row, i) => (
                          <tr key={i} className="border-t">
                            <td className="p-2 text-sm">{row.specification}</td>
                            <td className="p-2"><Input value={row.reading_1} disabled /></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}
          <DialogFooter className="mt-4">
            <DialogClose asChild>
              <Button type="button" variant="outline">Close</Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Table */}
      <DataTable
        columns={columns}
        data={data || []}
        changeRowPerPage={handleChangeRowPerPage}
        paginate={paginate}
        changePaginate={handleChangePaginate}
        onRowClick={handleViewOpen}
      >
        <div className="flex items-center justify-between mb-4">
          <Input
            placeholder="Search..."
            value={keyword}
            onChange={handleKeywordChange}
            className="max-w-sm"
          />

          {/* Add Dialog */}
          <Dialog
            open={addOpen}
            onOpenChange={(open) => {
              setAddOpen(open);
              if (open) {
                setFormData(defaultFormData());
                setErrors({});
              }
            }}
          >
            <DialogTrigger asChild>
              <Button variant="outline">Add Quality Inspection</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Add Quality Inspection</DialogTitle>
                <DialogDescription>
                  Fill in the details below.
                </DialogDescription>
              </DialogHeader>
              {renderForm(
                formData,
                errors,
                setFormData,
                setErrors,
                handleSubmit,
                false,
              )}
            </DialogContent>
          </Dialog>
        </div>
      </DataTable>
    </div>
  );
};

export default Page;
