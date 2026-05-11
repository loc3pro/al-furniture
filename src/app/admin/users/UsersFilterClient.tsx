"use client";

import { memo, useCallback, useEffect, useState, type ChangeEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AdminSearchFilterRow } from "@/dashboard-ui/v1/components/AdminSearchFilterRow";
import { DbSearchField } from "@/dashboard-ui/v1/components/DbSearchField";
import { DbSelect, type DbSelectOption } from "@/dashboard-ui/v1/components/DbSelect";

const ROLE_OPTIONS: DbSelectOption[] = [
  { value: "", label: "Tất cả vai trò" },
  { value: "CUSTOMER", label: "Khách hàng" },
  { value: "ADMIN", label: "Quản trị" },
  { value: "SELLER", label: "Nhân viên bán hàng" },
  { value: "CONTENT", label: "Nội dung" },
  { value: "SUPPORT", label: "Hỗ trợ" },
];

function usersHref(q: string, role: string, page: number): string {
  const p = new URLSearchParams();
  if (q.trim()) p.set("q", q.trim());
  if (role) p.set("role", role);
  if (page > 1) p.set("page", String(page));
  const s = p.toString();
  return s ? `/admin/users?${s}` : "/admin/users";
}

export const UsersFilterClient = memo(function UsersFilterClient({
  initialQ,
  initialRole,
}: {
  initialQ: string;
  initialRole: string;
}) {
  const router = useRouter();
  const [q, setQ] = useState(initialQ);
  const [role, setRole] = useState(initialRole);

  useEffect(() => {
    setQ(initialQ);
    setRole(initialRole);
  }, [initialQ, initialRole]);

  const apply = useCallback(() => {
    router.push(usersHref(q, role, 1));
  }, [router, q, role]);

  const hasFilter = Boolean(initialQ.trim() || initialRole);

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
          aria-label="Tìm người dùng: email, SĐT, tên"
        />
      }
      filters={
        <DbSelect
          pill
          style={{ minWidth: 168, maxWidth: 360 }}
          value={role}
          options={ROLE_OPTIONS}
          onChange={(e: ChangeEvent<HTMLSelectElement>) => {
            const next = e.target.value;
            setRole(next);
            router.push(usersHref(q, next, 1));
          }}
          aria-label="Lọc theo vai trò"
        />
      }
      actions={
        hasFilter ? (
          <Link href="/admin/users" className="btn btn--ghost" title="Xóa bộ lọc tìm kiếm">
            Xóa
          </Link>
        ) : null
      }
    />
  );
});
