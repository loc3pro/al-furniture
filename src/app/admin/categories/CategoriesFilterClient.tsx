"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { AdminSearchFilterRow } from "@/dashboard-ui/v1/components/AdminSearchFilterRow";
import { DbSearchField } from "@/dashboard-ui/v1/components/DbSearchField";

export type CategoriesSortCol = "name" | "slug";

function categoriesListHref(q: string, col: CategoriesSortCol, dir: "asc" | "desc"): string {
  const p = new URLSearchParams();
  if (q.trim()) p.set("q", q.trim());
  const isDefault = col === "name" && dir === "asc";
  if (!isDefault) {
    p.set("sort", col);
    p.set("dir", dir);
  }
  const s = p.toString();
  return `/admin/categories${s ? `?${s}` : ""}`;
}

export function CategoriesFilterClient({
  initialQ,
  sortCol,
  sortDir,
}: {
  initialQ: string;
  sortCol: CategoriesSortCol;
  sortDir: "asc" | "desc";
}) {
  const router = useRouter();
  const [q, setQ] = useState(initialQ);

  useEffect(() => {
    setQ(initialQ);
  }, [initialQ]);

  const apply = useCallback(() => {
    router.push(categoriesListHref(q, sortCol, sortDir));
  }, [router, q, sortCol, sortDir]);

  return (
    <AdminSearchFilterRow
      search={
        <DbSearchField
          value={q}
          onChange={setQ}
          onSearch={apply}
          placeholder="Tìm…"
          searchLabel="Tìm"
          aria-label="Tìm danh mục: tên, slug"
        />
      }
    />
  );
}
