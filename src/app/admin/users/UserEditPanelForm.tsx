"use client";

import type { FormEvent } from "react";
import type { Role } from "@prisma/client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAdminRightPanelOptional } from "@/components/admin/AdminRightPanel";
import { showAdminToast } from "@/lib/admin-toast";
import { Spinner } from "@/components/ui/Spinner";
import { DbSelect, type DbSelectOption } from "@/dashboard-ui/v1/components/DbSelect";
import styles from "./admin-users.module.scss";

const ROLE_VALUES = ["CUSTOMER", "ADMIN", "SELLER", "CONTENT", "SUPPORT"] as const;

function roleLabel(r: Role): string {
  const m: Record<Role, string> = {
    CUSTOMER: "Khách hàng",
    ADMIN: "Quản trị",
    SELLER: "Nhân viên bán hàng",
    CONTENT: "Nội dung",
    SUPPORT: "Hỗ trợ",
  };
  return m[r] ?? r;
}

const EDIT_ROLE_OPTIONS: DbSelectOption[] = ROLE_VALUES.map((r) => ({
  value: r,
  label: roleLabel(r),
}));

export function UserEditPanelForm({
  panelFormId,
  user,
}: {
  panelFormId?: string;
  user: {
    id: string;
    name: string | null;
    email: string | null;
    phone: string | null;
    role: Role;
  };
}) {
  const router = useRouter();
  const panel = useAdminRightPanelOptional();
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [name, setName] = useState(user.name ?? "");
  const [role, setRole] = useState<Role>(user.role);

  async function saveUser(e: FormEvent) {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    setErr(null);
    try {
      const res = await fetch(`/api/admin/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          name: name.trim() || null,
          role,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg = (data as { error?: string }).error ?? "Không cập nhật được người dùng";
        setErr(msg);
        showAdminToast(msg, "error");
        return;
      }
      showAdminToast("Đã cập nhật người dùng");
      panel?.closePanel();
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  return (
    <form id={panelFormId || undefined} className={styles.addPanelForm} onSubmit={(e) => void saveUser(e)}>
      <p className={styles.addTitle}>Chỉnh sửa người dùng</p>
      <p className={styles.mutedCell}>{user.email ?? user.phone ?? "Tài khoản nội bộ"}</p>
      {err ? <p className={styles.err}>{err}</p> : null}
      <div className={styles.addGrid}>
        <label className={styles.addField}>
          Tên hiển thị
          <input
            type="text"
            name="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nhập tên hiển thị"
            disabled={saving}
          />
        </label>
        <label className={styles.addField}>
          Vai trò <span className={styles.req}>*</span>
          <DbSelect
            className={styles.addRoleSelect}
            options={EDIT_ROLE_OPTIONS}
            value={role}
            disabled={saving}
            onChange={(e) => setRole(e.target.value as Role)}
          />
        </label>
      </div>
      {panelFormId ? null : (
        <div className={styles.addActions}>
          <button type="submit" className="btn btn--primary" disabled={saving}>
            {saving ? <Spinner size="sm" inheritColor label="Đang lưu..." /> : "Lưu thay đổi"}
          </button>
        </div>
      )}
    </form>
  );
}
