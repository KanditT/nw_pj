import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";
import { Table } from "@tanstack/react-table";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { Button } from "./ui/button";
import { Paginate } from "@/types/paginate";

interface DataTablePaginationProps<TData> {
  table: Table<TData>;
  paginate: Paginate;
  changeRowPerPage: (value: number) => void;
  changePaginate: (page: number) => void;
}

export function DataTablePagination<TData>({
  table,
  paginate,
  changeRowPerPage,
  changePaginate,
}: DataTablePaginationProps<TData>) {
  return (
    <>
      {/* <div className="flex-1 text-sm text-muted-foreground">
        {table.getFilteredSelectedRowModel().rows.length} of{" "}
        {table.getFilteredRowModel().rows.length} row(s) selected.
      </div> */}

      <div className="flex items-center space-x-6 lg:space-x-8 text-muted-foreground">
        <div className="flex items-center space-x-2">
          <p className="text-sm font-medium">Rows per page</p>
          <div className="flex-col">
            {/* Stop rows per page count if there is no more data */}
            <Select
              defaultValue={String(paginate.page_size)}
              onValueChange={(value) => changeRowPerPage(Number(value))}
            >
              <SelectTrigger className="w-full max-w-48">
                <SelectValue placeholder="Select rows per page" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="1">1</SelectItem>

                  <SelectItem value="5">5</SelectItem>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="20">20</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
          {}
        </div>
        <div className="flex w-[100px] items-center justify-center text-sm font-medium">
          Page {paginate.current_page} of{" "}
          {paginate.total_page}
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            className="hidden h-8 w-8 p-0 lg:flex"
            onClick={() => changePaginate(1)}
            disabled={paginate.current_page === 1}
          >
            <span className="sr-only">Go to first page</span>
            <ChevronsLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            className="h-8 w-8 p-0"
            onClick={() => changePaginate(paginate.current_page - 1)}
            disabled={paginate.current_page === 1}
          >
            <span className="sr-only">Go to previous page</span>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            className="h-8 w-8 p-0"
            onClick={() => changePaginate(paginate.current_page + 1)}
            disabled={paginate.current_page === paginate.total_page}
          >
            <span className="sr-only">Go to next page</span>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            className="hidden h-8 w-8 p-0 lg:flex"
            onClick={() => changePaginate(paginate.total_page)}
            disabled={paginate.current_page === paginate.total_page}
          >
            <span className="sr-only">Go to last page</span>
            <ChevronsRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </>
  );
}
