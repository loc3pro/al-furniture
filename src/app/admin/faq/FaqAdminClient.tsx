"use client";

import { Pencil, Trash2 } from "lucide-react";
import { memo, useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AdminModuleFrame } from "@/design-system/components/AdminModuleFrame";
import { AdminSearchFilterRow } from "@/dashboard-ui/v1/components/AdminSearchFilterRow";
import { DbButton } from "@/dashboard-ui/v1/components/DbButton";
import { DbField } from "@/dashboard-ui/v1/components/DbField";
import { DbInput } from "@/dashboard-ui/v1/components/DbInput";
import { DbModal } from "@/dashboard-ui/v1/components/DbModal";
import { DbSelect, type DbSelectOption } from "@/dashboard-ui/v1/components/DbSelect";
import { DbTag } from "@/dashboard-ui/v1/components/DbTag";
import { DbTextarea } from "@/dashboard-ui/v1/components/DbTextarea";
import { showAdminToast } from "@/lib/admin-toast";
import { stableValueJson } from "@/lib/form-dirty-snapshot";

import cls from "./FaqAdminClient.module.scss";

export type FaqAdminRow = {
  id: string;
  questionVi: string;
  questionEn: string;
  answerVi: string;
  answerEn: string;
  published: boolean;
  sortOrder: number;
  updatedAt: string;
};

const PAGE_SIZE = 10;

const statusOptions: DbSelectOption[] = [
  { value: "all", label: "Tất cả trạng thái" },
  { value: "published", label: "Đang đăng" },
  { value: "draft", label: "Ẩn" },
];

