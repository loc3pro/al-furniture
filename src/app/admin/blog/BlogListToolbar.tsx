"use client";

import { memo, useCallback, useEffect, useMemo, useState, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { AdminSearchFilterRow } from "@/dashboard-ui/v1/components/AdminSearchFilterRow";
import { DbSearchField } from "@/dashboard-ui/v1/components/DbSearchField";
import { DbSelect, type DbSelectOption } from "@/dashboard-ui/v1/components/DbSelect";
import type { BlogListParsed, BlogSortMode } from "@/lib/admin-blog-list";
import { blogListHref } from "@/lib/admin-blog-list";
import { ADMIN_PAGE_SIZE_DEFAULT } from "@/lib/admin-pagination";

function buildParsed(
  q: string,
  author: string,
  sort: BlogSortMode,
  dir: "asc" | "desc",
  page: number,
  pageSize: number,
): BlogListParsed {
  return {
    q: q.trim(),
    author: author.trim(),
    from: "",
    to: "",
    sort,
    dir,
    page,
    pageSize,
  };
}

export const BlogListToolbar = memo(function BlogListToolbar({
  initialParsed,
  authorNames,
}: {
  initialParsed: BlogListParsed;
  authorNames: readonly string[];
}) {
  const router = useRouter();
  const [q, setQ] = useState(initialParsed.q);

  useEffect(() => {
    setQ(initialParsed.q);
  }, [initialParsed.q]);

  const pageSize = initialParsed.pageSize || ADMIN_PAGE_SIZE_DEFAULT;

  const pushParsed = useCallback(
    (p: BlogListParsed) => {
      router.push(blogListHref(p));
    },
    [router],
  );

  const applySearch = useCallback(() => {
    pushParsed(
      buildParsed(q, initialParsed.author, initialParsed.sort, initialParsed.dir, 1, pageSize),
    );
  }, [q, initialParsed.author, initialParsed.sort, initialParsed.dir, pageSize, pushParsed]);

  const authorOptions: DbSelectOption[] = useMemo(
    () => [
      { value: "", label: "Tất cả tác giả" },
      ...authorNames.map((name) => ({ value: name, label: name })),
    ],
    [authorNames],
  );

  return (
    <AdminSearchFilterRow
      filtersAlignEnd
      search={
        <DbSearchField
          value={q}
          onChange={setQ}
          onSearch={applySearch}
          placeholder="Tìm bài…"
          searchLabel="Tìm"
          aria-label="Tìm bài: tiêu đề, slug, tác giả"
        />
      }
      filters={
        <DbSelect
          pill
          style={{ minWidth: 168, maxWidth: 240 }}
          value={initialParsed.author}
          options={authorOptions}
          onChange={(e: ChangeEvent<HTMLSelectElement>) => {
            const next = e.target.value;
            pushParsed(
              buildParsed(q, next, initialParsed.sort, initialParsed.dir, 1, pageSize),
            );
          }}
          aria-label="Lọc theo tác giả"
        />
      }
    />
  );
});
