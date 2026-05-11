"use client";

import { Pencil, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { useMemo, useState } from "react";
import { showAdminToast } from "@/lib/admin-toast";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import { NoDataEmpty } from "@/components/ui/NoDataEmpty";
import styles from "./categories.module.scss";

type CategoryRowData = {
  id: string;
  nameVi: string;
  nameEn: string;
  slug: string;
};

export function CategoriesDataTable({
  categories,
  children,
}: {
  categories: CategoryRowData[];
  children: ReactNode;
}) {
  const router = useRouter();
  const askConfirm = useConfirm();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editNameVi, setEditNameVi] = useState("");
  const [editNameEn, setEditNameEn] = useState("");
  const [err, setErr] = useState<string | null>(null);

  const editing = editingId ? categories.find((c) => c.id === editingId) : undefined;
  const categoryNameDirty = useMemo(
    () =>
      !!(
        editing &&
        (editNameVi.trim() !== editing.nameVi.trim() || editNameEn.trim() !== editing.nameEn.trim())
      ),
    [editing, editNameVi, editNameEn],
  );

  function startEdit(c: CategoryRowData) {
    setEditingId(c.id);
    setEditNameVi(c.nameVi);
    setEditNameEn(c.nameEn);
    setErr(null);
  }

  function cancelEdit() {
    setEditingId(null);
  }

  async function saveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingId) return;
    setErr(null);
    const res = await fetch(`/api/admin/categories/${editingId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({
        nameVi: editNameVi.trim(),
        nameEn: editNameEn.trim(),
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const msg = (data as { error?: string }).error ?? "Không lưu được";
      setErr(msg);
      showAdminToast(msg, "error");
      return;
    }
    setEditingId(null);
    showAdminToast("Đã lưu danh mục");
    router.refresh();
  }

  async function remove(id: string) {
    if (!(await askConfirm({ message: "Xóa danh mục? (Không xóa được nếu còn sản phẩm.)", danger: true }))) return;
    const res = await fetch(`/api/admin/categories/${id}`, {
      method: "DELETE",
      credentials: "same-origin",
    });
    if (!res.ok) {
      setErr("Không xóa được");
      showAdminToast("Không xóa được", "error");
      return;
    }
    setErr(null);
    if (editingId === id) setEditingId(null);
    showAdminToast("Đã xóa danh mục");
    router.refresh();
  }

  return (
    <>
      {editingId && editing ? (
        <form className={styles.editCard} onSubmit={(e) => void saveEdit(e)}>
          <h3 className={styles.editTitle}>Sửa danh mục</h3>
          <div className={styles.editFields}>
            <label className={styles.field}>
              <span>Tên (Tiếng Việt)</span>
              <input value={editNameVi} onChange={(e) => setEditNameVi(e.target.value)} required />
            </label>
            <label className={styles.field}>
              <span>Tên (English)</span>
              <input value={editNameEn} onChange={(e) => setEditNameEn(e.target.value)} required />
            </label>
            <label className={styles.field}>
              <span>Slug</span>
              <input value={editing.slug} readOnly className={styles.inputReadonly} />
            </label>
          </div>
          {err ? <p className={styles.err}>{err}</p> : null}
          <div className={styles.editActions}>
            <button type="submit" className={styles.saveBtn} disabled={!categoryNameDirty}>
              Lưu
            </button>
            <button type="button" className={styles.secondaryBtn} onClick={cancelEdit}>
              Huỷ
            </button>
          </div>
        </form>
      ) : null}

      <div className={styles.tableWrap}>
        <table className={styles.table}>
          {children}
          <tbody>
            {categories.length === 0 ? (
              <NoDataEmpty colSpan={3} cellClassName={styles.muted} />
            ) : (
              categories.map((c) => (
                <tr key={c.id}>
                  <td>
                    <div>{c.nameVi}</div>
                    <div className="muted" style={{ fontSize: "0.85rem", marginTop: "0.2rem" }}>
                      {c.nameEn}
                    </div>
                  </td>
                  <td>
                    <code>{c.slug}</code>
                  </td>
                  <td className={styles.tdActions}>
                    <span className={styles.rowActions}>
                      <button
                        type="button"
                        className="adminTableBtn adminTableBtn--iconOnly"
                        title="Sửa danh mục"
                        aria-label="Sửa danh mục"
                        onClick={() => startEdit(c)}
                      >
                        <Pencil className="adminTableBtnIcon" strokeWidth={2.25} aria-hidden />
                      </button>
                      <button
                        type="button"
                        className="adminTableBtn adminTableBtnDanger adminTableBtn--iconOnly"
                        title="Xóa danh mục"
                        aria-label="Xóa danh mục"
                        onClick={() => void remove(c.id)}
                      >
                        <Trash2 className="adminTableBtnIcon" strokeWidth={2.25} aria-hidden />
                      </button>
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
