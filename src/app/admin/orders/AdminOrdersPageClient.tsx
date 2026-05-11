"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { OrderStatus } from "@prisma/client";
import { AdminPagination } from "@/components/admin/AdminPagination";
import { AdminPageLayout } from "@/components/admin/AdminPageLayout";
import { AdminStickyPageHeader } from "@/components/admin/AdminStickyPageHeader";
import { AdminToolbarStrip } from "@/components/admin/AdminToolbarStrip";
import { NoDataEmpty } from "@/components/ui/NoDataEmpty";
import { showAdminToast } from "@/lib/admin-toast";
import {
  appendInvoicePrintQuery,
  appendOrderIdsToExportQuery,
  ORDER_PRINT_IDS_MAX,
  type OrderListTab,
  type OrderSortField,
} from "./order-list-filters";
import { AdminOrdersNewLink } from "./AdminOrdersNewLink";
import { AdminOrdersFilterClient } from "./AdminOrdersFilterClient";
import { AdminOrderOpenLink } from "./AdminOrderOpenLink";
import { orderStatusLabel } from "@/lib/order-status-vi";
import { OrderRowActions } from "./OrderRowActions";
import styles from "./admin-orders.module.scss";

export type AdminOrderListRowDto = {
  id: string;
  orderNumber: string;
  createdAtLabel: string;
  status: OrderStatus;
  totalLabel: string;
  productSummary: string;
  customerName: string;
  placedByLabel: string;
  qty: number;
};

type PaginationNav = {
  pathname: string;
  query: Record<string, string>;
  defaultPageSize: number;
};

type Props = {
  tab: OrderListTab;
  q: string;
  sortField: OrderSortField;
  sortDir: "asc" | "desc";
  exportBaseQuery: string;
  sortHrefs: Record<OrderSortField, string>;
  rows: AdminOrderListRowDto[];
  pageNum: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  paginationNav: PaginationNav;
};

function ThSort({
  children,
  href,
  active,
  sortDir,
}: {
  children: ReactNode;
  href: string;
  active: boolean;
  sortDir: "asc" | "desc";
}) {
  return (
    <th className={styles.thSortCell}>
      <Link href={href} className={active ? `${styles.thSort} ${styles.thSortActive}` : styles.thSort}>
        <span>{children}</span>
        <span className={styles.sortGlyphs} aria-hidden>
          <span className={active && sortDir === "asc" ? styles.sortArrowOn : styles.sortArrowDim}>↑</span>
          <span className={active && sortDir === "desc" ? styles.sortArrowOn : styles.sortArrowDim}>↓</span>
        </span>
      </Link>
    </th>
  );
}

