"use client";

import { useCallback, useEffect, useState } from "react";
import { AdminPagination } from "@/components/admin/AdminPagination";
import { AdminPageLayout } from "@/components/admin/AdminPageLayout";
import { AdminStickyPageHeader } from "@/components/admin/AdminStickyPageHeader";
import { ADMIN_COMPACT_PAGE_SIZE } from "@/lib/admin-pagination";
import { useAdminRightPanel } from "@/components/admin/AdminRightPanel";
import { AdminRightPanelFooterCrud } from "@/components/admin/AdminRightPanelFooter";
import { AdminBannerImageField } from "@/components/admin/AdminBannerImageField";
import { BannerAddPanel } from "./BannerAddPanel";
import { NoDataEmpty } from "@/components/ui/NoDataEmpty";
import { Spinner } from "@/components/ui/Spinner";
import { showAdminToast } from "@/lib/admin-toast";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import { deleteAdminCloudinaryUrls, uploadAdminImageFile } from "@/lib/admin-upload-client";
import { normalizeBannerLink } from "@/lib/banner-link";
import { ChevronDown, ChevronUp } from "lucide-react";
import styles from "./BannersClient.module.scss";

const DEFAULT_BANNER_LINK = "/products";
const ADMIN_FORM_BANNER_ADD = "admin-form-banner-add";

type Banner = {
  id: string;
  imageUrl: string;
  link: string | null;
  title: string | null;
  subtitle: string | null;
  active: boolean;
  sortOrder: number;
};

