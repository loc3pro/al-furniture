"use client";

import { memo, useCallback, useEffect, useMemo, useState, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { AdminSearchFilterRow } from "@/dashboard-ui/v1/components/AdminSearchFilterRow";
import { DbSearchField } from "@/dashboard-ui/v1/components/DbSearchField";
import { DbSelect, type DbSelectOption } from "@/dashboard-ui/v1/components/DbSelect";
import { ordersListQuery, type OrderListTab, type OrderSortField } from "./order-list-filters";

export const AdminOrdersFilterClient = memo(function AdminOrdersFilterClient({
  initialQ,
  initialTab,
  sortField,
  sortDir,
}: {
  initialQ: string;
  initialTab: OrderListTab;
  sortField: OrderSortField;
  sortDir: "asc" | "desc";
}) {
  const router = useRouter();
  const [q, setQ] = useState(initialQ);
  const [tab, setTab] = useState<OrderListTab>(initialTab);

  useEffect(() => {
    setQ(initialQ);
    setTab(initialTab);
  }, [initialQ, initialTab]);

  const pushList = useCallback(
    (nextTab: OrderListTab, nextQ: string) => {
      router.push(`/admin/orders${ordersListQuery(nextTab, nextQ, 1, sortField, sortDir)}`);
    },
    [router, sortField, sortDir],
  );

  const applySearch = useCallback(() => {
    pushList(tab, q);
  }, [pushList, tab, q]);

  const tabOptions: DbSelectOption[] = useMemo(
    () => [
      { value: "all", label: "Tất cả" },
      { value: "active", label: "Đang xử lý" },
      { value: "completed", label: "Hoàn tất" },
      { value: "cancelled", label: "Đã hủy" },
    ],
    [],
  );

  return (
    <AdminSearchFilterRow
      filtersAlignEnd
      search={
        <DbSearchField
          placeholder="Mã đơn, SĐT, email…"
          value={q}
          onChange={setQ}
          onSearch={applySearch}
          searchLabel="Tìm"
          autoComplete="off"
          aria-label="Tìm đơn hàng: mã đơn, SĐT, email"
        />
      }
      filters={
        <DbSelect
          pill
          style={{ minWidth: 200, maxWidth: 360 }}
          value={tab}
          options={tabOptions}
          onChange={(e: ChangeEvent<HTMLSelectElement>) => {
            const next = e.target.value as OrderListTab;
            setTab(next);
            pushList(next, q);
          }}
          aria-label="Lọc theo trạng thái đơn"
        />
      }
    />
  );
});
