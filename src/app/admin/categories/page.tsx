import Link from "next/link";
import type { ReactNode } from "react";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { AdminPagination } from "@/components/admin/AdminPagination";
import { ADMIN_PAGE_SIZE_DEFAULT } from "@/lib/admin-pagination";
import { CategoriesCreateSplit } from "./CategoriesCreateSplit";
import { CategoriesDataTable } from "./CategoriesDataTable";
import { CategoriesFilterClient } from "./CategoriesFilterClient";
import { AdminPageLayout } from "@/components/admin/AdminPageLayout";
import { AdminStickyPageHeader } from "@/components/admin/AdminStickyPageHeader";
import { AdminToolbarStrip } from "@/components/admin/AdminToolbarStrip";
import styles from "./categories.module.scss";

const PAGE_SIZE = ADMIN_PAGE_SIZE_DEFAULT;

type SortCol = "name" | "slug";

function parseCategorySort(sort?: string, dir?: string): { col: SortCol; dir: "asc" | "desc" } {
  const col: SortCol = sort === "slug" ? "slug" : "name";
  const d = dir === "desc" ? "desc" : "asc";
  return { col, dir: d };
}

function categoriesQuery(q: string, col: SortCol, dir: "asc" | "desc", page?: number): string {
  const p = new URLSearchParams();
  if (q.trim()) p.set("q", q.trim());
  const isDefault = col === "name" && dir === "asc";
  if (!isDefault) {
    p.set("sort", col);
    p.set("dir", dir);
  }
  if (page != null && page > 1) p.set("page", String(page));
  const s = p.toString();
  return s ? `?${s}` : "";
}

function categoryOrderBy(col: SortCol, dir: "asc" | "desc"): Prisma.CategoryOrderByWithRelationInput {
  if (col === "slug") return { slug: dir };
  return { nameVi: dir };
}

type PageProps = { searchParams: Promise<{ q?: string; sort?: string; dir?: string; page?: string }> };

export default async function AdminCategoriesPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const q = (sp.q ?? "").trim();
  const pageNum = Math.max(1, parseInt(sp.page ?? "1", 10) || 1);
  const skip = (pageNum - 1) * PAGE_SIZE;
  const { col: sortCol, dir: sortDir } = parseCategorySort(sp.sort, sp.dir);

  const where: Prisma.CategoryWhereInput =
    q.length > 0
      ? {
          OR: [
            { nameVi: { contains: q, mode: "insensitive" } },
            { nameEn: { contains: q, mode: "insensitive" } },
            { slug: { contains: q, mode: "insensitive" } },
          ],
        }
      : {};

  let categories: {
    id: string;
    nameVi: string;
    nameEn: string;
    slug: string;
  }[] = [];
  let total = 0;
  try {
    ;[categories, total] = await Promise.all([
      prisma.category.findMany({
        where,
        orderBy: categoryOrderBy(sortCol, sortDir),
        skip,
        take: PAGE_SIZE,
        select: {
          id: true,
          nameVi: true,
          nameEn: true,
          slug: true,
        },
      }),
      prisma.category.count({ where }),
    ]);
  } catch {
    categories = [];
    total = 0;
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const categoriesToolbarKey = `${q}|${sortCol}|${sortDir}`;

  const categoriesPaginationQuery: Record<string, string | undefined> = {};
  if (q.trim()) categoriesPaginationQuery.q = q.trim();
  const defaultCategorySort = sortCol === "name" && sortDir === "asc";
  if (!defaultCategorySort) {
    categoriesPaginationQuery.sort = sortCol;
    categoriesPaginationQuery.dir = sortDir;
  }

  function hrefForSortColumn(col: SortCol): string {
    const dir =
      sortCol === col
        ? sortDir === "asc"
          ? "desc"
          : "asc"
        : "asc";
    return `/admin/categories${categoriesQuery(q, col, dir)}`;
  }

  function ThSort({ col, children }: { col: SortCol; children: ReactNode }) {
    const active = sortCol === col;
    return (
      <th className={styles.thSortCell}>
        <Link
          href={hrefForSortColumn(col)}
          className={active ? `${styles.thSort} ${styles.thSortActive}` : styles.thSort}
        >
          <span>{children}</span>
          <span className={styles.sortGlyphs} aria-hidden>
            <span className={active && sortDir === "asc" ? styles.sortArrowOn : styles.sortArrowDim}>↑</span>
            <span className={active && sortDir === "desc" ? styles.sortArrowOn : styles.sortArrowDim}>↓</span>
          </span>
        </Link>
      </th>
    );
  }

  return (
    <AdminPageLayout
      scrollClassName={styles.pageScroll}
      header={
        <AdminStickyPageHeader joinToolbarBelow>
          <div className="adminPageHeaderRow">
            <div className="adminPageHeaderMain">
              <h1 className={styles.pageHead}>Danh mục</h1>
            </div>
            <div className="adminToolbar adminToolbar--end">
              <CategoriesCreateSplit />
            </div>
          </div>
        </AdminStickyPageHeader>
      }
      toolbar={
        <AdminToolbarStrip joinHeaderAbove>
          <CategoriesFilterClient key={categoriesToolbarKey} initialQ={q} sortCol={sortCol} sortDir={sortDir} />
        </AdminToolbarStrip>
      }
    >
      <div className={styles.wrap}>
        <div className={styles.listShell}>
          <CategoriesDataTable categories={categories}>
            <thead>
              <tr>
                <ThSort col="name">Tên</ThSort>
                <ThSort col="slug">Slug</ThSort>
                <th className={styles.thActions}>Thao tác</th>
              </tr>
            </thead>
          </CategoriesDataTable>
          <AdminPagination
            queryNav={{
              pathname: "/admin/categories",
              query: categoriesPaginationQuery,
              defaultPageSize: PAGE_SIZE,
            }}
            page={pageNum}
            totalPages={totalPages}
            totalItems={total}
            pageSize={PAGE_SIZE}
            itemLabel="danh mục"
          />
        </div>
      </div>
    </AdminPageLayout>
  );
}