export const FaqAdminClient = memo(function FaqAdminClient({ initialRows }: { initialRows: FaqAdminRow[] }) {
  const router = useRouter();
  const [rows, setRows] = useState(initialRows);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<"all" | "published" | "draft">("all");
  const [page, setPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [questionVi, setQuestionVi] = useState("");
  const [questionEn, setQuestionEn] = useState("");
  const [answerVi, setAnswerVi] = useState("");
  const [answerEn, setAnswerEn] = useState("");
  const [published, setPublished] = useState(true);
  const [sortOrder, setSortOrder] = useState("0");
  const [modalBaseline, setModalBaseline] = useState<string | null>(null);

  const modalPayloadSnap = useMemo(() => {
    const so = Number(sortOrder);
    return stableValueJson({
      questionVi: questionVi.trim(),
      questionEn: questionEn.trim(),
      answerVi: answerVi.trim(),
      answerEn: answerEn.trim(),
      published,
      sortOrder: Number.isFinite(so) ? so : 0,
    });
  }, [questionVi, questionEn, answerVi, answerEn, published, sortOrder]);

  const modalDirty = modalBaseline != null && modalPayloadSnap !== modalBaseline;

  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase();
    return rows.filter((r) => {
      if (status === "published" && !r.published) return false;
      if (status === "draft" && r.published) return false;
      if (!qq) return true;
      return (
        r.questionVi.toLowerCase().includes(qq) ||
        r.questionEn.toLowerCase().includes(qq) ||
        r.answerVi.toLowerCase().includes(qq) ||
        r.answerEn.toLowerCase().includes(qq)
      );
    });
  }, [rows, q, status]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageSafe = Math.min(page, totalPages);
  const slice = useMemo(() => {
    const start = (pageSafe - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, pageSafe]);

  const openCreate = useCallback(() => {
    setEditingId(null);
    setQuestionVi("");
    setQuestionEn("");
    setAnswerVi("");
    setAnswerEn("");
    setPublished(true);
    setSortOrder("0");
    setModalBaseline(
      stableValueJson({
        questionVi: "",
        questionEn: "",
        answerVi: "",
        answerEn: "",
        published: true,
        sortOrder: 0,
      }),
    );
    setModalOpen(true);
  }, []);

  const openEdit = useCallback((row: FaqAdminRow) => {
    setEditingId(row.id);
    setQuestionVi(row.questionVi);
    setQuestionEn(row.questionEn);
    setAnswerVi(row.answerVi);
    setAnswerEn(row.answerEn);
    setPublished(row.published);
    setSortOrder(String(row.sortOrder));
    setModalBaseline(
      stableValueJson({
        questionVi: row.questionVi.trim(),
        questionEn: row.questionEn.trim(),
        answerVi: row.answerVi.trim(),
        answerEn: row.answerEn.trim(),
        published: row.published,
        sortOrder: row.sortOrder,
      }),
    );
    setModalOpen(true);
  }, []);

  const closeModal = useCallback(() => {
    setModalOpen(false);
    setEditingId(null);
    setModalBaseline(null);
  }, []);

  const submit = useCallback(async () => {
    if (!questionVi.trim() || !questionEn.trim()) {
      showAdminToast("Nhập đủ câu hỏi VI và EN", "error");
      return;
    }
    if (!answerVi.trim() || !answerEn.trim()) {
      showAdminToast("Nhập đủ trả lời VI và EN", "error");
      return;
    }
    const so = Number(sortOrder);
    const payload = {
      questionVi: questionVi.trim(),
      questionEn: questionEn.trim(),
      answerVi: answerVi.trim(),
      answerEn: answerEn.trim(),
      published,
      sortOrder: Number.isFinite(so) ? so : 0,
    };
    setSaving(true);
    try {
      if (editingId) {
        const res = await fetch(`/api/admin/faq/${editingId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          showAdminToast("Không cập nhật được", "error");
          return;
        }
        const j = (await res.json()) as { item: FaqAdminRow };
        setRows((prev) => prev.map((r) => (r.id === editingId ? { ...r, ...j.item } : r)));
        showAdminToast("Đã cập nhật");
      } else {
        const res = await fetch("/api/admin/faq", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          showAdminToast("Không tạo được", "error");
          return;
        }
        const j = (await res.json()) as { item: FaqAdminRow };
        setRows((prev) => [j.item, ...prev]);
        showAdminToast("Đã tạo");
      }
      closeModal();
      router.refresh();
    } catch {
      showAdminToast("Kiểm tra dữ liệu", "error");
    } finally {
      setSaving(false);
    }
  }, [closeModal, editingId, questionVi, questionEn, answerVi, answerEn, published, sortOrder, router]);

  const remove = useCallback(
    async (id: string) => {
      if (!window.confirm("Xóa mục FAQ này?")) return;
      const res = await fetch(`/api/admin/faq/${id}`, { method: "DELETE" });
      if (!res.ok) {
        showAdminToast("Không xóa được", "error");
        return;
      }
      setRows((prev) => prev.filter((r) => r.id !== id));
      showAdminToast("Đã xóa");
      router.refresh();
    },
    [router],
  );

  return (
    <AdminModuleFrame
      header={<h1 className={cls.title}>FAQ</h1>}
      filters={
        <AdminSearchFilterRow
          search={
            <DbInput
              placeholder="Tìm…"
              title="Câu hỏi hoặc nội dung trả lời"
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setPage(1);
              }}
              aria-label="Tìm FAQ"
              inputClassName="db-input--pill"
            />
          }
          filters={
            <DbSelect
              pill
              style={{ minWidth: 220, width: "100%", maxWidth: 360 }}
              value={status}
              options={statusOptions}
              onChange={(e) => {
                setStatus(e.target.value as typeof status);
                setPage(1);
              }}
              aria-label="Lọc trạng thái"
            />
          }
        />
      }
      footer={
        <div className={cls.footerActions}>
          <button className={`btn btn--primary adminToolbarBtn ${cls.footerAddBtn}`} title="Thêm câu hỏi FAQ" onClick={openCreate}>
            + Thêm
          </button>
        </div>
      }
    >
      <div className={cls.tableWrap}>
        <table className="db-table">
          <thead>
            <tr>
              <th>Câu hỏi (VI)</th>
              <th>Câu hỏi (EN)</th>
              <th>Trạng thái</th>
              <th>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {slice.map((row) => (
              <tr key={row.id}>
                <td className={cls.tdEllipsis}>{row.questionVi}</td>
                <td className={cls.tdEllipsis}>{row.questionEn}</td>
                <td>
                  {row.published ? <DbTag tone="success">Đăng</DbTag> : <DbTag>Ẩn</DbTag>}
                </td>
                <td>
                  <div className={cls.rowActions}>
                    <button
                      type="button"
                      className="adminTableBtn adminTableBtnGhost adminTableBtn--iconOnly"
                      aria-label="Sửa FAQ"
                      title="Sửa"
                      onClick={() => openEdit(row)}
                    >
                      <Pencil className="adminTableBtnIcon" strokeWidth={2.25} aria-hidden />
                    </button>
                    <button
                      type="button"
                      className="adminTableBtn adminTableBtnDanger adminTableBtn--iconOnly"
                      aria-label="Xóa FAQ"
                      title="Xóa"
                      onClick={() => void remove(row.id)}
                    >
                      <Trash2 className="adminTableBtnIcon" strokeWidth={2.25} aria-hidden />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {filtered.length > PAGE_SIZE ? (
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

      <DbModal open={modalOpen} onClose={closeModal} title={editingId ? "Sửa FAQ" : "Thêm FAQ"} wide>
        <div className={cls.modalBody}>
          <DbField label="Câu hỏi (VI)">
            <DbInput value={questionVi} onChange={(e) => setQuestionVi(e.target.value)} maxLength={500} />
          </DbField>
          <DbField label="Câu hỏi (EN)">
            <DbInput value={questionEn} onChange={(e) => setQuestionEn(e.target.value)} maxLength={500} />
          </DbField>
          <DbField label="Thứ tự">
            <DbInput value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} inputMode="numeric" />
          </DbField>
          <div className="db-field">
            <label className="db-switch-row">
              <input type="checkbox" checked={published} onChange={(e) => setPublished(e.target.checked)} />
              <span>Đăng công khai</span>
            </label>
          </div>
          <DbField label="Trả lời (VI) — có thể dùng HTML">
            <DbTextarea rows={8} value={answerVi} onChange={(e) => setAnswerVi(e.target.value)} />
          </DbField>
          <DbField label="Trả lời (EN) — có thể dùng HTML">
            <DbTextarea rows={8} value={answerEn} onChange={(e) => setAnswerEn(e.target.value)} />
          </DbField>
          <div className={cls.modalActions}>
            <DbButton variant="default" className={cls.modalCancelBtn} onClick={closeModal}>
              Hủy
            </DbButton>
            <DbButton variant="primary" loading={saving} disabled={saving || !modalDirty} onClick={() => void submit()}>
              Lưu
            </DbButton>
          </div>
        </div>
      </DbModal>
    </AdminModuleFrame>
  );
});
