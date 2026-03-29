"use client";

import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { z } from "zod";
import { Check, ChevronsUpDown } from "lucide-react";
import { Items } from "@/types/items";
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
import { cn } from "@/lib/utils";

interface ItemGroup {
  name: string;
  parent_item_group: string;
}

const itemSchema = z.object({
  item_code: z.string().min(1, "Item Code is required"),
  item_name: z.string().min(1, "Item Name is required"),
  item_group: z.string().min(1, "Item Group is required"),
  stock_uom: z.string().min(1, "Stock UOM is required"),
});

const editSchema = z.object({
  item_name: z.string().min(1, "Item Name is required"),
  item_group: z.string().min(1, "Item Group is required"),
  stock_uom: z.string().min(1, "Stock UOM is required"),
});

type ItemFormData = z.infer<typeof itemSchema>;
type EditFormData = z.infer<typeof editSchema>;

const defaultFormData: ItemFormData = {
  item_code: "",
  item_name: "",
  item_group: "",
  stock_uom: "Nos",
};

const defaultEditFormData: EditFormData = {
  item_name: "",
  item_group: "",
  stock_uom: "Nos",
};

// ── ItemGroupCombobox ────────────────────────────────────────────────────────

interface ItemGroupComboboxProps {
  value: string;
  itemGroups: ItemGroup[];
  onChange: (value: string) => void;
}

