"use client";

import { Pencil, Trash2 } from "lucide-react";
import type { Role } from "@prisma/client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { DbSelect, type DbSelectOption } from "@/dashboard-ui/v1/components/DbSelect";
import { AdminPagination } from "@/components/admin/AdminPagination";
import { AdminPageLayout } from "@/components/admin/AdminPageLayout";
import { AdminStickyPageHeader } from "@/components/admin/AdminStickyPageHeader";
import { AdminToolbarStrip } from "@/components/admin/AdminToolbarStrip";
import { useAdminRightPanel } from "@/components/admin/AdminRightPanel";
import { AdminRightPanelFooterCrud } from "@/components/admin/AdminRightPanelFooter";
import { showAdminToast } from "@/lib/admin-toast";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import { ADMIN_PAGE_SIZE_DEFAULT } from "@/lib/admin-pagination";
import { UserAddPanelForm } from "./UserAddPanelForm";
import { UserEditPanelForm } from "./UserEditPanelForm";
import { UsersFilterClient } from "./UsersFilterClient";
import styles from "./admin-users.module.scss";

const PAGE_SIZE = ADMIN_PAGE_SIZE_DEFAULT;

const ADMIN_FORM_USER_ADD = "admin-form-user-add";
const ADMIN_FORM_USER_EDIT = "admin-form-user-edit";

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

const ROW_ROLE_OPTIONS: DbSelectOption[] = ROLE_VALUES.map((r) => ({
  value: r,
  label: roleLabel(r),
}));

export type AdminUserRow = {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  role: Role;
  createdAtIso: string;
  ordersCount: number;
};

function usersHref(q: string, role: string, page: number): string {
  const p = new URLSearchParams();
  if (q.trim()) p.set("q", q.trim());
  if (role) p.set("role", role);
  if (page > 1) p.set("page", String(page));
  const s = p.toString();
  return s ? `/admin/users?${s}` : "/admin/users";
}

