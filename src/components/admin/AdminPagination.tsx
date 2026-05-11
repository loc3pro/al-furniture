"use client";

import { PaginationBar } from "@/components/ui/PaginationBar";
import type { AdminListQueryNav } from "@/lib/admin-list-url";

type BasePaginationProps = {
  page: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  itemLabel?: string;
  pageSizeOptions?: readonly number[];
  onPageSizeChange?: (size: number) => void;
};

export type AdminPaginationProps = BasePaginationProps &
  (
    | { queryNav: AdminListQueryNav; hrefForPage?: never; hrefForPageSize?: never }
    | {
        queryNav?: undefined;
        hrefForPage: (page: number) => string;
        hrefForPageSize?: (size: number) => string;
      }
  );

export function AdminPagination(props: AdminPaginationProps) {
  const { page, totalPages, totalItems, pageSize, itemLabel, queryNav, hrefForPage, hrefForPageSize, pageSizeOptions, onPageSizeChange } =
    props;

  if (totalItems <= 0) return null;

  if (queryNav) {
    return (
      <div className="adminPaginationSticky">
        <PaginationBar
          variant="admin"
          page={page}
          totalPages={totalPages}
          totalItems={totalItems}
          pageSize={pageSize}
          itemLabel={itemLabel}
          queryNav={queryNav}
          pageSizeOptions={pageSizeOptions}
          onPageSizeChange={onPageSizeChange}
        />
      </div>
    );
  }

  return (
    <div className="adminPaginationSticky">
      <PaginationBar
        variant="admin"
        page={page}
        totalPages={totalPages}
        totalItems={totalItems}
        pageSize={pageSize}
        itemLabel={itemLabel}
        hrefForPage={hrefForPage}
        hrefForPageSize={hrefForPageSize}
        pageSizeOptions={pageSizeOptions}
        onPageSizeChange={onPageSizeChange}
      />
    </div>
  );
}