function ItemGroupCombobox({
  value,
  itemGroups,
  onChange,
}: ItemGroupComboboxProps) {
  const [comboOpen, setComboOpen] = useState(false);
  return (
    <Popover open={comboOpen} onOpenChange={setComboOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={comboOpen}
          className="w-full justify-between font-normal"
        >
          {value || "Select item group..."}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0" align="start">
        <Command>
          <CommandInput placeholder="Search item group..." />
          <CommandList>
            <CommandEmpty>No item group found.</CommandEmpty>
            <CommandGroup>
              {itemGroups.map((group) => (
                <CommandItem
                  key={group.name}
                  value={group.name}
                  onSelect={() => {
                    // fix: ใช้ group.name โดยตรง ไม่ใช่ selected ที่เป็น lowercase
                    onChange(group.name);
                    setComboOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === group.name ? "opacity-100" : "opacity-0",
                    )}
                  />
                  <div className="flex flex-col">
                    <span className="font-medium">{group.name}</span>
                    <span className="text-xs text-primary">
                      {group.parent_item_group}
                    </span>
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
  const [data, setData] = useState<Items[] | null>(null);
  const [paginate, setPaginate] = useState<Paginate>({
    current_page: 1,
    total_page: 1,
    total: 0,
    page_size: 10,
  });
  const [itemGroups, setItemGroups] = useState<ItemGroup[]>([]);
  const [keyword, setKeyword] = useState("");

  // Add dialog
  const [addOpen, setAddOpen] = useState(false);
  const [formData, setFormData] = useState<ItemFormData>(defaultFormData);
  const [errors, setErrors] = useState<
    Partial<Record<keyof ItemFormData, string>>
  >({});

  // View dialog
  const [viewOpen, setViewOpen] = useState(false);
  const [viewItem, setViewItem] = useState<{ name: string; item_name: string; item_group: string; stock_uom: string } | null>(null);

  async function handleViewOpen(row: Items) {
    try {
      const response = await axios.get(`${process.env.NEXT_PUBLIC_API_BASE_URL}items/${row.name}`);
      const item = response.data.data;
      setViewItem({
        name: item.name,
        item_name: item.item_name ?? "",
        item_group: item.item_group ?? "",
        stock_uom: item.stock_uom ?? "",
      });
      setViewOpen(true);
    } catch {
      // ignore
    }
  }

  // Edit dialog
  const [editOpen, setEditOpen] = useState(false);
  const [editItemCode, setEditItemCode] = useState("");
  const [editFormData, setEditFormData] =
    useState<EditFormData>(defaultEditFormData);
  const [editErrors, setEditErrors] = useState<
    Partial<Record<keyof EditFormData, string>>
  >({});

  async function fetchData() {
    try {
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}items`,
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

  async function fetchItemGroups() {
    try {
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}item-groups`,
      );
      setItemGroups(response.data.data);
    } catch (err) {
      console.error("Failed to fetch item groups:", err);
      setItemGroups([]);
    }
  }

  useEffect(() => {
    fetchItemGroups();
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

  // ── Add ──────────────────────────────────────────────────────────────────

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const result = itemSchema.safeParse(formData);
    if (!result.success) {
      const fieldErrors: Partial<Record<keyof ItemFormData, string>> = {};
      for (const issue of result.error.issues) {
        const key = issue.path[0] as keyof ItemFormData;
        if (!fieldErrors[key]) fieldErrors[key] = issue.message;
      }
      setErrors(fieldErrors);
      return;
    }
    try {
      const checkRes = await axios.get(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}items/${result.data.item_code}`,
      );
      if (checkRes.data?.data?.name) {
        setErrors({ item_code: "Item Code already exists" });
        return;
      }
    } catch {
      // item ไม่มีอยู่ → ผ่าน
    }
    try {
      await axios.post(`${process.env.NEXT_PUBLIC_API_BASE_URL}items`, {
        ...result.data,
        inspection_required_before_purchase: true,
      });
      setErrors({});
      setFormData(defaultFormData);
      setAddOpen(false);
      fetchData();
    } catch {
      setErrors({ item_code: "Failed to create item. Please try again." });
    }
  }

  // ── Edit ─────────────────────────────────────────────────────────────────

  async function handleEditOpen(name: string) {
    try {
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}items/${name}`,
      );
      const item = response.data.data;
      setEditItemCode(item.name);
      setEditFormData({
        item_name: item.item_name ?? "",
        item_group: item.item_group ?? "",
        stock_uom: item.stock_uom ?? "Nos",
      });
      setEditErrors({});
      setEditOpen(true);
    } catch {
      // ไม่เปิด dialog ถ้า fetch ล้มเหลว
    }
  }

  function handleEditChange(e: React.ChangeEvent<HTMLInputElement>) {
    setEditFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleEditSubmit(e: React.FormEvent) {
    e.preventDefault();
    const result = editSchema.safeParse(editFormData);
    if (!result.success) {
      const fieldErrors: Partial<Record<keyof EditFormData, string>> = {};
      for (const issue of result.error.issues) {
        const key = issue.path[0] as keyof EditFormData;
        if (!fieldErrors[key]) fieldErrors[key] = issue.message;
      }
      setEditErrors(fieldErrors);
      return;
    }
    try {
      await axios.put(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}items/${editItemCode}`,
        result.data,
      );
      setEditErrors({});
      setEditOpen(false);
      fetchData();
    } catch {
      setEditErrors({ item_name: "Failed to update item. Please try again." });
    }
  }

  // ── Delete ───────────────────────────────────────────────────────────────

  async function handleDelete(name: string) {
    try {
      await axios.delete(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}items/${name}`,
      );
      fetchData();
    } catch {
      // ไม่ทำอะไรถ้า delete ล้มเหลว
    }
  }

  // ── Columns ───────────────────────────────────────────────────────────────

  const columns = useMemo<ColumnDef<Items>[]>(
    () => [
      { accessorKey: "name", header: "Item Code" },
      { accessorKey: "item_name", header: "Item Name" },
      { accessorKey: "item_group", header: "Item Group" },
      {
        id: "actions",
        header: "Action",
        cell: ({ row }) => (
          <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
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

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div>
      {/* ── View Dialog ─────────────────────────────────────────────────── */}
      <Dialog open={viewOpen} onOpenChange={setViewOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Item Detail</DialogTitle>
            <DialogDescription>
              <span className="font-medium text-foreground">{viewItem?.name}</span>
            </DialogDescription>
          </DialogHeader>
          <FieldGroup>
            <Field>
              <Label>Item Code</Label>
              <Input value={viewItem?.name ?? ""} disabled />
            </Field>
            <Field>
              <Label>Item Name</Label>
              <Input value={viewItem?.item_name ?? ""} disabled />
            </Field>
            <Field>
              <Label>Item Group</Label>
              <Input value={viewItem?.item_group ?? ""} disabled />
            </Field>
            <Field>
              <Label>Stock UOM</Label>
              <Input value={viewItem?.stock_uom ?? ""} disabled />
            </Field>
          </FieldGroup>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">Close</Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Edit Dialog ─────────────────────────────────────────────────── */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-sm">
          <form onSubmit={handleEditSubmit}>
            <DialogHeader>
              <DialogTitle>Edit Item</DialogTitle>
              <DialogDescription>
                Editing:{" "}
                <span className="font-medium text-foreground">
                  {editItemCode}
                </span>
              </DialogDescription>
            </DialogHeader>
            <FieldGroup>
              <Field>
                <Label>Item Code</Label>
                <Input value={editItemCode} disabled />
              </Field>
              <Field>
                <Label htmlFor="edit_item_name">
                  Item Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="edit_item_name"
                  name="item_name"
                  value={editFormData.item_name}
                  onChange={handleEditChange}
                />
                <FieldError>{editErrors.item_name}</FieldError>
              </Field>
              <Field>
                <Label>
                  Item Group <span className="text-destructive">*</span>
                </Label>
                <ItemGroupCombobox
                  value={editFormData.item_group}
                  itemGroups={itemGroups}
                  onChange={(value) => {
                    setEditFormData((prev) => ({ ...prev, item_group: value }));
                    setEditErrors((prev) => ({
                      ...prev,
                      item_group: undefined,
                    }));
                  }}
                />
                <FieldError>{editErrors.item_group}</FieldError>
              </Field>
              <Field>
                <Label htmlFor="edit_stock_uom">
                  Stock UOM <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="edit_stock_uom"
                  name="stock_uom"
                  value={editFormData.stock_uom}
                  onChange={handleEditChange}
                />
                <FieldError>{editErrors.stock_uom}</FieldError>
              </Field>
            </FieldGroup>
            <DialogFooter>
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
        onRowClick={handleViewOpen}
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
                await axios.post(
                  `${process.env.NEXT_PUBLIC_API_BASE_URL}items/mock-up-data`,
                );
                fetchData();
              }}
            >
              Mock Up Data
            </Button>

            {/* ── Add Dialog ────────────────────────────────────────────── */}
            <Dialog open={addOpen} onOpenChange={setAddOpen}>
              <DialogTrigger asChild>
                <Button variant="outline">Add Item</Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-sm">
                <form onSubmit={handleSubmit}>
                  <DialogHeader>
                    <DialogTitle>Add Item</DialogTitle>
                    <DialogDescription>
                      Fill in the item details below. Click save when
                      you&apos;re done.
                    </DialogDescription>
                  </DialogHeader>
                  <FieldGroup>
                    <Field>
                      <Label htmlFor="item_code">
                        Item Code <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="item_code"
                        name="item_code"
                        value={formData.item_code}
                        onChange={handleChange}
                      />
                      <FieldError>{errors.item_code}</FieldError>
                    </Field>
                    <Field>
                      <Label htmlFor="item_name">
                        Item Name <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="item_name"
                        name="item_name"
                        value={formData.item_name}
                        onChange={handleChange}
                      />
                      <FieldError>{errors.item_name}</FieldError>
                    </Field>
                    <Field>
                      <Label>
                        Item Group <span className="text-destructive">*</span>
                      </Label>
                      <ItemGroupCombobox
                        value={formData.item_group}
                        itemGroups={itemGroups}
                        onChange={(value) => {
                          setFormData((prev) => ({
                            ...prev,
                            item_group: value,
                          }));
                          setErrors((prev) => ({
                            ...prev,
                            item_group: undefined,
                          }));
                        }}
                      />
                      <FieldError>{errors.item_group}</FieldError>
                    </Field>
                    <Field>
                      <Label htmlFor="stock_uom">
                        Stock UOM <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="stock_uom"
                        name="stock_uom"
                        value={formData.stock_uom}
                        onChange={handleChange}
                      />
                      <FieldError>{errors.stock_uom}</FieldError>
                    </Field>
                  </FieldGroup>
                  <DialogFooter>
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
        </div>
      </DataTable>
    </div>
  );
};

export default Page;
