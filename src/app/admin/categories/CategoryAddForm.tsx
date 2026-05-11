"use client";

import type { FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAdminRightPanelOptional } from "@/components/admin/AdminRightPanel";
import { AdminTranslateField } from "@/components/admin/AdminTranslateField";
import { showAdminToast } from "@/lib/admin-toast";
import styles from "./categories.module.scss";

type CategoryAddFormProps = {
  embeddedInPanel?: boolean;
  panelFormId?: string;
  onValidityChange?: (canSubmit: boolean) => void;
};

export function CategoryAddForm({ embeddedInPanel, panelFormId, onValidityChange }: CategoryAddFormProps) {
  const router = useRouter();
  const panel = useAdminRightPanelOptional();
  const [nameVi, setNameVi] = useState("");
  const [nameEn, setNameEn] = useState("");
  const [slug, setSlug] = useState("");
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    onValidityChange?.(Boolean(nameVi.trim() && nameEn.trim()));
  }, [nameVi, nameEn, onValidityChange]);

  async function createCat(e: FormEvent) {
    e.preventDefault();
    setErr(null);
    const res = await fetch("/api/admin/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({
        nameVi: nameVi.trim(),
        nameEn: nameEn.trim(),
        slug: slug.trim() || undefined,
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const msg = (data as { error?: string }).error ?? "Không tạo được";
      setErr(msg);
      showAdminToast(msg, "error");
      return;
    }
    setNameVi("");
    setNameEn("");
    setSlug("");
    showAdminToast("Đã tạo danh mục");
    router.refresh();
    if (embeddedInPanel) panel?.closePanel();
  }

  return (
    <form
      id={panelFormId || undefined}
      className={embeddedInPanel ? styles.formPanel : styles.form}
      onSubmit={(e) => void createCat(e)}
    >
      {embeddedInPanel ? null : <h2 className={styles.formTitle}>Thêm danh mục</h2>}
      <div className={styles.fields}>
        <div className="field">
          <AdminTranslateField
            viLabel="Tên (Tiếng Việt)"
            enLabel="Tên (English)"
            viValue={nameVi}
            enValue={nameEn}
            onViChange={setNameVi}
            onEnChange={setNameEn}
            rows={1}
            viMaxLength={220}
            enMaxLength={220}
          />
        </div>
        <label className={styles.field}>
          <span>Slug (tuỳ chọn)</span>
          <input value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="Để trống — tự tạo từ tên" />
        </label>
        {panelFormId ? null : (
          <button
            type="submit"
            className={`btn btn--primary ${styles.formSubmitBtn}`}
            disabled={!nameVi.trim() || !nameEn.trim()}
          >
            Tạo
          </button>
        )}
      </div>
      {err ? <p className={styles.err}>{err}</p> : null}
    </form>
  );
}
