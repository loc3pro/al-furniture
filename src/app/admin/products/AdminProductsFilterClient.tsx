"use client";

import { memo, useCallback, useEffect, useMemo, useState, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import type { AdminProductSortKey } from "@/lib/admin-products-query";
import { AdminSearchFilterRow } from "@/dashboard-ui/v1/components/AdminSearchFilterRow";
import { DbSearchField } from "@/dashboard-ui/v1/components/DbSearchField";
import { DbSelect, type DbSelectOption } from "@/dashboard-ui/v1/components/DbSelect";

type Cat = { id: string; nameVi: string };

function buildHref(q: string, categoryId: string, sortKey: AdminProductSortKey, sortDir: "asc" | "desc"): string {
  const p = new URLSearchParams();
  if (q.trim()) p.set("q", q.trim());
  if (categoryId) p.set("categoryId", categoryId);
  const defaultSort = sortKey === "updated" && sortDir === "desc";
  if (!defaultSort) {
    p.set("sort", sortKey);
    p.set("dir", sortDir);
  }
  const s = p.toString();
  return s ? `/admin/products?${s}` : "/admin/products";
}

export const AdminProductsFilterClient = memo(function AdminProductsFilterClient({
  initialQ,
  initialCategoryId,
  categories,
  sortKey,
  sortDir,
}: {
  initialQ: string;
  initialCategoryId: string;
  categories: Cat[];
  sortKey: AdminProductSortKey;
  sortDir: "asc" | "desc";
}) {
  const router = useRouter();
  const [q, setQ] = useState(initialQ);
  const [categoryId, setCategoryId] = useState(initialCategoryId);

  useEffect(() => {
    setQ(initialQ);
    setCategoryId(initialCategoryId);
  }, [initialQ, initialCategoryId]);

  const categoryOptions: DbSelectOption[] = useMemo(
    () => [
      { value: "__all__", label: "Tất cả" },
      ...categories.map((c) => ({ value: c.id, label: c.nameVi })),
    ],
    [categories],
  );

  const apply = useCallback(() => {
    router.push(buildHref(q, categoryId, sortKey, sortDir));
  }, [router, q, categoryId, sortKey, sortDir]);

  return (
    <AdminSearchFilterRow
      filtersAlignEnd
      search={
        <DbSearchField
          value={q}
          onChange={setQ}
          onSearch={apply}
          placeholder="Tìm…"
          searchLabel="Tìm"
          aria-label="Tìm sản phẩm: tên, slug, mã SP, SKU"
        />
      }
      filters={
        <DbSelect
          pill
          style={{ minWidth: 168, maxWidth: 360 }}
          value={categoryId ? categoryId : "__all__"}
          options={categoryOptions}
          onChange={(e: ChangeEvent<HTMLSelectElement>) => {
            const next = e.target.value === "__all__" ? "" : e.target.value;
            setCategoryId(next);
            router.push(buildHref(q, next, sortKey, sortDir));
          }}
          aria-label="Lọc theo danh mục"
        />
      }
    />
  );
});
