"use client";

import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { z } from "zod";
import { Check, ChevronsUpDown, Plus, Trash2 } from "lucide-react";
import { QualityInspectionTemplate } from "@/types/quality-inspection-template";
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
  CommandSeparator,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

// ── Types ────────────────────────────────────────────────────────────────────

interface QIParameter {
  name: string;
}

type ParameterRowForm = {
  specification: string;
  numeric: boolean;
  minimum_value: string;
  maximum_value: string;
};

type QITFormData = {
  quality_inspection_template_name: string;
  item_quality_inspection_parameter: ParameterRowForm[];
};

// ── Schemas ──────────────────────────────────────────────────────────────────

const paramRowSchema = z.object({
  specification: z.string().min(1, "Specification is required"),
  numeric: z.boolean(),
  minimum_value: z.string().default(""),
  maximum_value: z.string().default(""),
});

const templateSchema = z.object({
  quality_inspection_template_name: z.string().min(1, "Template Name is required"),
  item_quality_inspection_parameter: z
    .array(paramRowSchema)
    .min(1, "At least one parameter is required"),
});

const defaultParamRow = (): ParameterRowForm => ({
  specification: "",
  numeric: false,
  minimum_value: "",
  maximum_value: "",
});

const defaultFormData = (): QITFormData => ({
  quality_inspection_template_name: "",
  item_quality_inspection_parameter: [defaultParamRow()],
});

// ── ParameterCombobox ────────────────────────────────────────────────────────

interface ParameterComboboxProps {
  value: string;
  parameters: QIParameter[];
  onChange: (value: string) => void;
}

