"use client";

import type { FormEvent } from "react";
import { useState } from "react";
import { AdminBannerImageField } from "@/components/admin/AdminBannerImageField";
import { Spinner } from "@/components/ui/Spinner";
import { showAdminToast } from "@/lib/admin-toast";
import { deleteAdminCloudinaryUrls, uploadAdminImageFile } from "@/lib/admin-upload-client";
import { useAdminRightPanelOptional } from "@/components/admin/AdminRightPanel";
import { normalizeBannerLink } from "@/lib/banner-link";
import styles from "./BannersClient.module.scss";

const DEFAULT_BANNER_LINK = "/products";

export function BannerAddPanel({
  onCreated,
  panelFormId,
}: {
  onCreated?: () => void | Promise<void>;
  panelFormId?: string;
}) {
  const panel = useAdminRightPanelOptional();
  const [form, setForm] = useState({
    link: DEFAULT_BANNER_LINK,
    title: "",
    subtitle: "",
  });
  const [pendingAddImage, setPendingAddImage] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function add(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    if (!pendingAddImage) {
      setErr("Chọn ảnh banner");
      showAdminToast("Chọn ảnh banner", "error");
      return;
    }
    setErr(null);
    setBusy(true);
    const staged: string[] = [];
    try {
      const imageUrl = await uploadAdminImageFile(pendingAddImage, "banners");
      staged.push(imageUrl);
      const linkNorm = normalizeBannerLink(form.link.trim());
      const linkOut = linkNorm === "" ? DEFAULT_BANNER_LINK : linkNorm;
      const res = await fetch("/api/admin/banners", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          imageUrl,
          link: linkOut,
          title: form.title.trim() || null,
          subtitle: form.subtitle.trim() || null,
          active: true,
        }),
      });
      if (!res.ok) {
        await deleteAdminCloudinaryUrls(staged);
        setErr("Tạo thất bại");
        showAdminToast("Tạo thất bại", "error");
        return;
      }
      showAdminToast("Đã thêm banner");
      setForm({ link: DEFAULT_BANNER_LINK, title: "", subtitle: "" });
      setPendingAddImage(null);
      await onCreated?.();
      panel?.closePanel();
    } catch {
      await deleteAdminCloudinaryUrls(staged);
      setErr("Tạo thất bại");
      showAdminToast("Tạo thất bại", "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form id={panelFormId || undefined} className={styles.addCard} onSubmit={(e) => void add(e)}>
      {err ? <p className={styles.alert}>{err}</p> : null}
      <AdminBannerImageField
        label="Ảnh banner *"
        savedUrl=""
        pendingFile={pendingAddImage}
        onPickFile={setPendingAddImage}
        disabled={busy}
        hint="Bấm vào ô bên dưới để chọn ảnh — căn khung 19:9, ảnh upload khi bấm Tạo."
      />
      <label className={styles.field}>
        <span>Link khi bấm</span>
        <input
          value={form.link}
          onChange={(e) => setForm((f) => ({ ...f, link: e.target.value }))}
          placeholder={DEFAULT_BANNER_LINK}
          disabled={busy}
          spellCheck={false}
        />
        <p className={styles.fieldHint}>Để trống hoặc giữ mặc định sẽ dùng {DEFAULT_BANNER_LINK} (trang sản phẩm / ô tìm kiếm).</p>
      </label>
      {panelFormId ? null : (
        <div className={styles.addActions}>
          <button type="submit" className="btn btn--primary" disabled={busy || !pendingAddImage}>
            {busy ? <Spinner size="sm" inheritColor label="Đang tạo banner" /> : "Tạo banner"}
          </button>
        </div>
      )}
    </form>
  );
}
