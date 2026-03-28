"use client";

import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { z } from "zod";
import { Check, ChevronsUpDown, Plus, Trash2 } from "lucide-react";
import { PurchaseReceipt } from "@/types/purchase-receipt";
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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

// ── Types ────────────────────────────────────────────────────────────────────

interface Supplier {
  name: string;
  supplier_name: string;
}

interface ItemOption {
  name: string;
  item_name: string;
}

const NAMING_SERIES = ["MAT-PRE-.YYYY.-", "MAT-PR-RET-.YYYY.-"] as const;

// ── Schemas ──────────────────────────────────────────────────────────────────

const itemRowSchema = z.object({
  item_code: z.string().min(1, "Item is required"),
  qty: z.string()
    .min(1, "Qty is required")
    .refine((v) => !isNaN(Number(v)) && Number(v) >= 1, "Qty must be at least 1"),
  rate: z.string()
    .min(1, "Rate is required")
    .refine((v) => !isNaN(Number(v)) && Number(v) >= 0, "Rate must be >= 0"),
});

const prSchema = z.object({
  naming_series: z.string().min(1, "Series is required"),
  supplier: z.string().min(1, "Supplier is required"),
  posting_date: z.string().min(1, "Date is required"),
  posting_time: z.string().min(1, "Posting Time is required"),
  items: z.array(itemRowSchema).min(1, "At least one item is required"),
});

type ItemRowForm = { item_code: string; qty: string; rate: string };
type PRFormData = {
  naming_series: string;
  supplier: string;
  posting_date: string;
  posting_time: string;
  items: ItemRowForm[];
};

const defaultRow = (): ItemRowForm => ({ item_code: "", qty: "1", rate: "0" });

function getNow() {
  const now = new Date();
  const date = now.toLocaleDateString("en-CA"); // YYYY-MM-DD
  const time = now.toTimeString().slice(0, 8);  // HH:MM:SS
  return { date, time };
}

function getDefaultFormData(): PRFormData {
  const { date, time } = getNow();
  return {
    naming_series: "MAT-PRE-.YYYY.-",
    supplier: "",
    posting_date: date,
    posting_time: time,
    items: [defaultRow()],
  };
}

// ── SupplierCombobox ─────────────────────────────────────────────────────────

interface SupplierComboboxProps {
  value: string;
  suppliers: Supplier[];
  onChange: (value: string) => void;
}