function ParameterCombobox({
  value,
  parameters,
  onChange,
}: ParameterComboboxProps) {
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between font-normal"
        >
          {value || "Select parameter..."}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0" align="start">
        <Command>
          <CommandInput placeholder="Search parameter..." />
          <CommandList>
            <CommandEmpty>No parameter found.</CommandEmpty>
            <CommandGroup>
              {parameters.map((p) => (
                <CommandItem
                  key={p.name}
                  value={p.name}
                  onSelect={() => {
                    onChange(p.name);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === p.name ? "opacity-100" : "opacity-0",
                    )}
                  />
                  {p.name}
                </CommandItem>
              ))}
            </CommandGroup>
            <CommandSeparator />
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

const Page = () => {
  const [data, setData] = useState<QualityInspectionTemplate[] | null>(null);
  const [paginate, setPaginate] = useState<Paginate>({
    current_page: 1,
    total_page: 1,
    total: 0,
    page_size: 10,
  });
  const [parameters, setParameters] = useState<QIParameter[]>([]);
  const [keyword, setKeyword] = useState("");

  // Add dialog
  const [addOpen, setAddOpen] = useState(false);
  const [formData, setFormData] = useState<QITFormData>(defaultFormData);
  const [errors, setErrors] = useState<Partial<Record<string, string>>>({});

  // Edit dialog
  const [editOpen, setEditOpen] = useState(false);
  const [editName, setEditName] = useState("");
  const [editFormData, setEditFormData] = useState<QITFormData>(defaultFormData);
  const [editErrors, setEditErrors] = useState<Partial<Record<string, string>>>({});

  // Create Parameter dialog (rendered at page level — not nested)
  const [createParamOpen, setCreateParamOpen] = useState(false);
  const [createParamName, setCreateParamName] = useState("");
  const [createParamError, setCreateParamError] = useState("");
  // which row + which form triggered "create new"
  const [pendingRowIndex, setPendingRowIndex] = useState<number>(-1);
  const [pendingIsEdit, setPendingIsEdit] = useState(false);

  async function fetchData() {
    try {
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}quality-inspection-templates`,
        {
          params: {
            current_page: paginate.current_page,
            page_size: paginate.page_size,
            ...(keyword && { keyword }),
          },
        },
      );
      setData(response.data.data);
      setPaginate(response.data.pagination);
    } catch {
      setData([]);
    }
  }

  async function fetchParameters() {
    try {
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}quality-inspection-parameters/all`,
      );
      setParameters(response.data.data ?? []);
    } catch {
      setParameters([]);
    }
  }

  useEffect(() => {
    fetchParameters();
  }, []);

  useEffect(() => {
    fetchData();
  }, [paginate.current_page, paginate.page_size, keyword]);

  function handleKeywordChange(e: React.ChangeEvent<HTMLInputElement>) {
    setKeyword(e.target.value);
    setPaginate((prev) => ({ ...prev, current_page: 1 }));
  }

  function handleChangeRowPerPage(value: number) {
    setPaginate((prev) => ({ ...prev, current_page: 1, page_size: value }));
  }

  function handleChangePaginate(page: number) {
    setPaginate((prev) => ({ ...prev, current_page: page }));
  }

  // ── Add ───────────────────────────────────────────────────────────────────

  function updateRow(index: number, field: keyof ParameterRowForm, value: string | boolean) {
    setFormData((prev) => {
      const rows = [...prev.item_quality_inspection_parameter];
      rows[index] = { ...rows[index], [field]: value };
      return { ...prev, item_quality_inspection_parameter: rows };
    });
  }

  function addRow() {
    setFormData((prev) => ({
      ...prev,
      item_quality_inspection_parameter: [
        ...prev.item_quality_inspection_parameter,
        defaultParamRow(),
      ],
    }));
  }

  function removeRow(index: number) {
    setFormData((prev) => ({
      ...prev,
      item_quality_inspection_parameter: prev.item_quality_inspection_parameter.filter(
        (_, i) => i !== index,
      ),
    }));
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const result = templateSchema.safeParse(formData);
    if (!result.success) {
      const fieldErrors: Partial<Record<string, string>> = {};
      for (const issue of result.error.issues) {
        const key = issue.path.join(".");
        if (!fieldErrors[key]) fieldErrors[key] = issue.message;
      }
      setErrors(fieldErrors);
      return;
    }
    try {
      const payload = {
        ...result.data,
        item_quality_inspection_parameter: result.data.item_quality_inspection_parameter.map(
          (row) => ({
            specification: row.specification,
            numeric: row.numeric ? 1 : 0,
            ...(row.minimum_value !== "" && { minimum_value: parseFloat(row.minimum_value) }),
            ...(row.maximum_value !== "" && { maximum_value: parseFloat(row.maximum_value) }),
          }),
        ),
      };
      await axios.post(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}quality-inspection-templates`,
        payload,
      );
      setErrors({});
      setFormData(defaultFormData());
      setAddOpen(false);
      fetchData();
    } catch {
      setErrors({ quality_inspection_template_name: "Failed to create template. Please try again." });
    }
  }

  // ── Edit ──────────────────────────────────────────────────────────────────

  async function handleEditOpen(name: string) {
    try {
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}quality-inspection-templates/${name}`,
      );
      const t = response.data.data;
      
      setEditName(t.name);
      setEditFormData({
        quality_inspection_template_name: t.quality_inspection_template_name ?? "",
        item_quality_inspection_parameter: (t.item_quality_inspection_parameter ?? []).map(
          (row: { specification?: string; numeric?: number | boolean; minimum_value?: number; maximum_value?: number }) => ({
            specification: row.specification ?? "",
            numeric: Boolean(row.numeric),
            minimum_value: row.minimum_value != null ? String(row.minimum_value) : "",
            maximum_value: row.maximum_value != null ? String(row.maximum_value) : "",
          }),
        ),
      });
      setEditErrors({});
      setEditOpen(true);
    } catch {
      // don't open if fetch failed
    }
  }

  function updateEditRow(index: number, field: keyof ParameterRowForm, value: string | boolean) {
    setEditFormData((prev) => {
      const rows = [...prev.item_quality_inspection_parameter];
      rows[index] = { ...rows[index], [field]: value };
      return { ...prev, item_quality_inspection_parameter: rows };
    });
  }

  function addEditRow() {
    setEditFormData((prev) => ({
      ...prev,
      item_quality_inspection_parameter: [
        ...prev.item_quality_inspection_parameter,
        defaultParamRow(),
      ],
    }));
  }

  function removeEditRow(index: number) {
    setEditFormData((prev) => ({
      ...prev,
      item_quality_inspection_parameter: prev.item_quality_inspection_parameter.filter(
        (_, i) => i !== index,
      ),
    }));
  }

  async function handleEditSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const result = templateSchema.safeParse(editFormData);
    if (!result.success) {
      const fieldErrors: Partial<Record<string, string>> = {};
      for (const issue of result.error.issues) {
        const key = issue.path.join(".");
        if (!fieldErrors[key]) fieldErrors[key] = issue.message;
      }
      setEditErrors(fieldErrors);
      return;
    }
    try {
      const payload = {
        ...result.data,
        item_quality_inspection_parameter: result.data.item_quality_inspection_parameter.map(
          (row) => ({
            parameter: row.specification,
            numeric: row.numeric ? 1 : 0,
            ...(row.minimum_value !== "" && { minimum_value: parseFloat(row.minimum_value) }),
            ...(row.maximum_value !== "" && { maximum_value: parseFloat(row.maximum_value) }),
          }),
        ),
      };
      await axios.put(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}quality-inspection-templates/${editName}`,
        payload,
      );
      setEditErrors({});
      setEditOpen(false);
      fetchData();
    } catch {
      setEditErrors({ quality_inspection_template_name: "Failed to update. Please try again." });
    }
  }

  // ── Delete ────────────────────────────────────────────────────────────────

  async function handleDelete(name: string) {
    try {
      await axios.delete(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}quality-inspection-templates/${name}`,
      );
      fetchData();
    } catch {
      // ignore
    }
  }

  // ── Columns ───────────────────────────────────────────────────────────────

  const columns = useMemo<ColumnDef<QualityInspectionTemplate>[]>(
    () => [
      { accessorKey: "name", header: "Template Name" },
      {
        id: "actions",
        header: "Action",
        cell: ({ row }) => (
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleEditOpen(row.original.name)}
            >
              Edit
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={() => handleDelete(row.original.name)}
            >
              Delete
            </Button>
          </div>
        ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  // ── Parameter table render helper ─────────────────────────────────────────

  function renderParamTable(
    rows: ParameterRowForm[],
    errs: Partial<Record<string, string>>,
    isEdit: boolean,
    onRowChange: (i: number, f: keyof ParameterRowForm, v: string | boolean) => void,
    onAdd: () => void,
    onRemove: (i: number) => void,
  ) {
    return (
      <div className="mt-2">
        {errs["item_quality_inspection_parameter"] && (
          <p className="text-sm text-destructive mb-1">
            {errs["item_quality_inspection_parameter"]}
          </p>
        )}
        <div className="border rounded-md overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted">
              <tr>
                <th className="text-left p-2 font-medium">Parameter</th>
                <th className="text-center p-2 font-medium w-20">Numeric</th>
                <th className="text-left p-2 font-medium w-28">Min Value</th>
                <th className="text-left p-2 font-medium w-28">Max Value</th>
                <th className="p-2 w-10" />
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => {
console.log("rowrowrow", row);

                return (
                <tr key={i} className="border-t">
                  <td className="p-2">
                    <ParameterCombobox
                      value={row.specification}
                      parameters={parameters}
                      onChange={(v) => onRowChange(i, "specification", v)}
                    />
                    {errs[`item_quality_inspection_parameter.${i}.specification`] && (
                      <p className="text-xs text-destructive mt-1">
                        {errs[`item_quality_inspection_parameter.${i}.specification`]}
                      </p>
                    )}
                  </td>
                  <td className="p-2 text-center">
                    <input
                      type="checkbox"
                      checked={row.numeric}
                      onChange={(e) => onRowChange(i, "numeric", e.target.checked)}
                      className="h-4 w-4 cursor-pointer"
                    />
                  </td>
                  <td className="p-2">
                    <Input
                      type="number"
                      step="any"
                      value={row.minimum_value}
                      onChange={(e) => onRowChange(i, "minimum_value", e.target.value)}
                      placeholder="—"
                    />
                  </td>
                  <td className="p-2">
                    <Input
                      type="number"
                      step="any"
                      value={row.maximum_value}
                      onChange={(e) => onRowChange(i, "maximum_value", e.target.value)}
                      placeholder="—"
                    />
                  </td>
                  <td className="p-2">
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      onClick={() => onRemove(i)}
                      disabled={rows.length === 1}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </td>
                </tr>
                )
  })}
            </tbody>
          </table>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="mt-2"
          onClick={onAdd}
        >
          <Plus className="h-4 w-4 mr-1" /> Add Row
        </Button>
      </div>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div>
      {/* ── Edit Dialog ─────────────────────────────────────────────────── */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
          <form onSubmit={handleEditSubmit}>
            <DialogHeader>
              <DialogTitle>Edit Quality Inspection Template</DialogTitle>
              <DialogDescription>
                Editing:{" "}
                <span className="font-medium text-foreground">{editName}</span>
              </DialogDescription>
            </DialogHeader>
            <FieldGroup>
              <Field>
                <Label htmlFor="edit_template_name">
                  Quality Inspection Template Name{" "}
                  <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="edit_template_name"
                  value={editFormData.quality_inspection_template_name}
                  onChange={(e) =>
                    setEditFormData((prev) => ({
                      ...prev,
                      quality_inspection_template_name: e.target.value,
                    }))
                  }
                />
                <FieldError>
                  {editErrors.quality_inspection_template_name}
                </FieldError>
              </Field>
            </FieldGroup>
            <div className="mt-4">
              <Label>
                Item Quality Inspection Parameter{" "}
                <span className="text-destructive">*</span>
              </Label>
              {renderParamTable(
                editFormData.item_quality_inspection_parameter,
                editErrors,
                true,
                updateEditRow,
                addEditRow,
                removeEditRow,
              )}
            </div>
            <DialogFooter className="mt-4">
              <DialogClose asChild>
                <Button type="button" variant="outline">Cancel</Button>
              </DialogClose>
              <Button type="submit">Save changes</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Table ───────────────────────────────────────────────────────── */}
      <DataTable
        columns={columns}
        data={data || []}
        changeRowPerPage={handleChangeRowPerPage}
        paginate={paginate}
        changePaginate={handleChangePaginate}
      >
        <div className="flex items-center justify-between mb-4">
          <Input
            placeholder="Search..."
            value={keyword}
            onChange={handleKeywordChange}
            className="max-w-sm"
          />

          {/* ── Add Dialog ────────────────────────────────────────────── */}
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
              <Button variant="outline">Add Template</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
              <form onSubmit={handleSubmit}>
                <DialogHeader>
                  <DialogTitle>Add Quality Inspection Template</DialogTitle>
                  <DialogDescription>
                    Fill in the details below. Click save when you&apos;re done.
                  </DialogDescription>
                </DialogHeader>
                <FieldGroup>
                  <Field>
                    <Label htmlFor="template_name">
                      Quality Inspection Template Name{" "}
                      <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="template_name"
                      value={formData.quality_inspection_template_name}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          quality_inspection_template_name: e.target.value,
                        }))
                      }
                    />
                    <FieldError>
                      {errors.quality_inspection_template_name}
                    </FieldError>
                  </Field>
                </FieldGroup>
                <div className="mt-4">
                  <Label>
                    Item Quality Inspection Parameter{" "}
                    <span className="text-destructive">*</span>
                  </Label>
                  {renderParamTable(
                    formData.item_quality_inspection_parameter,
                    errors,
                    false,
                    updateRow,
                    addRow,
                    removeRow,
                  )}
                </div>
                <DialogFooter className="mt-4">
                  <DialogClose asChild>
                    <Button type="button" variant="outline">Cancel</Button>
                  </DialogClose>
                  <Button type="submit">Save changes</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </DataTable>
    </div>
  );
};

export default Page;
