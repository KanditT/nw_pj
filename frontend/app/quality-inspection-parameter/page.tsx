"use client";

import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { z } from "zod";
import { QualityInspectionParameter } from "@/types/quality-inspection-parameter";
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

// ── Schema ───────────────────────────────────────────────────────────────────

const paramSchema = z.object({
  parameter: z.string().min(1, "Parameter Name is required"),
});

type ParamFormData = z.infer<typeof paramSchema>;

const defaultFormData: ParamFormData = { parameter: "" };

// ── Page ─────────────────────────────────────────────────────────────────────

const Page = () => {
  const [data, setData] = useState<QualityInspectionParameter[] | null>(null);
  const [paginate, setPaginate] = useState<Paginate>({
    current_page: 1,
    total_page: 1,
    total: 0,
    page_size: 10,
  });
  const [keyword, setKeyword] = useState("");

  // View dialog
  const [viewOpen, setViewOpen] = useState(false);
  const [viewItem, setViewItem] = useState<QualityInspectionParameter | null>(null);

  // Add dialog
  const [addOpen, setAddOpen] = useState(false);
  const [formData, setFormData] = useState<ParamFormData>(defaultFormData);
  const [errors, setErrors] = useState<Partial<Record<keyof ParamFormData, string>>>({});

  async function fetchData() {
    try {
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}quality-inspection-parameters`,
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

  // ── Add ───────────────────────────────────────────────────────────────────

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const result = paramSchema.safeParse(formData);
    if (!result.success) {
      const fieldErrors: Partial<Record<keyof ParamFormData, string>> = {};
      for (const issue of result.error.issues) {
        const key = issue.path[0] as keyof ParamFormData;
        if (!fieldErrors[key]) fieldErrors[key] = issue.message;
      }
      setErrors(fieldErrors);
      return;
    }
    try {
      await axios.post(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}quality-inspection-parameters`,
        result.data,
      );
      setErrors({});
      setFormData(defaultFormData);
      setAddOpen(false);
      fetchData();
    } catch {
      setErrors({ parameter: "Failed to create parameter. Please try again." });
    }
  }

  // ── View ─────────────────────────────────────────────────────────────────

  function handleViewOpen(row: QualityInspectionParameter) {
    setViewItem(row);
    setViewOpen(true);
  }

  // ── Delete ────────────────────────────────────────────────────────────────

  async function handleDelete(name: string) {
    try {
      await axios.delete(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}quality-inspection-parameters/${name}`,
      );
      fetchData();
    } catch {
      // ignore
    }
  }

  // ── Columns ───────────────────────────────────────────────────────────────

  const columns = useMemo<ColumnDef<QualityInspectionParameter>[]>(
    () => [
      { accessorKey: "name", header: "Parameter Name" },
      {
        id: "actions",
        header: "Action",
        cell: ({ row }) => (
          <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
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
            <DialogTitle>Quality Inspection Parameter</DialogTitle>
            <DialogDescription>
              <span className="font-medium text-foreground">{viewItem?.name}</span>
            </DialogDescription>
          </DialogHeader>
          {viewItem && (
            <FieldGroup>
              <Field>
                <Label>Parameter Name</Label>
                <Input value={viewItem.name} disabled />
              </Field>
            </FieldGroup>
          )}
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">Close</Button>
            </DialogClose>
          </DialogFooter>
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

          {/* ── Add Dialog ────────────────────────────────────────────── */}
          <div className="flex gap-2">
          <Button
            variant="secondary"
            onClick={async () => {
              await axios.post(`${process.env.NEXT_PUBLIC_API_BASE_URL}quality-inspection-parameters/mock-up-data`);
              fetchData();
            }}
          >
            Mock Up Data
          </Button>

          <Dialog
            open={addOpen}
            onOpenChange={(open) => {
              setAddOpen(open);
              if (open) {
                setFormData(defaultFormData);
                setErrors({});
              }
            }}
          >
            <DialogTrigger asChild>
              <Button variant="outline">Add Parameter</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-sm">
              <form onSubmit={handleSubmit}>
                <DialogHeader>
                  <DialogTitle>Add Parameter</DialogTitle>
                  <DialogDescription>
                    Fill in the parameter name. Click save when you&apos;re done.
                  </DialogDescription>
                </DialogHeader>
                <FieldGroup>
                  <Field>
                    <Label htmlFor="parameter">
                      Parameter Name <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="parameter"
                      value={formData.parameter}
                      onChange={(e) =>
                        setFormData({ parameter: e.target.value })
                      }
                    />
                    <FieldError>{errors.parameter}</FieldError>
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