function BannerCard({
  banner,
  index,
  total,
  reorderBusy,
  onMove,
  onRemove,
  onPatch,
  reload,
}: {
  banner: Banner;
  index: number;
  total: number;
  reorderBusy: boolean;
  onMove: (from: number, dir: -1 | 1) => void;
  onRemove: (id: string) => void;
  onPatch: (b: Banner, patch: Partial<Banner>) => Promise<void>;
  reload: () => Promise<void>;
}) {
  const [link, setLink] = useState(banner.link ?? DEFAULT_BANNER_LINK);
  const [pending, setPending] = useState<File | null>(null);
  const [imageSaveBusy, setImageSaveBusy] = useState(false);
  const [imageRowErr, setImageRowErr] = useState<string | null>(null);

  useEffect(() => {
    setLink(banner.link ?? DEFAULT_BANNER_LINK);
  }, [banner.id, banner.link]);

  useEffect(() => {
    setPending(null);
    setImageRowErr(null);
  }, [banner.id]);

  async function applyBannerImage() {
    if (!pending) return;
    setImageRowErr(null);
    setImageSaveBusy(true);
    const staged: string[] = [];
    try {
      const url = await uploadAdminImageFile(pending, "banners");
      staged.push(url);
      const res = await fetch(`/api/admin/banners/${banner.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ imageUrl: url }),
      });
      if (!res.ok) {
        await deleteAdminCloudinaryUrls(staged);
        setImageRowErr("Cập nhật ảnh thất bại");
        return;
      }
      setPending(null);
      await reload();
    } catch {
      await deleteAdminCloudinaryUrls(staged);
      setImageRowErr("Cập nhật ảnh thất bại");
    } finally {
      setImageSaveBusy(false);
    }
  }

  async function saveLinkIfChanged() {
    const normalized = normalizeBannerLink(link);
    const next = normalized === "" ? DEFAULT_BANNER_LINK : normalized;
    if (next !== link) setLink(next);
    const prev = banner.link ?? DEFAULT_BANNER_LINK;
    if (next === prev) return;
    await onPatch(banner, { link: next });
  }

  const disabled = reorderBusy;
  const imgBusy = disabled || imageSaveBusy;

  return (
    <div className={styles.card}>
      <div className={styles.cardInner}>
        <div className={styles.orderRail}>
          <span className={styles.orderBadge}>Thứ tự</span>
          <span className={styles.orderNum}>{index + 1}</span>
          <div className={styles.orderBtns}>
            <button
              type="button"
              className={styles.orderBtn}
              aria-label="Đưa banner lên"
              disabled={disabled || index <= 0}
              onClick={() => onMove(index, -1)}
            >
              <ChevronUp size={18} strokeWidth={2.25} aria-hidden />
            </button>
            <button
              type="button"
              className={styles.orderBtn}
              aria-label="Đưa banner xuống"
              disabled={disabled || index >= total - 1}
              onClick={() => onMove(index, 1)}
            >
              <ChevronDown size={18} strokeWidth={2.25} aria-hidden />
            </button>
          </div>
        </div>

        <div className={styles.formCol}>
          <span className={styles.idHint} title={banner.id}>
            #{banner.id.slice(-10)}
          </span>

          <AdminBannerImageField
            label=""
            savedUrl={banner.imageUrl}
            pendingFile={pending}
            onPickFile={setPending}
            disabled={imgBusy}
          />

          <label className={styles.field}>
            <span>Link khi bấm</span>
            <input
              value={link}
              onChange={(e) => setLink(e.target.value)}
              onBlur={() => void saveLinkIfChanged()}
              placeholder={DEFAULT_BANNER_LINK}
              disabled={disabled}
              spellCheck={false}
            />
          </label>

          <label className={styles.switchRow}>
            <input
              type="checkbox"
              checked={banner.active}
              disabled={disabled}
              onChange={(e) => void onPatch(banner, { active: e.target.checked })}
            />
            Hiển thị trên trang chủ
          </label>

          <div className={styles.metaPrimaryActions}>
            <button
              type="button"
              className={`btn btn--primary ${styles.saveBtn}`}
              disabled={!pending || imgBusy}
              title="Lưu ảnh banner đã chọn"
              onClick={() => void applyBannerImage()}
            >
              {imageSaveBusy ? <Spinner size="sm" inheritColor label="Đang lưu" /> : "Lưu"}
            </button>
            <button
              type="button"
              className={`btn btn--ghost ${styles.dangerBtn}`}
              disabled={disabled}
              title="Xóa banner khỏi carousel"
              onClick={() => void onRemove(banner.id)}
            >
              Xóa banner
            </button>
          </div>
          {imageRowErr ? <p className={styles.alert}>{imageRowErr}</p> : null}
        </div>
      </div>
    </div>
  );
}

const BANNER_PAGE_SIZE = ADMIN_COMPACT_PAGE_SIZE;

export function BannersClient({ listPage }: { listPage: number }) {
  const askConfirm = useConfirm();
  const { openPanel, closePanel } = useAdminRightPanel();
  const [list, setList] = useState<Banner[]>([]);
  const [listReady, setListReady] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [reorderBusy, setReorderBusy] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch("/api/admin/banners", { credentials: "same-origin" });
    const data = await res.json().catch(() => ({}));
    if (res.ok && Array.isArray(data.banners)) setList(data.banners);
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        await load();
      } finally {
        if (!cancelled) setListReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [load]);

  const patchBanner = useCallback(async (b: Banner, patch: Partial<Banner>) => {
    setErr(null);
    const res = await fetch(`/api/admin/banners/${b.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify(patch),
    });
    if (!res.ok) {
      setErr("Lưu thất bại");
      showAdminToast("Lưu thất bại", "error");
    } else {
      showAdminToast("Đã lưu banner");
    }
    await load();
  }, [load]);

  async function remove(id: string) {
    if (!(await askConfirm({ message: "Xóa banner này?", danger: true }))) return;
    setErr(null);
    const res = await fetch(`/api/admin/banners/${id}`, { method: "DELETE", credentials: "same-origin" });
    if (!res.ok) {
      setErr("Xóa thất bại");
      showAdminToast("Xóa thất bại", "error");
    } else {
      showAdminToast("Đã xóa banner");
      await load();
    }
  }

  async function move(from: number, dir: -1 | 1) {
    const to = from + dir;
    if (to < 0 || to >= list.length) return;
    setReorderBusy(true);
    setErr(null);
    const next = [...list];
    [next[from], next[to]] = [next[to]!, next[from]!];
    try {
      const res = await fetch("/api/admin/banners/reorder", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ orderedIds: next.map((b) => b.id) }),
      });
      if (!res.ok) {
        setErr("Không đổi thứ tự được");
        showAdminToast("Không đổi thứ tự được", "error");
        await load();
        return;
      }
      showAdminToast("Đã cập nhật thứ tự banner");
      await load();
    } catch {
      setErr("Không đổi thứ tự được");
      showAdminToast("Không đổi thứ tự được", "error");
      await load();
    } finally {
      setReorderBusy(false);
    }
  }

  const totalBannerPages = Math.max(1, Math.ceil(list.length / BANNER_PAGE_SIZE));
  const bannerSkip = (Math.min(listPage, totalBannerPages) - 1) * BANNER_PAGE_SIZE;
  const bannerSlice = list.slice(bannerSkip, bannerSkip + BANNER_PAGE_SIZE);
  const bannerHref = (p: number) => (p <= 1 ? "/admin/banners" : `/admin/banners?page=${p}`);

  return (
    <AdminPageLayout
      header={
        <AdminStickyPageHeader>
          <div className="adminPageHeaderRow">
            <div className="adminPageHeaderMain">
              <h1 className={styles.title}>Banner trang chủ</h1>
            </div>
            <div className="adminToolbar adminToolbar--end">
              <button
                type="button"
                className="btn btn--primary adminToolbarBtn"
                title="Thêm banner carousel trang chủ"
                onClick={() =>
                  openPanel({
                    title: "Thêm banner",
                    content: (
                      <BannerAddPanel panelFormId={ADMIN_FORM_BANNER_ADD} onCreated={() => void load()} />
                    ),
                    footer: (
                      <AdminRightPanelFooterCrud
                        create={
                          <button type="submit" form={ADMIN_FORM_BANNER_ADD} className="btn btn--primary">
                            Tạo banner
                          </button>
                        }
                        delete={
                          <button type="button" className="btn btn--ghost adminCancelGhost" onClick={() => closePanel()}>
                            Hủy
                          </button>
                        }
                      />
                    ),
                  })
                }
              >
                + Thêm
              </button>
            </div>
          </div>
        </AdminStickyPageHeader>
      }
    >
      {err ? <p className={styles.alert}>{err}</p> : null}

      {!listReady ? (
        <div className={styles.listLoading} role="status" aria-live="polite">
          <Spinner size="md" label="Đang tải banner" />
        </div>
      ) : (
        <div className={styles.mainStack}>
          <div className={styles.list}>
            {bannerSlice.map((b, i) => (
              <BannerCard
                key={b.id}
                banner={b}
                index={bannerSkip + i}
                total={list.length}
                reorderBusy={reorderBusy}
                onMove={move}
                onRemove={remove}
                onPatch={patchBanner}
                reload={load}
              />
            ))}
          </div>

          {list.length === 0 ? (
            <NoDataEmpty
              className={styles.empty}
              description="Thêm ảnh 19:9 để hiển thị trên carousel."
            />
          ) : null}

          {list.length > BANNER_PAGE_SIZE ? (
            <AdminPagination
              page={Math.min(listPage, totalBannerPages)}
              totalPages={totalBannerPages}
              totalItems={list.length}
              pageSize={BANNER_PAGE_SIZE}
              hrefForPage={bannerHref}
              itemLabel="banner"
            />
          ) : null}
        </div>
      )}
    </AdminPageLayout>
  );
}
