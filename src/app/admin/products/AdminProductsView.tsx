"use client";

import Link from "next/link";
import { useMemo } from "react";
import type { AdminProductSortKey } from "@/lib/admin-products-query";
import { AdminPagination } from "@/components/admin/AdminPagination";
import { AdminPageLayout } from "@/components/admin/AdminPageLayout";
import { AdminStickyPageHeader } from "@/components/admin/AdminStickyPageHeader";
import { AdminToolbarStrip } from "@/components/admin/AdminToolbarStrip";
import { AdminProductsFilterClient } from "./AdminProductsFilterClient";
import { AdminProductEditOpenLink } from "./AdminProductEditOpenLink";
import { AdminProductRowActions } from "./AdminProductRowActions";
import { ProductsCreateSplit } from "./ProductsCreateSplit";
import type { AdminListQueryNav } from "@/lib/admin-list-url";
import { AdminListPill } from "@/components/admin/AdminListPill";
import cls from "./admin-products-view.module.scss";

export type AdminProductRowVm = {
  id: string;
  nameVi: string;
  code: string;
  skuSummary: string;
  skuTitle: string;
  categoryNameVi: string;
  creatorLabel: string;
  priceMain: string;
  /** Giá niêm yết (gốc) — "—" khi không giảm */
  priceOrig: string;
  /** Phần trăm giảm — "—" khi 0 */
  discountPct: string;
  variantsCount: number;
  stockTotal: number;
};

function productsQuery(
  q: string,
  key: AdminProductSortKey,
  dir: "asc" | "desc",
  categoryId: string,
  page?: number,
): string {
  const p = new URLSearchParams();
  if (q.trim()) p.set("q", q.trim());
  if (categoryId) p.set("categoryId", categoryId);
  const defaultSort = key === "updated" && dir === "desc";
  if (!defaultSort) {
    p.set("sort", key);
    p.set("dir", dir);
  }
  if (page != null && page > 1) p.set("page", String(page));
  const s = p.toString();
  return s ? `?${s}` : "";
}

function sortHref(
  q: string,
  col: AdminProductSortKey,
  sortKey: AdminProductSortKey,
  sortDir: "asc" | "desc",
  categoryId: string,
): string {
  const dir =
    sortKey === col
      ? sortDir === "asc"
        ? "desc"
        : "asc"
      : col === "price" || col === "stock"
        ? "desc"
        : "asc";
  return `/admin/products${productsQuery(q, col, dir, categoryId)}`;
}

type Cat = { id: string; nameVi: string; nameEn: string };

