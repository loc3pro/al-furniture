"use client";

import Link from "next/link";
import { useCallback, useState } from "react";
import { BlogPostPreviewModal, type BlogPostPreviewPayload } from "@/components/admin/blog/BlogPostPreviewModal";
import { showAdminToast } from "@/lib/admin-toast";
import { BlogPostRowActions } from "./BlogPostRowActions";
import styles from "./admin-blog.module.scss";

export type BlogListRowVm = {
  id: string;
  title: string;
  slug: string;
  authorName: string;
  /** ISO string từ server */
  publishedAt: string;
};

export function BlogListTbody({ rows }: { rows: BlogListRowVm[] }) {
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewPayload, setPreviewPayload] = useState<BlogPostPreviewPayload | null>(null);
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const openPreview = useCallback(async (id: string) => {
    setLoadingId(id);
    try {
      const res = await fetch(`/api/admin/blog/${id}`, { credentials: "same-origin" });
      const data = (await res.json().catch(() => ({}))) as {
        post?: {
          title: string;
          authorName: string;
          publishedAt: string;
          thumbnailUrl: string | null;
          content: string;
        };
        error?: string;
      };
      if (!res.ok || !data.post) {
        showAdminToast(typeof data.error === "string" ? data.error : "Không tải được bài", "error");
        return;
      }
      const p = data.post;
      setPreviewPayload({
        title: p.title,
        authorName: p.authorName,
        publishedAt:
          typeof p.publishedAt === "string" ? p.publishedAt : new Date(p.publishedAt).toISOString(),
        thumbnailUrl: p.thumbnailUrl,
        content: p.content ?? "",
      });
      setPreviewOpen(true);
    } finally {
      setLoadingId(null);
    }
  }, []);

  const onRowClick = useCallback(
    (e: React.MouseEvent<HTMLTableRowElement>, id: string) => {
      if ((e.target as HTMLElement).closest("a, button")) return;
      void openPreview(id);
    },
    [openPreview],
  );

  const onRowKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTableRowElement>, id: string) => {
      if (e.key !== "Enter" && e.key !== " ") return;
      if ((e.target as HTMLElement).closest("a, button")) return;
      e.preventDefault();
      void openPreview(id);
    },
    [openPreview],
  );

  return (
    <>
      <tbody>
        {rows.map((p) => (
          <tr
            key={p.id}
            className={`${styles.tr} ${styles.trClickable}`}
            data-loading={loadingId === p.id ? "true" : undefined}
            tabIndex={0}
            onClick={(e) => onRowClick(e, p.id)}
            onKeyDown={(e) => onRowKeyDown(e, p.id)}
          >
            <td className={styles.tdTitle}>
              <Link href={`/admin/blog/${p.id}`} className={styles.titleLink}>
                {p.title}
              </Link>
            </td>
            <td className={styles.tdAuthor}>{p.authorName}</td>
            <td className={styles.tdSlug}>
              <code className={styles.code}>/blog/{p.slug}</code>
            </td>
            <td className={styles.tdDate}>{new Date(p.publishedAt).toLocaleString("vi-VN")}</td>
            <td className={styles.tdActions}>
              <BlogPostRowActions postId={p.id} title={p.title} />
            </td>
          </tr>
        ))}
      </tbody>
      <BlogPostPreviewModal
        open={previewOpen}
        onClose={() => {
          setPreviewOpen(false);
          setPreviewPayload(null);
        }}
        payload={previewPayload}
      />
    </>
  );
}