export function AdminOrdersPageClient({
  tab,
  q,
  sortField,
  sortDir,
  exportBaseQuery,
  sortHrefs,
  rows,
  pageNum,
  totalPages,
  totalItems,
  pageSize,
  paginationNav,
}: Props) {
  const pageIds = useMemo(() => rows.map((r) => r.id), [rows]);
  const [selected, setSelected] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    setSelected(new Set());
  }, [tab, q, sortField, sortDir, pageNum]);

  const selectedOnPage = useMemo(() => pageIds.filter((id) => selected.has(id)), [pageIds, selected]);

  const allOnPageSelected = pageIds.length > 0 && selectedOnPage.length === pageIds.length;
  const someOnPageSelected = selectedOnPage.length > 0 && !allOnPageSelected;
  const headerCheckboxRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const el = headerCheckboxRef.current;
    if (el) el.indeterminate = someOnPageSelected;
  }, [someOnPageSelected]);

  const selectedIdsList = useMemo(() => Array.from(selected), [selected]);

  const exportOrdersHref = useMemo(
    () =>
      `/api/admin/export/orders${appendOrderIdsToExportQuery(exportBaseQuery, selectedIdsList)}`,
    [exportBaseQuery, selectedIdsList],
  );

  const printHref = useMemo(
    () => `/admin/orders/invoice-print${appendInvoicePrintQuery(selectedIdsList)}`,
    [selectedIdsList],
  );

  const toggleRow = useCallback((id: string, checked: boolean) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }, []);

  const toggleSelectAllPage = useCallback(() => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (allOnPageSelected) {
        for (const id of pageIds) next.delete(id);
      } else {
        for (const id of pageIds) next.add(id);
      }
      return next;
    });
  }, [allOnPageSelected, pageIds]);

  const nSel = selectedIdsList.length;
  const exportOrdersTitle =
    nSel > 0
      ? `Tải CSV (Excel): ${nSel} đơn đã chọn — mỗi đơn một dòng. Tên file: don-hang_chon-${nSel}-don_…`
      : "Tải CSV (Excel): mọi đơn khớp bộ lọc (chưa tick dòng nào). Tên file: don-hang_tat-ca-bo-loc_…";
  const printTitle =
    nSel === 0
      ? "Chọn ít nhất một đơn trong bảng để mở trang in hóa đơn (giống cửa hàng)."
      : nSel > ORDER_PRINT_IDS_MAX
        ? `Chỉ in tối đa ${ORDER_PRINT_IDS_MAX} đơn mỗi lần — danh sách đã được cắt theo giới hạn.`
        : `Mở trang in/PDF: ${nSel} hóa đơn (tab mới).`;

  const filterToolbarKey = `${q}|${tab}|${sortField}|${sortDir}`;

  return (
    <AdminPageLayout
      header={
        <AdminStickyPageHeader joinToolbarBelow>
          <div className="adminPageHeaderRow">
            <div className="adminPageHeaderMain">
              <h1 className={styles.pageTitle}>Đơn hàng</h1>
              <p className={styles.pageLead}>Quản lý trạng thái — tìm kiếm và sắp xếp.</p>
            </div>
            <div className="adminToolbar adminToolbar--end">
              <a
                className="btn btn--ghost adminToolbarBtn"
                href={exportOrdersHref}
                download
                title={exportOrdersTitle}
              >
                Excel
              </a>
              {nSel > 0 ? (
                <a
                  className="btn btn--ghost adminToolbarBtn"
                  title={printTitle}
                  href={printHref}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  In
                </a>
              ) : (
                <button
                  type="button"
                  className="btn btn--ghost adminToolbarBtn"
                  title={printTitle}
                  onClick={() => showAdminToast("Chọn ít nhất một đơn để in hóa đơn", "error")}
                >
                  In
                </button>
              )}
              <AdminOrdersNewLink />
            </div>
          </div>
        </AdminStickyPageHeader>
      }
      toolbar={
        <AdminToolbarStrip joinHeaderAbove>
          <AdminOrdersFilterClient
            key={filterToolbarKey}
            initialQ={q}
            initialTab={tab}
            sortField={sortField}
            sortDir={sortDir}
          />
        </AdminToolbarStrip>
      }
    >
      <div className={styles.surfaceCard}>
        <div className={styles.tableWrap}>
          <table className={`db-table ${styles.ordersTable}`}>
            <colgroup>
              <col className={styles.colSelect} />
              <col className={styles.colProduct} />
              <col className={styles.colOrderId} />
              <col className={styles.colCustomer} />
              <col className={styles.colPlacedBy} />
              <col className={styles.colDate} />
              <col className={styles.colQty} />
              <col className={styles.colTotal} />
              <col className={styles.colStatus} />
              <col className={styles.colActions} />
            </colgroup>
            <thead>
              <tr>
                <th className={`${styles.thHeadPlain} ${styles.thSelect}`} scope="col">
                  <input
                    ref={headerCheckboxRef}
                    type="checkbox"
                    className={styles.selectCheckbox}
                    checked={allOnPageSelected}
                    onChange={toggleSelectAllPage}
                    aria-label="Chọn tất cả đơn trên trang này"
                  />
                </th>
                <th className={`${styles.thHeadPlain} ${styles.thProduct}`}>Sản phẩm</th>
                <th className={`${styles.thHeadPlain} ${styles.thOrderId}`}>Mã đơn</th>
                <th className={`${styles.thHeadPlain} ${styles.thCustomer}`}>Khách hàng</th>
                <th className={`${styles.thHeadPlain} ${styles.thPlacedBy}`}>Tạo bởi (admin)</th>
                <ThSort href={sortHrefs.date} active={sortField === "date"} sortDir={sortDir}>
                  Ngày
                </ThSort>
                <th className={`${styles.thCenter} ${styles.thHeadPlain} ${styles.thQty}`}>SL</th>
                <ThSort href={sortHrefs.total} active={sortField === "total"} sortDir={sortDir}>
                  Tổng
                </ThSort>
                <ThSort href={sortHrefs.status} active={sortField === "status"} sortDir={sortDir}>
                  Trạng thái
                </ThSort>
                <th className={`${styles.thHeadPlain} ${styles.thActions}`}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((o) => (
                <tr key={o.id} className={styles.tr} data-status={o.status}>
                  <td className={styles.tdSelect}>
                    <input
                      type="checkbox"
                      className={styles.selectCheckbox}
                      checked={selected.has(o.id)}
                      onChange={(e) => toggleRow(o.id, e.target.checked)}
                      aria-label={`Chọn đơn ${o.orderNumber}`}
                    />
                  </td>
                  <td className={styles.tdProduct}>
                    <div className={styles.productTitle}>{o.productSummary}</div>
                  </td>
                  <td className={styles.tdOrderId}>
                    <AdminOrderOpenLink orderId={o.id} orderNumber={o.orderNumber} className={styles.orderLink}>
                      {o.orderNumber}
                    </AdminOrderOpenLink>
                  </td>
                  <td className={styles.customer}>
                    <span className={styles.cName}>{o.customerName}</span>
                  </td>
                  <td className={styles.placedBy}>{o.placedByLabel}</td>
                  <td className={styles.time}>{o.createdAtLabel}</td>
                  <td className={styles.tdCenter}>{o.qty}</td>
                  <td className={styles.total}>{o.totalLabel}</td>
                  <td className={styles.tdStatus}>
                    <div className={styles.statusPill} data-status={o.status}>
                      <span className={styles.statusLabel}>{orderStatusLabel(o.status)}</span>
                    </div>
                  </td>
                  <td className={styles.tdActions}>
                    <OrderRowActions orderId={o.id} orderNumber={o.orderNumber} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {rows.length === 0 ? (
          <NoDataEmpty className={styles.empty} description="Thử bộ lọc khác hoặc kiểm tra kết nối CSDL." />
        ) : null}
        {totalItems > 0 ? (
          <AdminPagination
            queryNav={paginationNav}
            page={pageNum}
            totalPages={totalPages}
            totalItems={totalItems}
            pageSize={pageSize}
            itemLabel="đơn"
          />
        ) : null}
      </div>
    </AdminPageLayout>
  );
}