export function UsersManagement({
  users,
  total,
  page,
  q,
  roleFilter,
  currentUserId,
}: {
  users: AdminUserRow[];
  total: number;
  page: number;
  q: string;
  roleFilter: string;
  currentUserId: string | null;
}) {
  const router = useRouter();
  const askConfirm = useConfirm();
  const { openPanel, closePanel } = useAdminRightPanel();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  async function updateRole(userId: string, role: Role) {
    setBusyId(userId);
    setErr(null);
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ role }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg = (data as { error?: string }).error ?? "Không cập nhật được";
        setErr(msg);
        showAdminToast(msg, "error");
        router.refresh();
        return;
      }
      showAdminToast("Đã cập nhật vai trò");
      router.refresh();
    } finally {
      setBusyId(null);
    }
  }

  async function removeUser(userId: string) {
    if (!(await askConfirm({ message: "Xóa người dùng này? Thao tác không hoàn tác.", danger: true }))) return;
    setBusyId(userId);
    setErr(null);
    try {
      const res = await fetch(`/api/admin/users/${userId}`, { method: "DELETE", credentials: "same-origin" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg = (data as { error?: string }).error ?? "Không xóa được";
        setErr(msg);
        showAdminToast(msg, "error");
        return;
      }
      showAdminToast("Đã xóa người dùng");
      router.refresh();
    } finally {
      setBusyId(null);
    }
  }

  function openEditUser(user: AdminUserRow) {
    openPanel({
      title: "Sửa người dùng",
      content: (
        <UserEditPanelForm
          panelFormId={ADMIN_FORM_USER_EDIT}
          user={{
            id: user.id,
            name: user.name,
            email: user.email,
            phone: user.phone,
            role: user.role,
          }}
        />
      ),
      footer: (
        <AdminRightPanelFooterCrud
          update={
            <button type="submit" form={ADMIN_FORM_USER_EDIT} className="btn btn--primary">
              Lưu thay đổi
            </button>
          }
          delete={
            <button type="button" className="btn btn--ghost adminCancelGhost" onClick={() => closePanel()}>
              Hủy
            </button>
          }
        />
      ),
    });
  }

  return (
    <AdminPageLayout
      scrollClassName={styles.pageScroll}
      header={
        <AdminStickyPageHeader>
          <div className="adminPageHeaderRow">
            <div className="adminPageHeaderMain">
              <header className={styles.head}>
                <div>
                  <h1 className={styles.title}>Người dùng & vai trò</h1>
                </div>
              </header>
            </div>
            <div className="adminToolbar adminToolbar--end">
              <button
                type="button"
                className={`btn btn--primary adminToolbarBtn ${styles.addToggle}`}
                title="Thêm người dùng (email hoặc SĐT + mật khẩu)"
                onClick={() =>
                  openPanel({
                    title: "Thêm người dùng",
                    content: <UserAddPanelForm panelFormId={ADMIN_FORM_USER_ADD} />,
                    footer: (
                      <AdminRightPanelFooterCrud
                        create={
                          <button type="submit" form={ADMIN_FORM_USER_ADD} className="btn btn--primary">
                            Tạo người dùng
                          </button>
                        }
                        delete={
                          <button type="button" className="btn btn--ghost adminCancelGhost" onClick={() => closePanel()}>
                            Hủy
                          </button>
                        }
                      />
                    ),
                  })
                }
              >
                + Thêm
              </button>
            </div>
          </div>
        </AdminStickyPageHeader>
      }
    >
      <div className={styles.pageStack}>
        <AdminToolbarStrip joinHeaderAbove>
          <UsersFilterClient initialQ={q} initialRole={roleFilter} />
        </AdminToolbarStrip>

        {err ? <p className={styles.err}>{err}</p> : null}

        <div className={styles.shellCard}>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Người dùng</th>
                  <th>Email</th>
                  <th>SĐT</th>
                  <th>Vai trò</th>
                  <th>Đơn</th>
                  <th>Ngày tạo</th>
                  <th className={styles.thActions}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {users.length === 0 ? (
                  <tr>
                    <td colSpan={7} className={styles.mutedCell}>
                      Không có người dùng phù hợp.
                    </td>
                  </tr>
                ) : (
                  users.map((u) => {
                    const isSelf = currentUserId === u.id;
                    return (
                      <tr key={u.id}>
                        <td>
                          <strong>{u.name?.trim() || "—"}</strong>
                          {isSelf ? <span className={styles.badgeYou}>Bạn</span> : null}
                        </td>
                        <td>{u.email ?? "—"}</td>
                        <td>{u.phone ?? "—"}</td>
                        <td>
                          <DbSelect
                            className={styles.roleSelect}
                            options={ROW_ROLE_OPTIONS}
                            value={u.role}
                            disabled={busyId === u.id}
                            aria-label={`Vai trò ${u.email ?? u.phone ?? u.id}`}
                            onChange={(e) => void updateRole(u.id, e.target.value as Role)}
                          />
                        </td>
                        <td>{u.ordersCount}</td>
                        <td className={styles.mutedCell}>
                          {new Date(u.createdAtIso).toLocaleString("vi-VN", {
                            dateStyle: "short",
                            timeStyle: "short",
                          })}
                        </td>
                        <td className={styles.tdActions}>
                          <div className={styles.actionRow}>
                            <button
                              type="button"
                              className="adminTableBtn adminTableBtnGhost adminTableBtn--iconOnly"
                              disabled={busyId === u.id}
                              title="Sửa người dùng"
                              aria-label="Sửa người dùng"
                              onClick={() => openEditUser(u)}
                            >
                              <Pencil className="adminTableBtnIcon" strokeWidth={2.25} aria-hidden />
                            </button>
                            <button
                              type="button"
                              className="adminTableBtn adminTableBtnDanger adminTableBtn--iconOnly"
                              disabled={busyId === u.id || isSelf}
                              title={isSelf ? "Không xóa chính mình" : "Xóa người dùng"}
                              aria-label={isSelf ? "Không xóa chính mình" : "Xóa người dùng"}
                              onClick={() => void removeUser(u.id)}
                            >
                              <Trash2 className="adminTableBtnIcon" strokeWidth={2.25} aria-hidden />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
          <AdminPagination
            page={page}
            totalPages={totalPages}
            totalItems={total}
            pageSize={PAGE_SIZE}
            itemLabel="người dùng"
            hrefForPage={(p) => usersHref(q, roleFilter, p)}
          />
        </div>
      </div>
    </AdminPageLayout>
  );
}
