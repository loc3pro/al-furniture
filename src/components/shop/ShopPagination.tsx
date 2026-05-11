"use client";

import { PaginationBar, type PaginationBarProps } from "@/components/ui/PaginationBar";

/** Phân trang storefront — cùng UI với admin (variant shop). Không hiển thị "Hiển thị X–Y / Z …" (đã có ô phân trang). */
export function ShopPagination(props: Omit<PaginationBarProps, "variant">) {
  return (
    <PaginationBar
      {...(props as PaginationBarProps)}
      variant="shop"
      showItemRange={props.showItemRange ?? false}
    />
  );
}
