"use client";

import { Loader2, Pencil, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { showAdminToast } from "@/lib/admin-toast";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import { AdminListPill } from "@/components/admin/AdminListPill";
import styles from "./admin-shop-the-look.module.scss";

export type ShopTheLookListRow = {
  id: string;
  slug: string;
  title: string;
  published: boolean;
  updatedAtLabel: string;
  hotspotCount: number;
};

export function AdminShopTheLookTable({ rows: initialRows }: { rows: ShopTheLookListRow[] }) {
  const router = useRouter();
  const askConfirm = useConfirm();
  const [rows, setRows] = useState(initialRows);
  const [pending, setPending] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    setRows(initialRows);
  }, [initialRows]);

  async function move(id: string, dir: -1 | 1) {
    const idx = rows.findIndex((r) => r.id === id);
    const j = idx + dir;
    if (idx < 0 || j < 0 || j >= rows.length) return;

    const prevSnapshot = rows;
    const next = [...rows];
    [next[idx], next[j]] = [next[j], next[idx]];
    setRows(next);
    setPending(true);
    try {
      const res = await fetch("/api/admin/shop-the-look/reorder", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderedIds: next.map((r) => r.id) }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        showAdminToast((data as { error?: string }).error ?? "Không đổi được thứ tự", "error");
        setRows(prevSnapshot);
        return;
      }
      router.refresh();
    } catch {
      showAdminToast("Lỗi mạng", "error");
      setRows(prevSnapshot);
    } finally {
      setPending(false);
    }
  }

  async function remove(row: ShopTheLookListRow) {
    if (
      !(await askConfirm({
        message: `Xóa bài «${row.title}» (${row.slug})? Hotspot và ảnh hero không hoàn tác.`,
        danger: true,
      }))
    ) {
      return;
    }
    setDeletingId(row.id);
    try {
      const res = await fetch(`/api/admin/shop-the-look/${row.id}`, {
        method: "DELETE",
        credentials: "same-origin",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        showAdminToast((data as { error?: string }).error ?? "Không xóa được", "error");
        return;
      }
      setRows((prev) => prev.filter((r) => r.id !== row.id));
      showAdminToast("Đã xóa Shop the Look");
      router.refresh();
    } catch {
      showAdminToast("Lỗi mạng", "error");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className={styles.tableWrap}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th className={styles.thOrder} aria-label="Thứ tự" />
            <th>Tiêu đề</th>
            <th>Slug</th>
            <th>Hotspot</th>
            <th>Hiển thị</th>
            <th>Cập nhật</th>
            <th className={styles.thActions}>Thao tác</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.id}>
              <td className={styles.orderCell}>
                <div className={styles.orderBtns}>
                  <button
                    type="button"
                    className={styles.orderBtn}
                    disabled={pending || i === 0}
                    aria-label="Lên"
                    onClick={() => void move(r.id, -1)}
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    className={styles.orderBtn}
                    disabled={pending || i === rows.length - 1}
                    aria-label="Xuống"
                    onClick={() => void move(r.id, 1)}
                  >
                    ↓
                  </button>
                </div>
              </td>
              <td>{r.title}</td>
              <td>
                <code className={styles.code}>{r.slug}</code>
              </td>
              <td>{r.hotspotCount}</td>
              <td>
                {r.published ? (
                  <AdminListPill tone="green">Hiển thị</AdminListPill>
                ) : (
                  <AdminListPill tone="rose">Không hiển thị</AdminListPill>
                )}
              </td>
              <td>{r.updatedAtLabel}</td>
              <td className={styles.tdActions}>
                <div className={styles.rowActions}>
                  <Link
                    href={`/admin/shop-the-look/${r.id}/edit`}
                    className="adminTableBtn adminTableBtn--iconOnly"
                    title="Sửa Shop the Look"
                    aria-label="Sửa Shop the Look"
                  >
                    <Pencil className="adminTableBtnIcon" strokeWidth={2.25} aria-hidden />
                  </Link>
                  <button
                    type="button"
                    className="adminTableBtn adminTableBtnDanger adminTableBtn--iconOnly"
                    title="Xóa Shop the Look"
                    aria-label={deletingId === r.id ? "Đang xóa Shop the Look" : "Xóa Shop the Look"}
                    disabled={pending || deletingId === r.id}
                    onClick={() => void remove(r)}
                  >
                    {deletingId === r.id ? (
                      <Loader2 className="adminTableBtnIcon adminTableBtnIcon--spin" strokeWidth={2.25} aria-hidden />
                    ) : (
                      <Trash2 className="adminTableBtnIcon" strokeWidth={2.25} aria-hidden />
                    )}
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
