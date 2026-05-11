"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { AdminDeferredImageField } from "@/components/admin/AdminDeferredImageField";
import { AdminHtmlSnippetLauncher } from "@/components/admin/AdminHtmlSnippetLauncher";
import { AdminTinyMceEditor } from "@/components/admin/AdminTinyMceEditor";
import { BlogPostPreviewModal } from "@/components/admin/blog/BlogPostPreviewModal";
import { showAdminToast } from "@/lib/admin-toast";
import { deleteAdminCloudinaryUrls, uploadAdminImageFile } from "@/lib/admin-upload-client";
import { Spinner } from "@/components/ui/Spinner";
import { stableValueJson } from "@/lib/form-dirty-snapshot";
import { AdminBackLink } from "@/components/admin/AdminBackNav";
import { AdminPageLayout } from "@/components/admin/AdminPageLayout";
import { AdminStickyPageHeader } from "@/components/admin/AdminStickyPageHeader";
import { useMatchMedia } from "@/hooks/useMatchMedia";
import styles from "./BlogEditForm.module.scss";

type Post = {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  thumbnailUrl: string | null;
  authorName: string;
  publishedAt: string;
  metaTitle: string | null;
  metaDescription: string | null;
};

export function BlogEditForm({ initial }: { initial: Post }) {
  const router = useRouter();
  const isMobile = useMatchMedia("(max-width: 768px)", false);
  const [post, setPost] = useState(initial);
  const [pendingThumb, setPendingThumb] = useState<File | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [contentPreviewOpen, setContentPreviewOpen] = useState(false);

  const savedSnap = useMemo(
    () =>
      stableValueJson({
        title: initial.title,
        slug: initial.slug,
        excerpt: initial.excerpt,
        content: initial.content,
        thumbnailUrl: initial.thumbnailUrl ?? "",
        authorName: initial.authorName,
        publishedAt: initial.publishedAt,
        metaTitle: initial.metaTitle ?? "",
        metaDescription: initial.metaDescription ?? "",
        pendingThumb: false,
      }),
    [initial],
  );
  const currentSnap = useMemo(
    () =>
      stableValueJson({
        title: post.title,
        slug: post.slug,
        excerpt: post.excerpt,
        content: post.content,
        thumbnailUrl: post.thumbnailUrl ?? "",
        authorName: post.authorName,
        publishedAt: post.publishedAt,
        metaTitle: post.metaTitle ?? "",
        metaDescription: post.metaDescription ?? "",
        pendingThumb: pendingThumb != null,
      }),
    [post, pendingThumb],
  );
  const isDirty = currentSnap !== savedSnap;

  /** Ảnh thumbnail dùng cho modal xem trước: ưu tiên blob từ file user vừa chọn (chưa upload). */
  const [pendingThumbUrl, setPendingThumbUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!pendingThumb) {
      setPendingThumbUrl(null);
      return;
    }
    const url = URL.createObjectURL(pendingThumb);
    setPendingThumbUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [pendingThumb]);
  const previewThumbnailUrl = pendingThumbUrl ?? post.thumbnailUrl;

  async function save() {
    setErr(null);
    setSaving(true);
    const staged: string[] = [];
    try {
      let thumbnailUrl = post.thumbnailUrl ?? "";
      if (pendingThumb) {
        thumbnailUrl = await uploadAdminImageFile(pendingThumb, "blog");
        staged.push(thumbnailUrl);
      }
      const res = await fetch(`/api/admin/blog/${post.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          title: post.title,
          slug: post.slug,
          excerpt: post.excerpt,
          content: post.content,
          thumbnailUrl,
          authorName: post.authorName,
          metaTitle: post.metaTitle,
          metaDescription: post.metaDescription,
          publishedAt: post.publishedAt,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        await deleteAdminCloudinaryUrls(staged);
        const msg = typeof data.error === "string" ? data.error : "Lưu thất bại";
        setErr(msg);
        showAdminToast(msg, "error");
        return;
      }
      showAdminToast("Đã lưu bài viết");
      setPendingThumb(null);
      if (data.post) {
        setPost((p) => ({
          ...p,
          ...data.post,
          publishedAt: new Date(data.post.publishedAt).toISOString(),
        }));
      }
      router.refresh();
    } catch {
      await deleteAdminCloudinaryUrls(staged);
      setErr("Lưu thất bại");
      showAdminToast("Lưu thất bại", "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <AdminPageLayout
      header={
        <AdminStickyPageHeader>
          <div className={`adminPageHeaderRow ${styles.editHeaderRow}`}>
            <div className={`adminPageHeaderMain ${styles.editHeaderMain}`}>
              <AdminBackLink href="/admin/blog">Sửa bài</AdminBackLink>
            </div>
            <div className="adminToolbar adminToolbar--end">
              {!isMobile ? (
                <button
                  type="button"
                  className={`btn btn--primary adminToolbarBtn ${styles.topSaveBtn}`}
                  disabled={saving || !isDirty}
                  title="Lưu bài blog"
                  onClick={() => void save()}
                >
                  {saving ? <Spinner size="sm" inheritColor label="Đang lưu" /> : "Lưu"}
                </button>
              ) : null}
            </div>
          </div>
        </AdminStickyPageHeader>
      }
    >
      {err ? <p className={styles.err}>{err}</p> : null}
      <div className={styles.grid}>
        <div className={styles.rowTitleSlug}>
          <label className={styles.field}>
            Tiêu đề
            <input value={post.title} onChange={(e) => setPost((p) => ({ ...p, title: e.target.value }))} disabled={saving} />
          </label>
          <label className={styles.field}>
            Slug (URL)
            <input value={post.slug} onChange={(e) => setPost((p) => ({ ...p, slug: e.target.value }))} disabled={saving} />
          </label>
        </div>

        <label className={`${styles.field} ${styles.rowExcerpt}`}>
          Mô tả ngắn
          <textarea
            className={styles.excerptInput}
            rows={2}
            value={post.excerpt}
            onChange={(e) => setPost((p) => ({ ...p, excerpt: e.target.value }))}
            disabled={saving}
          />
        </label>

        <div className={styles.rowThumbAuthor}>
          <div className={styles.thumbCell}>
            <AdminDeferredImageField
              label="Ảnh thumbnail"
              savedUrl={post.thumbnailUrl ?? ""}
              pendingFile={pendingThumb}
              onPickFile={setPendingThumb}
              disabled={saving}
              emptyTitle="Chọn ảnh thumbnail"
              acceptSummary="JPEG, PNG, GIF hoặc WebP."
              maxSizeHint="Nên dưới 5 MB."
            />
          </div>

        </div>

        <div className={styles.field}>
          <div className={styles.detailHead}>
            <span>Nội dung chi tiết</span>
            <div className={styles.detailHeadActions}>
              <div className={styles.detailHeadButtonRow}>
                <div className={styles.detailHeadSnippetSlot}>
                  <AdminHtmlSnippetLauncher
                    assist={{
                      initialHtml: post.content,
                      onApplyHtml: (html) => setPost((p) => ({ ...p, content: html })),
                    }}
                  />
                </div>
                <button
                  type="button"
                  className={styles.previewPopupBtn}
                  disabled={saving}
                  onClick={() => setContentPreviewOpen(true)}
                >
                  Xem trước
                </button>
              </div>
            </div>
          </div>
          <AdminTinyMceEditor
            value={post.content}
            onChange={(html) => setPost((p) => ({ ...p, content: html }))}
            disabled={saving}
            minHeight={300}
            placeholder="Soạn bài — nút « Mã HTML » trên thanh công cụ để sửa trực tiếp thẻ."
          />
        </div>

        <label className={styles.field}>
          Meta title
          <input
            value={post.metaTitle ?? ""}
            onChange={(e) => setPost((p) => ({ ...p, metaTitle: e.target.value || null }))}
            disabled={saving}
          />
        </label>

        <label className={styles.field}>
          Meta description
          <textarea
            style={{ minHeight: 56 }}
            value={post.metaDescription ?? ""}
            onChange={(e) => setPost((p) => ({ ...p, metaDescription: e.target.value || null }))}
            disabled={saving}
          />
        </label>

        <label className={styles.field}>
          Tác giả
          <input
            value={post.authorName}
            onChange={(e) => setPost((p) => ({ ...p, authorName: e.target.value }))}
            disabled={saving}
            placeholder="Ví dụ: Nguyễn Văn A"
            autoComplete="off"
          />
        </label>
      </div>

      <BlogPostPreviewModal
        open={contentPreviewOpen}
        onClose={() => setContentPreviewOpen(false)}
        payload={
          contentPreviewOpen
            ? {
              title: post.title,
              authorName: post.authorName,
              publishedAt: post.publishedAt,
              thumbnailUrl: previewThumbnailUrl,
              content: post.content,
            }
            : null
        }
      />

      {isMobile ? (
        <div className={styles.bottomStickyBar}>
          <button
            type="button"
            className={`btn btn--primary ${styles.bottomStickyBtn}`}
            disabled={saving || !isDirty}
            title="Lưu bài blog"
            onClick={() => void save()}
          >
            {saving ? <Spinner size="sm" inheritColor label="Đang lưu" /> : "Lưu"}
          </button>
        </div>
      ) : null}
    </AdminPageLayout>
  );
}
