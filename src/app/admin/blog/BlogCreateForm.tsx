"use client";

import type { FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Spinner } from "@/components/ui/Spinner";
import { showAdminToast } from "@/lib/admin-toast";
import { useAdminRightPanelOptional } from "@/components/admin/AdminRightPanel";
import styles from "./blog-create.module.scss";

export function BlogCreateForm({
  panelFormId,
  onValidityChange,
}: {
  panelFormId?: string;
  /** Panel phải: báo có thể submit (tiêu đề không rỗng) để bật nút footer. */
  onValidityChange?: (canSubmit: boolean) => void;
} = {}) {
  const router = useRouter();
  const panel = useAdminRightPanelOptional();
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [authorName, setAuthorName] = useState("Furniture ECM");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    onValidityChange?.(Boolean(title.trim()) && !busy);
  }, [title, busy, onValidityChange]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    const t = title.trim();
    if (!t) return;
    setErr(null);
    setBusy(true);
    try {
      const res = await fetch("/api/admin/blog", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          title: t,
          slug: slug.trim() || undefined,
          excerpt: excerpt.trim() || undefined,
          authorName: authorName.trim() || undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg = (data as { error?: string }).error ?? "Không tạo được bài";
        setErr(msg);
        showAdminToast(msg, "error");
        return;
      }
      const id = (data as { post?: { id?: string } }).post?.id;
      showAdminToast("Đã tạo bài — đang mở trang soạn thảo");
      panel?.closePanel();
      if (id) router.push(`/admin/blog/${id}`);
      else router.refresh();
    } catch {
      setErr("Không tạo được bài");
      showAdminToast("Không tạo được bài", "error");
    } finally {
      setBusy(false);
    }
  }

  const formClass = [styles.form, panelFormId ? styles.formFullWidth : ""].filter(Boolean).join(" ");

  return (
    <form id={panelFormId || undefined} className={formClass} onSubmit={(e) => void submit(e)}>
      {err ? <p className={styles.err}>{err}</p> : null}
      <label className={styles.field}>
        Tiêu đề *
        <input value={title} onChange={(e) => setTitle(e.target.value)} required placeholder="VD: Xu hướng sofa 2026" disabled={busy} />
      </label>
      <label className={styles.field}>
        Slug (URL, tuỳ chọn)
        <input value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="Để trống — tự tạo từ tiêu đề" disabled={busy} spellCheck={false} />
      </label>
      <label className={styles.field}>
        Mô tả ngắn (tuỳ chọn)
        <textarea value={excerpt} onChange={(e) => setExcerpt(e.target.value)} placeholder="Hiển thị trong danh sách tin" rows={3} disabled={busy} />
      </label>
      <label className={styles.field}>
        Tác giả hiển thị
        <input value={authorName} onChange={(e) => setAuthorName(e.target.value)} disabled={busy} />
      </label>
      {panelFormId ? null : (
        <div className={styles.actions}>
          <button type="submit" className="btn btn--primary" disabled={busy || !title.trim()}>
            {busy ? <Spinner size="sm" inheritColor label="Đang tạo" /> : "Tạo bài & soạn nội dung"}
          </button>
        </div>
      )}
      <p className={styles.note}>Sau khi tạo, bạn được chuyển sang trang sửa bài để nhập nội dung HTML và ảnh đại diện.</p>
    </form>
  );
}
