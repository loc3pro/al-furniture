"use client";

import { useEffect, useId, useState } from "react";
import { AdminTranslateField } from "@/components/admin/AdminTranslateField";
import { showAdminToast } from "@/lib/admin-toast";
import { Spinner } from "@/components/ui/Spinner";
import styles from "./CreateCategoryModal.module.scss";

export type CreatedCategory = { id: string; nameVi: string; nameEn: string };

type Props = {
  open: boolean;
  onClose: () => void;
  onCreated: (cat: CreatedCategory) => void;
};

export async function fetchAdminCategoryOptions(): Promise<CreatedCategory[]> {
  const res = await fetch("/api/admin/categories");
  if (!res.ok) throw new Error("Không tải được danh mục");
  const data = (await res.json()) as { categories?: { id: string; nameVi: string; nameEn: string }[] };
  const rows = data.categories ?? [];
  return [...rows]
    .map((c) => ({ id: c.id, nameVi: c.nameVi, nameEn: c.nameEn }))
    .sort((a, b) => a.nameVi.localeCompare(b.nameVi, "vi"));
}

export function CreateCategoryModal({ open, onClose, onCreated }: Props) {
  const titleId = useId();
  const [nameVi, setNameVi] = useState("");
  const [nameEn, setNameEn] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setNameVi("");
    setNameEn("");
    setErr(null);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const vi = nameVi.trim();
    const en = nameEn.trim();
    if (!vi) {
      setErr("Nhập tên danh mục (Tiếng Việt)");
      return;
    }
    if (!en) {
      setErr("Nhập tên danh mục (English)");
      return;
    }
    setErr(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nameVi: vi, nameEn: en }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        category?: CreatedCategory;
        error?: string;
      };
      if (!res.ok || !data.category) {
        const msg = data.error ?? "Không tạo được danh mục";
        setErr(msg);
        showAdminToast(msg, "error");
        return;
      }
      showAdminToast("Đã tạo danh mục");
      onCreated(data.category);
      onClose();
    } catch {
      setErr("Lỗi mạng hoặc máy chủ");
    } finally {
      setSubmitting(false);
    }
  }

  if (!open) return null;

  return (
    <div className={styles.backdrop} role="presentation" onClick={onClose}>
      <div
        className={styles.modal}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id={titleId} className={styles.title}>
          Danh mục mới
        </h2>
        <form onSubmit={(e) => void submit(e)} noValidate>
          <AdminTranslateField
            viLabel="Tên (Tiếng Việt)"
            enLabel="Tên (English)"
            viValue={nameVi}
            enValue={nameEn}
            onViChange={setNameVi}
            onEnChange={setNameEn}
            disabled={submitting}
            rows={1}
            viMaxLength={220}
            enMaxLength={220}
            className={styles.field}
            autoFocusVi
          />
          {err ? <p className={styles.err}>{err}</p> : null}
          <div className={styles.actions}>
            <button type="button" className={styles.btn} onClick={onClose} disabled={submitting}>
              Huỷ
            </button>
            <button
              type="submit"
              className={`${styles.btn} ${styles.primary}`}
              disabled={submitting || !nameVi.trim() || !nameEn.trim()}
            >
              {submitting ? <Spinner size="sm" inheritColor label="Đang tạo danh mục" /> : "Tạo"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