function SupplierCombobox({ value, suppliers, onChange }: SupplierComboboxProps) {
  const [open, setOpen] = useState(false);
  const selected = suppliers.find((s) => s.name === value);
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
          {selected ? selected.supplier_name : "Select supplier..."}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0" align="start">
        <Command>
          <CommandInput placeholder="Search supplier..." />
          <CommandList>
            <CommandEmpty>No supplier found.</CommandEmpty>
            <CommandGroup>
              {suppliers.map((supplier) => (
                <CommandItem
                  key={supplier.name}
                  value={supplier.name}
                  onSelect={() => {
                    onChange(supplier.name);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === supplier.name ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {supplier.supplier_name}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

// ── ItemCombobox ─────────────────────────────────────────────────────────────

interface ItemComboboxProps {
  value: string;
  itemOptions: ItemOption[];
  onChange: (value: string) => void;
}

function ItemCombobox({ value, itemOptions, onChange }: ItemComboboxProps) {
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
          {value || "Select item..."}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0" align="start">
        <Command>
          <CommandInput placeholder="Search item..." />
          <CommandList>
            <CommandEmpty>No item found.</CommandEmpty>
            <CommandGroup>
              {itemOptions.map((item) => (
                <CommandItem
                  key={item.name}
                  value={item.name}
                  onSelect={() => {
                    onChange(item.name);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === item.name ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <div className="flex flex-col">
                    <span className="font-medium">{item.name}</span>
                    <span className="text-xs text-muted-foreground">{item.item_name}</span>
                  </div>
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
  const [data, setData] = useState<PurchaseReceipt[] | null>(null);
  const [paginate, setPaginate] = useState<Paginate>({
    current_page: 1,
    total_page: 1,
    total: 0,
    page_size: 10,
  });
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [itemOptions, setItemOptions] = useState<ItemOption[]>([]);
  const [keyword, setKeyword] = useState("");

  // Add dialog
  const [addOpen, setAddOpen] = useState(false);
  const [formData, setFormData] = useState<PRFormData>(getDefaultFormData);
  const [errors, setErrors] = useState<Partial<Record<string, string>>>({});

  // Edit dialog
  const [editOpen, setEditOpen] = useState(false);
  const [editName, setEditName] = useState("");
  const [editFormData, setEditFormData] = useState<PRFormData>(getDefaultFormData);
  const [editErrors, setEditErrors] = useState<Partial<Record<string, string>>>({});

  async function fetchData() {
    try {
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}purchase-receipts`,
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

  async function fetchSuppliers() {
    try {
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}suppliers`,
        { params: { page_size: 100, current_page: 1 } },
      );
      setSuppliers(response.data.data);
    } catch {
      setSuppliers([]);
    }
  }

  async function fetchItemOptions() {
    try {
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}items`,
        { params: { page_size: 100, current_page: 1 } },
      );
      setItemOptions(response.data.data);
    } catch {
      setItemOptions([]);
    }
  }

  useEffect(() => {
    fetchSuppliers();
    fetchItemOptions();
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

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  function handleItemRowChange(
    index: number,
    field: keyof ItemRowForm,
    value: string | number,
  ) {
    setFormData((prev) => {
      const updated = [...prev.items];
      updated[index] = { ...updated[index], [field]: value };
      return { ...prev, items: updated };
    });
  }

  function addItemRow() {
    setFormData((prev) => ({ ...prev, items: [...prev.items, defaultRow()] }));
  }

  function removeItemRow(index: number) {
    setFormData((prev) => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index),
    }));
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const result = prSchema.safeParse(formData);
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
        items: result.data.items.map((item) => ({
          ...item,
          qty: Number(item.qty),
          rate: Number(item.rate),
        })),
      };
      await axios.post(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}purchase-receipts`,
        payload,
      );
      setErrors({});
      setFormData(getDefaultFormData());
      setAddOpen(false);
      fetchData();
    } catch {
      setErrors({ naming_series: "Failed to create purchase receipt. Please try again." });
    }
  }

  // ── Edit ──────────────────────────────────────────────────────────────────

  async function handleEditOpen(name: string) {
    try {
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}purchase-receipts/${name}`,
      );
      const pr = response.data.data;
      setEditName(pr.name);
      setEditFormData({
        naming_series: pr.naming_series ?? "",
        supplier: pr.supplier ?? "",
        posting_date: pr.posting_date ?? "",
        posting_time: (pr.posting_time ?? "").slice(0, 8),
        items:
          (pr.items ?? []).map((item: { item_code?: string; qty?: number; rate?: number }) => ({
            item_code: item.item_code ?? "",
            qty: String(item.qty ?? 1),
            rate: String(item.rate ?? 0),
          })),
      });
      setEditErrors({});
      setEditOpen(true);
    } catch {
      // don't open if fetch failed
    }
  }

  function handleEditChange(e: React.ChangeEvent<HTMLInputElement>) {
    setEditFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  function handleEditItemRowChange(
    index: number,
    field: keyof ItemRowForm,
    value: string | number,
  ) {
    setEditFormData((prev) => {
      const updated = [...prev.items];
      updated[index] = { ...updated[index], [field]: value };
      return { ...prev, items: updated };
    });
  }

  function addEditItemRow() {
    setEditFormData((prev) => ({ ...prev, items: [...prev.items, defaultRow()] }));
  }

  function removeEditItemRow(index: number) {
    setEditFormData((prev) => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index),
    }));
  }

  async function handleEditSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const result = prSchema.safeParse(editFormData);
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
        items: result.data.items.map((item) => ({
          ...item,
          qty: Number(item.qty),
          rate: Number(item.rate),
        })),
      };
      await axios.put(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}purchase-receipts/${editName}`,
        payload,
      );
      setEditErrors({});
      setEditOpen(false);
      fetchData();
    } catch {
      setEditErrors({ naming_series: "Failed to update. Please try again." });
    }
  }

  // ── Delete ────────────────────────────────────────────────────────────────

  async function handleDelete(name: string) {
    try {
      await axios.delete(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}purchase-receipts/${name}`,
      );
      fetchData();
    } catch {
      // ignore
    }
  }

  // ── Columns ───────────────────────────────────────────────────────────────

  const columns = useMemo<ColumnDef<PurchaseReceipt>[]>(
    () => [
      { accessorKey: "name", header: "Receipt No." },
      { accessorKey: "supplier", header: "Supplier" },
      { accessorKey: "posting_date", header: "Date" },
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

  // ── Form helper ───────────────────────────────────────────────────────────

  function renderForm(
    fd: PRFormData,
    errs: Partial<Record<string, string>>,
    onFieldChange: (e: React.ChangeEvent<HTMLInputElement>) => void,
    onSupplierChange: (v: string) => void,
    onNamingSeriesChange: (v: string) => void,
    onItemRowChange: (i: number, f: keyof ItemRowForm, v: string) => void,
    onAddRow: () => void,
    onRemoveRow: (i: number) => void,
  ) {
    return (
      <>
        <FieldGroup>
          <Field>
            <Label>
              Series <span className="text-destructive">*</span>
            </Label>
            <Select value={fd.naming_series} onValueChange={onNamingSeriesChange}>
              <SelectTrigger>
                <SelectValue placeholder="Select series..." />
              </SelectTrigger>
              <SelectContent>
                {NAMING_SERIES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FieldError>{errs.naming_series}</FieldError>
          </Field>
          <Field>
            <Label>
              Supplier <span className="text-destructive">*</span>
            </Label>
            <SupplierCombobox
              value={fd.supplier}
              suppliers={suppliers}
              onChange={onSupplierChange}
            />
            <FieldError>{errs.supplier}</FieldError>
          </Field>
          <Field>
            <Label htmlFor="posting_date">
              Date <span className="text-destructive">*</span>
            </Label>
            <Input
              id="posting_date"
              name="posting_date"
              type="date"
              value={fd.posting_date}
              onChange={onFieldChange}
            />
            <FieldError>{errs.posting_date}</FieldError>
          </Field>
          <Field>
            <Label htmlFor="posting_time">
              Posting Time <span className="text-destructive">*</span>
            </Label>
            <Input
              id="posting_time"
              name="posting_time"
              type="time"
              value={fd.posting_time}
              onChange={onFieldChange}
            />
            <FieldError>{errs.posting_time}</FieldError>
          </Field>
        </FieldGroup>

        {/* Items Table */}
        <div className="mt-4">
          <Label>
            Items <span className="text-destructive">*</span>
          </Label>
          {errs.items && (
            <p className="text-sm text-destructive mt-1">{errs.items}</p>
          )}
          <div className="border rounded-md mt-2 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted">
                <tr>
                  <th className="text-left p-2 font-medium">Item</th>
                  <th className="text-left p-2 font-medium w-24">Qty</th>
                  <th className="text-left p-2 font-medium w-28">Rate</th>
                  <th className="p-2 w-10" />
                </tr>
              </thead>
              <tbody>
                {fd.items.map((row, i) => (
                  <tr key={i} className="border-t">
                    <td className="p-2">
                      <ItemCombobox
                        value={row.item_code}
                        itemOptions={itemOptions}
                        onChange={(v) => onItemRowChange(i, "item_code", v)}
                      />
                      {errs[`items.${i}.item_code`] && (
                        <p className="text-xs text-destructive mt-1">
                          {errs[`items.${i}.item_code`]}
                        </p>
                      )}
                    </td>
                    <td className="p-2">
                      <Input
                        type="number"
                        min={1}
                        value={row.qty}
                        onChange={(e) =>
                          onItemRowChange(i, "qty", e.target.value)
                        }
                      />
                      {errs[`items.${i}.qty`] && (
                        <p className="text-xs text-destructive mt-1">
                          {errs[`items.${i}.qty`]}
                        </p>
                      )}
                    </td>
                    <td className="p-2">
                      <Input
                        type="number"
                        min={0}
                        step="0.01"
                        value={row.rate}
                        onChange={(e) =>
                          onItemRowChange(i, "rate", e.target.value)
                        }
                      />
                      {errs[`items.${i}.rate`] && (
                        <p className="text-xs text-destructive mt-1">
                          {errs[`items.${i}.rate`]}
                        </p>
                      )}
                    </td>
                    <td className="p-2">
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        onClick={() => onRemoveRow(i)}
                        disabled={fd.items.length === 1}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-2"
            onClick={onAddRow}
          >
            <Plus className="h-4 w-4 mr-1" /> Add Row
          </Button>
        </div>
      </>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div>
      {/* ── Edit Dialog ─────────────────────────────────────────────────── */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <form onSubmit={handleEditSubmit}>
            <DialogHeader>
              <DialogTitle>Edit Purchase Receipt</DialogTitle>
              <DialogDescription>
                Editing:{" "}
                <span className="font-medium text-foreground">{editName}</span>
              </DialogDescription>
            </DialogHeader>
            {renderForm(
              editFormData,
              editErrors,
              handleEditChange,
              (v) => {
                setEditFormData((prev) => ({ ...prev, supplier: v }));
                setEditErrors((prev) => ({ ...prev, supplier: undefined }));
              },
              (v) => {
                setEditFormData((prev) => ({ ...prev, naming_series: v }));
                setEditErrors((prev) => ({ ...prev, naming_series: undefined }));
              },
              handleEditItemRowChange,
              addEditItemRow,
              removeEditItemRow,
            )}
            <DialogFooter className="mt-4">
              <DialogClose asChild>
                <Button type="button" variant="outline">
                  Cancel
                </Button>
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
                setFormData(getDefaultFormData());
                setErrors({});
              }
            }}
          >
            <DialogTrigger asChild>
              <Button variant="outline">Add Purchase Receipt</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
              <form onSubmit={handleSubmit}>
                <DialogHeader>
                  <DialogTitle>Add Purchase Receipt</DialogTitle>
                  <DialogDescription>
                    Fill in the details below. Click save when you&apos;re done.
                  </DialogDescription>
                </DialogHeader>
                {renderForm(
                  formData,
                  errors,
                  handleChange,
                  (v) => {
                    setFormData((prev) => ({ ...prev, supplier: v }));
                    setErrors((prev) => ({ ...prev, supplier: undefined }));
                  },
                  (v) => {
                    setFormData((prev) => ({ ...prev, naming_series: v }));
                    setErrors((prev) => ({ ...prev, naming_series: undefined }));
                  },
                  handleItemRowChange,
                  addItemRow,
                  removeItemRow,
                )}
                <DialogFooter className="mt-4">
                  <DialogClose asChild>
                    <Button type="button" variant="outline">
                      Cancel
                    </Button>
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