export function AdminProductsView({
  q,
  categoryFilter,
  sortKey,
  sortDir,
  categories,
  rows,
  pageNum,
  total,
  pageSize,
  productsPaginationQuery,
  exportQuery,
}: {
  q: string;
  categoryFilter: string;
  sortKey: AdminProductSortKey;
  sortDir: "asc" | "desc";
  categories: Cat[];
  rows: AdminProductRowVm[];
  pageNum: number;
  total: number;
  pageSize: number;
  productsPaginationQuery: Record<string, string | undefined>;
  exportQuery: string;
}) {
  const queryNav: AdminListQueryNav = useMemo(
    () => ({
      pathname: "/admin/products",
      query: productsPaginationQuery,
      defaultPageSize: pageSize,
    }),
    [productsPaginationQuery, pageSize],
  );

  const filterToolbarKey = `${q}|${categoryFilter}|${sortKey}|${sortDir}`;

  return (
    <AdminPageLayout
      scrollClassName={cls.pageScroll}
      header={
        <AdminStickyPageHeader joinToolbarBelow>
          <div className="adminPageHeaderRow">
            <div className="adminPageHeaderMain">
              <h1 className={cls.pageTitle}>Danh sách sản phẩm</h1>
            </div>
            <div className="adminToolbar adminToolbar--end">
              <a
                className="btn btn--ghost adminToolbarBtn"
                href={`/api/admin/export/products${exportQuery}`}
                download
                title="Xuất danh sách sản phẩm (CSV)"
              >
                CSV
              </a>
              <ProductsCreateSplit categories={categories} />
            </div>
          </div>
        </AdminStickyPageHeader>
      }
      toolbar={
        <AdminToolbarStrip joinHeaderAbove>
          <AdminProductsFilterClient
            key={filterToolbarKey}
            initialQ={q}
            initialCategoryId={categoryFilter}
            categories={categories}
            sortKey={sortKey}
            sortDir={sortDir}
          />
        </AdminToolbarStrip>
      }
    >
      <div className={cls.surfaceCard}>
        <div className={cls.tableWrap}>
          <table className={`db-table ${cls.productsTable}`}>
            <colgroup>
              <col className={cls.colName} />
              <col className={cls.colCode} />
              <col className={cls.colSku} />
              <col className={cls.colCategory} />
              <col className={cls.colCreator} />
              <col className={cls.colPrice} />
              <col className={cls.colPriceOrig} />
              <col className={cls.colDiscountPct} />
              <col className={cls.colVariants} />
              <col className={cls.colStock} />
              <col className={cls.colStatus} />
              <col className={cls.colActions} />
            </colgroup>
            <thead>
              <tr>
                <th>
                  <Link className={cls.sortLink} href={sortHref(q, "name", sortKey, sortDir, categoryFilter)}>
                    Tên sản phẩm
                  </Link>
                </th>
                <th>Mã SP</th>
                <th>SKU</th>
                <th>
                  <Link className={cls.sortLink} href={sortHref(q, "category", sortKey, sortDir, categoryFilter)}>
                    Danh mục
                  </Link>
                </th>
                <th>Người tạo</th>
                <th>
                  <Link className={cls.sortLink} href={sortHref(q, "price", sortKey, sortDir, categoryFilter)}>
                    Giá bán
                  </Link>
                </th>
                <th>Giá gốc</th>
                <th>Giảm %</th>
                <th>
                  <Link className={cls.sortLink} href={sortHref(q, "stock", sortKey, sortDir, categoryFilter)}>
                    Biến thể
                  </Link>
                </th>
                <th>Tồn kho</th>
                <th>Hiển thị</th>
                <th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={12} className={cls.emptyCell}>
                    Không có sản phẩm — thử bộ lọc khác.
                  </td>
                </tr>
              ) : (
                rows.map((r) => (
                  <tr key={r.id}>
                    <td>
                      <AdminProductEditOpenLink productId={r.id} className={cls.nameOpen} title={r.nameVi}>
                        {r.nameVi}
                      </AdminProductEditOpenLink>
                    </td>
                    <td>
                      <code className={cls.codeMono}>{r.code}</code>
                    </td>
                    <td title={r.skuTitle || undefined}>
                      <span className={cls.ellipsis}>{r.skuSummary}</span>
                    </td>
                    <td>
                      <span className={cls.ellipsis}>{r.categoryNameVi}</span>
                    </td>
                    <td>
                      <span className={cls.ellipsis}>{r.creatorLabel}</span>
                    </td>
                    <td>
                      <span className={cls.priceLine}>
                        <span className={cls.priceMain}>{r.priceMain}</span>
                      </span>
                    </td>
                    <td>
                      <span className={cls.priceOrigCell}>{r.priceOrig}</span>
                    </td>
                    <td>
                      <span className={cls.discountPctCell}>{r.discountPct}</span>
                    </td>
                    <td>{r.variantsCount}</td>
                    <td>{r.stockTotal}</td>
                    <td>
                      <AdminListPill tone="green">Hiển thị</AdminListPill>
                    </td>
                    <td>
                      <AdminProductRowActions productId={r.id} nameVi={r.nameVi} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <AdminPagination
          queryNav={queryNav}
          page={pageNum}
          totalPages={Math.max(1, Math.ceil(total / pageSize))}
          totalItems={total}
          pageSize={pageSize}
          itemLabel="sản phẩm"
        />
      </div>
    </AdminPageLayout>
  );
}
