"use client";

import { Loader2, Pencil, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { showAdminToast } from "@/lib/admin-toast";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import styles from "./admin-blog.module.scss";

export function BlogPostRowActions({ postId, title }: { postId: string; title: string }) {
  const router = useRouter();
  const askConfirm = useConfirm();
  const [busy, setBusy] = useState(false);

  async function handleDelete() {
    const label = title.trim().slice(0, 80) || "bài viết";
    if (
      !(await askConfirm({
        message: `Xóa bài "${label}"? Hành động không hoàn tác.`,
        danger: true,
      }))
    )
      return;
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/blog/${postId}`, {
        method: "DELETE",
        credentials: "same-origin",
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        showAdminToast(typeof data.error === "string" ? data.error : "Không xóa được", "error");
        return;
      }
      showAdminToast("Đã xóa bài viết");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  const editLabel = title.trim() ? `Sửa bài: ${title.trim()}` : "Sửa bài viết";

  return (
    <div className={styles.rowActions} onClick={(e) => e.stopPropagation()}>
      <Link
        href={`/admin/blog/${postId}`}
        className="adminTableBtn adminTableBtn--iconOnly"
        title={title}
        aria-label={editLabel}
      >
        <Pencil className="adminTableBtnIcon" strokeWidth={2.25} aria-hidden />
      </Link>
      <button
        type="button"
        className="adminTableBtn adminTableBtnDanger adminTableBtn--iconOnly"
        disabled={busy}
        aria-label={busy ? "Đang xóa bài" : "Xóa bài viết"}
        title="Xóa bài viết"
        onClick={() => void handleDelete()}
      >
        {busy ? (
          <Loader2 className="adminTableBtnIcon adminTableBtnIcon--spin" strokeWidth={2.25} aria-hidden />
        ) : (
          <Trash2 className="adminTableBtnIcon" strokeWidth={2.25} aria-hidden />
        )}
      </button>
    </div>
  );
}
