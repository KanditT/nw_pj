"use client";

import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { z } from "zod";
import { Check, ChevronsUpDown } from "lucide-react";
import { Supplier } from "@/types/supplier";
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
import { cn } from "@/lib/utils";
import { SUPPLIER_TYPES } from "@/config/supplier-types";

interface SupplierType {
  name: string;
}

const addSchema = z.object({
  supplier_name: z.string().min(1, "Supplier Name is required"),
  supplier_type: z.string().min(1, "Supplier Type is required"),
});

const editSchema = z.object({
  supplier_name: z.string().min(1, "Supplier Name is required"),
  supplier_type: z.string().min(1, "Supplier Type is required"),
});

type AddFormData = z.infer<typeof addSchema>;
type EditFormData = z.infer<typeof editSchema>;

const defaultAddForm: AddFormData = { supplier_name: "", supplier_type: "" };
const defaultEditForm: EditFormData = { supplier_name: "", supplier_type: "" };

// ── SupplierTypeCombobox ──────────────────────────────────────────────────────

interface SupplierTypeComboboxProps {
  value: string;
  supplierTypes: SupplierType[];
  onChange: (value: string) => void;
}

function SupplierTypeCombobox({ value, supplierTypes, onChange }: SupplierTypeComboboxProps) {
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
          {value || "Select supplier type..."}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0" align="start">
        <Command>
          <CommandInput placeholder="Search supplier type..." />
          <CommandList>
            <CommandEmpty>No supplier type found.</CommandEmpty>
            <CommandGroup>
              {supplierTypes.map((type) => (
                <CommandItem
                  key={type.name}
                  value={type.name}
                  onSelect={() => {
                    onChange(type.name);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === type.name ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {type.name}
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
  const [data, setData] = useState<Supplier[] | null>(null);
  const [paginate, setPaginate] = useState<Paginate>({
    current_page: 1,
    total_page: 1,
    total: 0,
    page_size: 10,
  });
  const [keyword, setKeyword] = useState("");
  const supplierTypes: SupplierType[] = SUPPLIER_TYPES.map((name) => ({ name }));

  // Add dialog
  const [addOpen, setAddOpen] = useState(false);
  const [addForm, setAddForm] = useState<AddFormData>(defaultAddForm);
  const [addErrors, setAddErrors] = useState<Partial<Record<keyof AddFormData, string>>>({});

  // Edit dialog
  const [editOpen, setEditOpen] = useState(false);
  const [editName, setEditName] = useState("");
  const [editForm, setEditForm] = useState<EditFormData>(defaultEditForm);
  const [editErrors, setEditErrors] = useState<Partial<Record<keyof EditFormData, string>>>({});

  async function fetchData() {
    try {
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}suppliers`,
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

  // ── Add ──────────────────────────────────────────────────────────────────

  function handleAddChange(e: React.ChangeEvent<HTMLInputElement>) {
    setAddForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleAddSubmit(e: React.FormEvent) {
    e.preventDefault();
    const result = addSchema.safeParse(addForm);
    if (!result.success) {
      const errs: Partial<Record<keyof AddFormData, string>> = {};
      for (const issue of result.error.issues) {
        const key = issue.path[0] as keyof AddFormData;
        if (!errs[key]) errs[key] = issue.message;
      }
      setAddErrors(errs);
      return;
    }
    try {
      await axios.post(`${process.env.NEXT_PUBLIC_API_BASE_URL}suppliers`, result.data);
      setAddErrors({});
      setAddForm(defaultAddForm);
      setAddOpen(false);
      fetchData();
    } catch {
      setAddErrors({ supplier_name: "Failed to create supplier. Please try again." });
    }
  }

  // ── Edit ─────────────────────────────────────────────────────────────────

  async function handleEditOpen(name: string) {
    try {
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}suppliers/${name}`,
      );
      const item = response.data.data;
      setEditName(item.name);
      setEditForm({
        supplier_name: item.supplier_name ?? "",
        supplier_type: item.supplier_type ?? "",
      });
      setEditErrors({});
      setEditOpen(true);
    } catch {
      // ไม่เปิด dialog ถ้า fetch ล้มเหลว
    }
  }

  function handleEditChange(e: React.ChangeEvent<HTMLInputElement>) {
    setEditForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleEditSubmit(e: React.FormEvent) {
    e.preventDefault();
    const result = editSchema.safeParse(editForm);
    if (!result.success) {
      const errs: Partial<Record<keyof EditFormData, string>> = {};
      for (const issue of result.error.issues) {
        const key = issue.path[0] as keyof EditFormData;
        if (!errs[key]) errs[key] = issue.message;
      }
      setEditErrors(errs);
      return;
    }
    try {
      await axios.put(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}suppliers/${editName}`,
        result.data,
      );
      setEditErrors({});
      setEditOpen(false);
      fetchData();
    } catch {
      setEditErrors({ supplier_name: "Failed to update supplier. Please try again." });
    }
  }

  // ── Delete ───────────────────────────────────────────────────────────────

  async function handleDelete(name: string) {
    try {
      await axios.delete(`${process.env.NEXT_PUBLIC_API_BASE_URL}suppliers/${name}`);
      fetchData();
    } catch {
      // ไม่ทำอะไรถ้า delete ล้มเหลว
    }
  }

  // ── Columns ───────────────────────────────────────────────────────────────

  const columns = useMemo<ColumnDef<Supplier>[]>(
    () => [
      { accessorKey: "name", header: "Supplier ID" },
      { accessorKey: "supplier_name", header: "Supplier Name" },
      { accessorKey: "supplier_type", header: "Supplier Type" },
      {
        id: "actions",
        header: "Action",
        cell: ({ row }) => (
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => handleEditOpen(row.original.name)}>
              Edit
            </Button>
            <Button size="sm" variant="destructive" onClick={() => handleDelete(row.original.name)}>
              Delete
            </Button>
          </div>
        ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div>
      {/* ── Edit Dialog ─────────────────────────────────────────────────── */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-sm">
          <form onSubmit={handleEditSubmit}>
            <DialogHeader>
              <DialogTitle>Edit Supplier</DialogTitle>
              <DialogDescription>
                Editing: <span className="font-medium text-foreground">{editName}</span>
              </DialogDescription>
            </DialogHeader>
            <FieldGroup>
              <Field>
                <Label>
                  Supplier Type <span className="text-destructive">*</span>
                </Label>
                <SupplierTypeCombobox
                  value={editForm.supplier_type}
                  supplierTypes={supplierTypes}
                  onChange={(value) => {
                    setEditForm((prev) => ({ ...prev, supplier_type: value }));
                    setEditErrors((prev) => ({ ...prev, supplier_type: undefined }));
                  }}
                />
                <FieldError>{editErrors.supplier_type}</FieldError>
              </Field>
              <Field>
                <Label htmlFor="edit_supplier_name">
                  Supplier Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="edit_supplier_name"
                  name="supplier_name"
                  value={editForm.supplier_name}
                  onChange={handleEditChange}
                />
                <FieldError>{editErrors.supplier_name}</FieldError>
              </Field>
            </FieldGroup>
            <DialogFooter>
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

          <div className="flex gap-2">
          <Button
            variant="secondary"
            onClick={async () => {
              await axios.post(`${process.env.NEXT_PUBLIC_API_BASE_URL}suppliers/mock-up-data`);
              fetchData();
            }}
          >
            Mock Up Data
          </Button>

          {/* ── Add Dialog ────────────────────────────────────────────── */}
          <Dialog open={addOpen} onOpenChange={setAddOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">Add Supplier</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-sm">
              <form onSubmit={handleAddSubmit}>
                <DialogHeader>
                  <DialogTitle>Add Supplier</DialogTitle>
                  <DialogDescription>
                    Fill in the supplier details below.
                  </DialogDescription>
                </DialogHeader>
                <FieldGroup>
                  <Field>
                    <Label>
                      Supplier Type <span className="text-destructive">*</span>
                    </Label>
                    <SupplierTypeCombobox
                      value={addForm.supplier_type}
                      supplierTypes={supplierTypes}
                      onChange={(value) => {
                        setAddForm((prev) => ({ ...prev, supplier_type: value }));
                        setAddErrors((prev) => ({ ...prev, supplier_type: undefined }));
                      }}
                    />
                    <FieldError>{addErrors.supplier_type}</FieldError>
                  </Field>
                  <Field>
                    <Label htmlFor="supplier_name">
                      Supplier Name <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="supplier_name"
                      name="supplier_name"
                      value={addForm.supplier_name}
                      onChange={handleAddChange}
                    />
                    <FieldError>{addErrors.supplier_name}</FieldError>
                  </Field>
                </FieldGroup>
                <DialogFooter>
                  <DialogClose asChild>
                    <Button type="button" variant="outline">Cancel</Button>
                  </DialogClose>
                  <Button type="submit">Save changes</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
          </div>
        </div>
      </DataTable>
    </div>
  );
};

export default Page;
