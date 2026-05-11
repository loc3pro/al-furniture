"use client";

import { Pencil, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { AdminModuleFrame } from "@/design-system/components/AdminModuleFrame";
import { showAdminToast } from "@/lib/admin-toast";
import { DbButton } from "@/dashboard-ui/v1/components/DbButton";
import { DbField } from "@/dashboard-ui/v1/components/DbField";
import { DbInput } from "@/dashboard-ui/v1/components/DbInput";
import { DbModal } from "@/dashboard-ui/v1/components/DbModal";
import { DbTag } from "@/dashboard-ui/v1/components/DbTag";
import { DbTextarea } from "@/dashboard-ui/v1/components/DbTextarea";
import cls from "./AdminManagedKeysClient.module.scss";

export type ManagedKeyRow = {
  id: string;
  label: string;
  envKey: string;
  valueMasked: string;
  description: string | null;
  enabled: boolean;
  sortOrder: number;
  updatedAt: string;
};

const PAGE_SIZE = 12;

export function AdminManagedKeysClient() {
  const [items, setItems] = useState<ManagedKeyRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [label, setLabel] = useState("");
  const [envKey, setEnvKey] = useState("");
  const [value, setValue] = useState("");
  const [description, setDescription] = useState("");
  const [enabled, setEnabled] = useState(true);
  const [sortOrder, setSortOrder] = useState("0");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/managed-keys", { cache: "no-store" });
      const j = (await res.json().catch(() => null)) as { items?: ManagedKeyRow[]; error?: string } | null;
      if (!res.ok) {
        showAdminToast(j?.error ?? "Không tải được", "error");
        setItems([]);
        return;
      }
      setItems(j?.items ?? []);
    } catch {
      showAdminToast("Lỗi mạng", "error");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const totalPages = Math.max(1, Math.ceil(items.length / PAGE_SIZE));
  const pageSafe = Math.min(page, totalPages);
  const slice = items.slice((pageSafe - 1) * PAGE_SIZE, pageSafe * PAGE_SIZE);

  const openCreate = () => {
    setEditId(null);
    setLabel("");
    setEnvKey("");
    setValue("");
    setDescription("");
    setEnabled(true);
    setSortOrder("0");
    setModalOpen(true);
  };

  const openEdit = (row: ManagedKeyRow) => {
    setEditId(row.id);
    setLabel(row.label);
    setEnvKey(row.envKey);
    setValue("");
    setDescription(row.description ?? "");
    setEnabled(row.enabled);
    setSortOrder(String(row.sortOrder));
    setModalOpen(true);
  };

  const submit = async () => {
    if (!label.trim()) {
      showAdminToast("Nhập nhãn hiển thị", "error");
      return;
    }
    if (!envKey.trim()) {
      showAdminToast("Nhập tên biến ENV", "error");
      return;
    }
    if (!editId && !value.trim()) {
      showAdminToast("Nhập giá trị", "error");
      return;
    }

    const sortN = Number(sortOrder);
    const sortOrderNum = Number.isFinite(sortN) ? sortN : 0;

    setSaving(true);
    try {
      if (!editId) {
        const res = await fetch("/api/admin/managed-keys", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            label: label.trim(),
            envKey: envKey.trim(),
            value: value.trim(),
            description: description.trim() ? description.trim() : null,
            enabled,
            sortOrder: sortOrderNum,
          }),
        });
        if (!res.ok) {
          const j = (await res.json().catch(() => null)) as { error?: string } | null;
          showAdminToast(j?.error ?? "Không tạo được", "error");
          return;
        }
        showAdminToast("Đã thêm");
      } else {
        const body: Record<string, unknown> = {
          label: label.trim(),
          envKey: envKey.trim(),
          description: description.trim() ? description.trim() : null,
          enabled,
          sortOrder: sortOrderNum,
        };
        if (value.trim() !== "") {
          body.value = value.trim();
        }
        const res = await fetch(`/api/admin/managed-keys/${editId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!res.ok) {
          const j = (await res.json().catch(() => null)) as { error?: string } | null;
          showAdminToast(j?.error ?? "Không lưu được", "error");
          return;
        }
        showAdminToast("Đã lưu");
      }
      setModalOpen(false);
      setPage(1);
      await load();
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string) => {
    if (!window.confirm("Xóa khóa này?")) return;
    const res = await fetch(`/api/admin/managed-keys/${id}`, { method: "DELETE" });
    if (!res.ok) {
      showAdminToast("Không xóa được", "error");
      return;
    }
    showAdminToast("Đã xóa");
    await load();
  };

  return (
    <>
      <AdminModuleFrame
        header={
          <div>
            <h1 className={cls.title}>Khóa & biến môi trường</h1>
            <p className={cls.lead}>
              Lưu trên máy chủ (bảng AdminManagedKey). Danh sách chỉ hiển thị phần cuối giá trị; hạn chế quyền admin và
              không dùng cho dữ liệu cực kỳ nhạy cảm trừ khi bạn đã đánh giá rủi ro.
            </p>
          </div>
        }
        footer={
          <DbButton variant="primary" title="Thêm khóa / biến môi trường" onClick={openCreate}>
            + Thêm
          </DbButton>
        }
      >
        <div className={cls.tableWrap}>
          {loading ? (
            <p className={cls.loading}>Đang tải…</p>
          ) : (
            <table className={`db-table ${cls.keysTable}`}>
              <thead>
                <tr>
                  <th>Nhãn</th>
                  <th>Biến (ENV)</th>
                  <th>Giá trị</th>
                  <th>Bật</th>
                  <th>Thứ tự</th>
                  <th aria-label="Thao tác" />
                </tr>
              </thead>
              <tbody>
                {slice.map((row) => (
                  <tr key={row.id}>
                    <td className={cls.tdEllipsis}>{row.label}</td>
                    <td>
                      <code className={cls.code} title={row.envKey}>
                        {row.envKey}
                      </code>
                    </td>
                    <td>{row.valueMasked}</td>
                    <td>{row.enabled ? <DbTag tone="success">Có</DbTag> : <DbTag>Không</DbTag>}</td>
                    <td>{row.sortOrder}</td>
                    <td>
                      <div className="db-table-actions">
                        <DbButton
                          variant="default"
                          size="sm"
                          className="db-btn--iconOnly"
                          aria-label="Sửa khóa"
                          title="Sửa"
                          onClick={() => openEdit(row)}
                        >
                          <Pencil className="adminTableBtnIcon" strokeWidth={2.25} aria-hidden />
                        </DbButton>
                        <DbButton
                          variant="danger"
                          size="sm"
                          className="db-btn--iconOnly"
                          aria-label="Xóa khóa"
                          title="Xóa"
                          onClick={() => void remove(row.id)}
                        >
                          <Trash2 className="adminTableBtnIcon" strokeWidth={2.25} aria-hidden />
                        </DbButton>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {!loading && items.length > PAGE_SIZE ? (
          <div className={cls.pager}>
            <DbButton variant="default" size="sm" disabled={pageSafe <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
              Trước
            </DbButton>
            <span className={cls.pagerMeta}>
              Trang {pageSafe} / {totalPages}
            </span>
            <DbButton
              variant="default"
              size="sm"
              disabled={pageSafe >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              Sau
            </DbButton>
          </div>
        ) : null}
      </AdminModuleFrame>

      <DbModal open={modalOpen} onClose={() => setModalOpen(false)} title={editId ? "Sửa khóa" : "Thêm khóa"}>
        <div className={cls.form}>
          <DbField label="Nhãn hiển thị">
            <DbInput value={label} onChange={(e) => setLabel(e.target.value)} maxLength={120} />
          </DbField>
          <DbField
            label="Tên biến (ENV)"
            hint="Chữ, số và gạch dưới; bắt đầu bằng chữ — sẽ chuyển thành IN HOA."
          >
            <DbInput value={envKey} onChange={(e) => setEnvKey(e.target.value)} disabled={Boolean(editId)} placeholder="MY_API_KEY" />
          </DbField>
          <DbField
            label={editId ? "Giá trị mới (tuỳ chọn)" : "Giá trị"}
            hint={editId ? "Để trống nếu giữ nguyên giá trị đang lưu." : undefined}
          >
            <DbInput type="password" autoComplete="new-password" value={value} onChange={(e) => setValue(e.target.value)} />
          </DbField>
          <DbField label="Mô tả">
            <DbTextarea rows={2} maxLength={500} value={description} onChange={(e) => setDescription(e.target.value)} />
          </DbField>
          <div className="db-field">
            <label className="db-switch-row">
              <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} />
              <span>Bật</span>
            </label>
          </div>
          <DbField label="Thứ tự sắp xếp">
            <DbInput value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} inputMode="numeric" />
          </DbField>
          <div className={cls.modalFooter}>
            <DbButton variant="default" className={cls.modalCancelBtn} onClick={() => setModalOpen(false)}>
              Hủy
            </DbButton>
            <DbButton variant="primary" loading={saving} onClick={() => void submit()}>
              Lưu
            </DbButton>
          </div>
        </div>
      </DbModal>
    </>
  );
}
