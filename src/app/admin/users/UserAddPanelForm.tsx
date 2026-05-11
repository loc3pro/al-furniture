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

const ADD_ROLE_OPTIONS: DbSelectOption[] = ROLE_VALUES.map((r) => ({
  value: r,
  label: roleLabel(r),
}));

export function UserAddPanelForm({ panelFormId }: { panelFormId?: string } = {}) {
  const router = useRouter();
  const panel = useAdminRightPanelOptional();
  const [creating, setCreating] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [newIdentifier, setNewIdentifier] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newName, setNewName] = useState("");
  const [newRole, setNewRole] = useState<Role>("CUSTOMER");

  async function createUser(e: FormEvent) {
    e.preventDefault();
    if (creating) return;
    setCreating(true);
    setErr(null);
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          identifier: newIdentifier.trim(),
          password: newPassword,
          name: newName.trim() || undefined,
          role: newRole,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg = (data as { error?: string }).error ?? "Không tạo được tài khoản";
        setErr(msg);
        showAdminToast(msg, "error");
        return;
      }
      showAdminToast("Đã tạo người dùng");
      setNewIdentifier("");
      setNewPassword("");
      setNewName("");
      setNewRole("CUSTOMER");
      panel?.closePanel();
      router.refresh();
    } finally {
      setCreating(false);
    }
  }

  return (
    <form id={panelFormId || undefined} className={styles.addPanelForm} onSubmit={(e) => void createUser(e)}>
      <p className={styles.addTitle}>Tài khoản đăng nhập mới</p>
      {err ? <p className={styles.err}>{err}</p> : null}
      <div className={styles.addGrid}>
        <label className={styles.addField}>
          Email hoặc SĐT <span className={styles.req}>*</span>
          <input
            type="text"
            name="identifier"
            autoComplete="off"
            required
            value={newIdentifier}
            onChange={(e) => setNewIdentifier(e.target.value)}
            placeholder="vd. admin@shop.com hoặc 0901234567"
            disabled={creating}
          />
        </label>
        <label className={styles.addField}>
          Mật khẩu <span className={styles.req}>*</span>
          <input
            type="password"
            name="password"
            autoComplete="new-password"
            required
            minLength={6}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="Tối thiểu 6 ký tự"
            disabled={creating}
          />
        </label>
        <label className={styles.addField}>
          Tên hiển thị
          <input
            type="text"
            name="name"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Tuỳ chọn"
            disabled={creating}
          />
        </label>
        <label className={styles.addField}>
          Vai trò <span className={styles.req}>*</span>
          <DbSelect
            className={styles.addRoleSelect}
            options={ADD_ROLE_OPTIONS}
            value={newRole}
            disabled={creating}
            onChange={(e) => setNewRole(e.target.value as Role)}
          />
        </label>
      </div>
      {panelFormId ? null : (
        <div className={styles.addActions}>
          <button type="submit" className="btn btn--primary" disabled={creating}>
            {creating ? <Spinner size="sm" inheritColor label="Đang tạo…" /> : "Tạo người dùng"}
          </button>
        </div>
      )}
    </form>
  );
}
