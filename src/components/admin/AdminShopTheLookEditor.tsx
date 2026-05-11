"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ImagePlus } from "lucide-react";
import { showAdminToast } from "@/lib/admin-toast";
import { slugifyVi } from "@/lib/slugify-vi";
import { AdminPageLayout } from "@/components/admin/AdminPageLayout";
import { AdminStickyPageHeader } from "@/components/admin/AdminStickyPageHeader";
import { AdminShopTheLookHeroCropModal } from "@/components/admin/AdminShopTheLookHeroCropModal";
import styles from "./AdminShopTheLookEditor.module.scss";

type CatalogProduct = { id: string; nameVi: string; nameEn: string; slug: string };

export type HotspotDraft = {
  clientKey: string;
  productId: string;
  productName: string;
  xPercent: number;
  yPercent: number;
};

type Props =
  | {
      mode: "create";
    }
  | {
      mode: "edit";
      id: string;
      initial: {
        slug: string;
        title: string;
        subtitle: string;
        description: string;
        heroImageUrl: string;
        published: boolean;
        editorZoom: number;
        hotspots: HotspotDraft[];
      };
    };

function newKey() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

async function uploadHeroToCloudinary(file: File): Promise<string | null> {
  const fd = new FormData();
  fd.set("file", file);
  fd.set("folder", "shop-the-look");
  const res = await fetch("/api/admin/upload", { method: "POST", body: fd, credentials: "same-origin" });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || typeof data.url !== "string") {
    showAdminToast((data as { error?: string }).error ?? "Upload ảnh thất bại", "error");
    return null;
  }
  return data.url;
}

export function AdminShopTheLookEditor(props: Props) {
  const router = useRouter();
  const imgRef = useRef<HTMLImageElement>(null);
  const heroFileInputRef = useRef<HTMLInputElement>(null);

  const [title, setTitle] = useState(props.mode === "edit" ? props.initial.title : "");
  const [subtitle, setSubtitle] = useState(props.mode === "edit" ? props.initial.subtitle : "");
  const [description, setDescription] = useState(props.mode === "edit" ? props.initial.description : "");
  const [heroImageUrl, setHeroImageUrl] = useState(props.mode === "edit" ? props.initial.heroImageUrl : "");
  const [published, setPublished] = useState(props.mode === "edit" ? props.initial.published : false);
  const [editorZoom, setEditorZoom] = useState(props.mode === "edit" ? props.initial.editorZoom : 1);
  const [hotspots, setHotspots] = useState<HotspotDraft[]>(
    props.mode === "edit" ? props.initial.hotspots : [],
  );

  const [heroFile, setHeroFile] = useState<File | null>(null);
  const [heroPreviewUrl, setHeroPreviewUrl] = useState<string | null>(null);

  const [cropModalSrc, setCropModalSrc] = useState<string | null>(null);

  const [busy, setBusy] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [pendingCoords, setPendingCoords] = useState<{ x: number; y: number } | null>(null);
  const [searchQ, setSearchQ] = useState("");
  const [searchHits, setSearchHits] = useState<CatalogProduct[]>([]);
  const [searchBusy, setSearchBusy] = useState(false);

  const zoomPercent = Math.round(editorZoom * 100);

  const derivedSlugCreate = useMemo(() => slugifyVi(title).trim().toLowerCase(), [title]);

  const effectiveSlug = props.mode === "edit" ? props.initial.slug : derivedSlugCreate;

  useEffect(() => {
    return () => {
      if (heroPreviewUrl) URL.revokeObjectURL(heroPreviewUrl);
    };
  }, [heroPreviewUrl]);

  useEffect(() => {
    return () => {
      if (cropModalSrc) URL.revokeObjectURL(cropModalSrc);
    };
  }, [cropModalSrc]);

  const heroDisplaySrc = (heroPreviewUrl ?? heroImageUrl.trim()) || "";

  const searchProducts = useCallback(async (q: string) => {
    setSearchBusy(true);
    try {
      const res = await fetch(`/api/admin/catalog/products?q=${encodeURIComponent(q)}`, {
        credentials: "same-origin",
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && Array.isArray(data.products)) {
        setSearchHits(data.products as CatalogProduct[]);
      } else {
        setSearchHits([]);
      }
    } finally {
      setSearchBusy(false);
    }
  }, []);

  const openPickerAt = useCallback(
    (x: number, y: number) => {
      setPendingCoords({ x, y });
      setModalOpen(true);
      setSearchQ("");
      void searchProducts("");
    },
    [searchProducts],
  );

  const onImageClick = useCallback(
    (e: React.MouseEvent<HTMLImageElement>) => {
      const img = e.currentTarget;
      const r = img.getBoundingClientRect();
      if (r.width <= 0 || r.height <= 0) return;
      let x = ((e.clientX - r.left) / r.width) * 100;
      let y = ((e.clientY - r.top) / r.height) * 100;
      x = Math.min(100, Math.max(0, x));
      y = Math.min(100, Math.max(0, y));
      openPickerAt(x, y);
    },
    [openPickerAt],
  );

  const onPickHeroFile = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (props.mode === "edit") return;
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !file.type.startsWith("image/")) return;
    setCropModalSrc((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return URL.createObjectURL(file);
    });
  }, [props.mode]);

  const cancelCropModal = useCallback(() => {
    setCropModalSrc((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
  }, []);

  const confirmCrop = useCallback(
    (file: File) => {
      setHeroPreviewUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return URL.createObjectURL(file);
      });
      setHeroFile(file);
      cancelCropModal();
      showAdminToast("Đã áp dụng ảnh đã cắt. Bấm Lưu để tải lên Cloudinary.", "success");
    },
    [cancelCropModal],
  );

  const clearHeroPreview = useCallback(() => {
    if (props.mode === "edit") return;
    setHeroFile(null);
    setHeroPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
    setHeroImageUrl("");
  }, [props.mode]);

  const confirmProduct = useCallback(
    (p: CatalogProduct) => {
      if (!pendingCoords) return;
      setHotspots((prev) => [
        ...prev,
        {
          clientKey: newKey(),
          productId: p.id,
          productName: p.nameVi,
          xPercent: pendingCoords.x,
          yPercent: pendingCoords.y,
        },
      ]);
      setModalOpen(false);
      setPendingCoords(null);
      showAdminToast(`Đã gắn “${p.nameVi}” tại (${pendingCoords.x.toFixed(1)}%, ${pendingCoords.y.toFixed(1)}%)`, "success");
    },
    [pendingCoords],
  );

  const removeHotspot = useCallback((clientKey: string) => {
    setHotspots((prev) => prev.filter((h) => h.clientKey !== clientKey));
  }, []);

  const payloadBase = useMemo(() => {
    const sub = subtitle.trim();
    const desc = description.trim();
    const slug =
      props.mode === "edit" ? props.initial.slug.trim().toLowerCase() : derivedSlugCreate;
    return {
      slug,
      title: title.trim(),
      subtitle: sub.length ? sub : null,
      description: desc.length ? desc : null,
      heroImageUrl: "",
      published,
      editorZoom,
      hotspots: hotspots.map((h, i) => ({
        productId: h.productId,
        xPercent: h.xPercent,
        yPercent: h.yPercent,
        sortOrder: i,
      })),
    };
  }, [
    props.mode,
    props.mode === "edit" ? props.initial.slug : "",
    derivedSlugCreate,
    title,
    subtitle,
    description,
    published,
    editorZoom,
    hotspots,
  ]);

  const validateCreate = useCallback((): boolean => {
    if (props.mode !== "create") return true;
    if (!title.trim()) {
      showAdminToast("Nhập tiêu đề.", "error");
      return false;
    }
    if (!derivedSlugCreate) {
      showAdminToast("Tiêu đề không tạo được slug hợp lệ.", "error");
      return false;
    }
    if (!heroFile) {
      showAdminToast("Chọn ảnh, cắt vùng và xác nhận trước khi lưu.", "error");
      return false;
    }
    if (hotspots.length === 0) {
      showAdminToast("Thêm ít nhất một hotspot (bấm vào ảnh và chọn sản phẩm).", "error");
      return false;
    }
    return true;
  }, [props.mode, title, derivedSlugCreate, heroFile, hotspots.length]);

  const save = useCallback(async () => {
    if (props.mode === "create" && !validateCreate()) return;

    setBusy(true);
    try {
      let finalHeroUrl = heroImageUrl.trim();

      if (props.mode === "create" && heroFile) {
        const uploaded = await uploadHeroToCloudinary(heroFile);
        if (!uploaded) return;
        finalHeroUrl = uploaded;
        setHeroImageUrl(uploaded);
        setHeroFile(null);
        setHeroPreviewUrl((prev) => {
          if (prev) URL.revokeObjectURL(prev);
          return null;
        });
      } else if (props.mode === "edit") {
        finalHeroUrl = props.initial.heroImageUrl.trim();
      }

      if (!payloadBase.slug || !payloadBase.title || !finalHeroUrl) {
        showAdminToast("Thiếu slug, tiêu đề hoặc ảnh hero.", "error");
        return;
      }

      const payload = { ...payloadBase, heroImageUrl: finalHeroUrl };

      if (props.mode === "create") {
        const res = await fetch("/api/admin/shop-the-look", {
          method: "POST",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          showAdminToast((data as { error?: string }).error ?? "Không lưu được", "error");
          return;
        }
        showAdminToast("Đã tạo Shop the Look", "success");
        router.push("/admin/shop-the-look");
        router.refresh();
        return;
      }
      const res = await fetch(`/api/admin/shop-the-look/${props.id}`, {
        method: "PUT",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        showAdminToast((data as { error?: string }).error ?? "Không lưu được", "error");
        return;
      }
      showAdminToast("Đã cập nhật", "success");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }, [payloadBase, heroFile, heroImageUrl, props, router, validateCreate]);

  const isEdit = props.mode === "edit";

  return (
    <AdminPageLayout
      header={
        <AdminStickyPageHeader>
          <div className={`adminPageHeaderRow ${styles.toolbar}`}>
            <div className="adminPageHeaderMain">
              <h1 className={styles.title}>{isEdit ? "Sửa Shop the Look" : "Tạo Shop the Look"}</h1>
            </div>
            <div className={`adminToolbar adminToolbar--end ${styles.toolbarActions}`}>
              <Link
                href="/admin/products/new"
                className="btn btn--ghost adminToolbarBtn"
                target="_blank"
                rel="noreferrer"
                title="Tạo sản phẩm trong catalog — sau đó chọn lại ở đây khi gắn hotspot"
                aria-label="Mở trang tạo sản phẩm trong catalog (không phải tạo bài Shop the Look)"
              >
                + Catalog
              </Link>
              <button
                type="button"
                className="btn btn--primary adminToolbarBtn"
                disabled={busy}
                title="Lưu bài Shop the Look"
                onClick={() => void save()}
              >
                {busy ? "Đang lưu…" : "Lưu"}
              </button>
            </div>
          </div>
        </AdminStickyPageHeader>
      }
    >
      <div className={styles.grid}>
        <section className={styles.card}>
          <h2 className={styles.cardTitle}>Thông tin</h2>
          <label className={styles.field}>
            <span>Tiêu đề</span>
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="vd. Sofa bộ phòng khách" />
          </label>
          <div className={styles.field}>
            <span>URL</span>
            <div className={styles.slugReadonly}>
              <code>{effectiveSlug || "—"}</code>
            </div>
          </div>
          <label className={styles.field}>
            <span>Phụ đề (tùy chọn)</span>
            <input value={subtitle} onChange={(e) => setSubtitle(e.target.value)} />
          </label>
          <label className={styles.field}>
            <span>Mô tả</span>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Giới thiệu hiển thị trên trang chi tiết…" />
          </label>

          <div className={styles.field}>
            <span>Ảnh hero</span>
            {isEdit ? (
              <div className={styles.heroShellReadonly}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={heroImageUrl} alt="" className={styles.heroPreviewImg} />
              </div>
            ) : (
              <>
                <input
                  ref={heroFileInputRef}
                  type="file"
                  accept="image/*"
                  hidden
                  onChange={(e) => onPickHeroFile(e)}
                />
                {heroDisplaySrc ? (
                  <div className={styles.heroUploadRow}>
                    <div className={styles.heroShell}>
                      <button
                        type="button"
                        className={styles.heroPreviewHit}
                        disabled={busy}
                        aria-label="Đổi ảnh — bấm để chọn file khác"
                        onClick={() => heroFileInputRef.current?.click()}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={heroDisplaySrc} alt="" className={styles.heroPreviewImgFill} />
                      </button>
                      <button
                        type="button"
                        className={styles.heroFabClear}
                        disabled={busy}
                        aria-label="Xóa ảnh"
                        onClick={() => clearHeroPreview()}
                      >
                        ×
                      </button>
                    </div>
                    <div className={styles.heroUploadActions}>
                      <button
                        type="button"
                        className="btn btn--primary adminToolbarBtn"
                        disabled={busy}
                        onClick={() => heroFileInputRef.current?.click()}
                      >
                        Chọn ảnh khác
                      </button>
                      <button type="button" className={styles.previewDelete} onClick={() => clearHeroPreview()}>
                        Xóa ảnh
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className={styles.heroUploadRow}>
                    <button
                      type="button"
                      className={styles.heroDropZone}
                      disabled={busy}
                      aria-label="Chọn ảnh hero"
                      onClick={() => heroFileInputRef.current?.click()}
                    >
                      <span className={styles.heroDropIcon} aria-hidden>
                        <ImagePlus size={40} strokeWidth={1.35} />
                      </span>
                      <span className={styles.heroDropTitle}>Chọn ảnh hero</span>
                      <span className={styles.heroDropMeta}>JPEG, PNG, WebP — sau đó cắt vùng.</span>
                    </button>
                    <div className={styles.heroUploadActions}>
                      <button
                        type="button"
                        className="btn btn--primary adminToolbarBtn"
                        disabled={busy}
                        onClick={() => heroFileInputRef.current?.click()}
                      >
                        Chọn ảnh
                      </button>
                    </div>
                  </div>
                )}
                <p className={styles.previewHint}>Sau khi chọn file, hộp thoại cắt ảnh sẽ mở. Ảnh chỉ upload khi bấm Lưu.</p>
              </>
            )}
          </div>

          <label className={styles.inline}>
            <input type="checkbox" checked={published} onChange={(e) => setPublished(e.target.checked)} />
            Hiển thị trên website
          </label>
        </section>

        <section className={styles.cardWide}>
          <div className={styles.editorHead}>
            <h2 className={styles.cardTitle}>Đặt điểm trên ảnh</h2>
            <div className={styles.zoomRow}>
              <label>
                Zoom chỉnh sửa ({zoomPercent}%)
                <input
                  type="range"
                  min={50}
                  max={200}
                  value={zoomPercent}
                  onChange={(e) => setEditorZoom(parseInt(e.target.value, 10) / 100)}
                />
              </label>
              <p className={styles.hint}>
                Bấm vào ảnh để chọn vị trí — tọa độ lưu theo % trên khung ảnh (độc lập zoom). Zoom chỉ giúp nhìn rõ;
                giá trị zoom được lưu kèm để tham chiếu.
              </p>
            </div>
          </div>

          <div className={styles.stageOuter}>
            <div
              className={styles.stageZoom}
              style={{
                transform: `scale(${editorZoom})`,
                transformOrigin: "top center",
              }}
            >
              <div className={styles.stageInner}>
                {heroDisplaySrc ? (
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      ref={imgRef}
                      src={heroDisplaySrc}
                      alt=""
                      className={styles.hero}
                      onClick={onImageClick}
                    />
                    {hotspots.map((h) => (
                      <span
                        key={h.clientKey}
                        className={styles.dot}
                        style={{ left: `${h.xPercent}%`, top: `${h.yPercent}%` }}
                        title={h.productName}
                      />
                    ))}
                  </>
                ) : (
                  <div className={styles.heroPlaceholder}>Chọn ảnh hero bên trái để đặt điểm</div>
                )}
              </div>
            </div>
          </div>

          <h3 className={styles.listHeading}>Hotspot đã gắn ({hotspots.length})</h3>
          <ul className={styles.hotList}>
            {hotspots.map((h, i) => (
              <li key={h.clientKey} className={styles.hotRow}>
                <span className={styles.hotIdx}>{i + 1}</span>
                <span className={styles.hotMeta}>
                  <strong>{h.productName}</strong>
                  <span className={styles.muted}>
                    {h.xPercent.toFixed(1)}%, {h.yPercent.toFixed(1)}%
                  </span>
                </span>
                <button
                  type="button"
                  className={styles.hotRemove}
                  onClick={() => removeHotspot(h.clientKey)}
                  aria-label="Xóa điểm"
                >
                  Xóa
                </button>
              </li>
            ))}
          </ul>
        </section>
      </div>

      {cropModalSrc ? (
        <AdminShopTheLookHeroCropModal imageSrc={cropModalSrc} onCancel={cancelCropModal} onConfirm={confirmCrop} />
      ) : null}

      {modalOpen ? (
        <div
          className={styles.modalBackdrop}
          role="presentation"
          onClick={() => {
            setModalOpen(false);
            setPendingCoords(null);
          }}
        >
          <div
            className={styles.modal}
            role="dialog"
            aria-modal="true"
            aria-label="Chọn sản phẩm"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className={styles.modalTitle}>Gắn sản phẩm tại điểm đã chọn</h3>
            <input
              className={styles.search}
              placeholder="Tìm theo tên hoặc slug…"
              value={searchQ}
              onChange={(e) => {
                const v = e.target.value;
                setSearchQ(v);
                void searchProducts(v);
              }}
            />
            <div className={styles.hitList}>
              {searchBusy ? <p className={styles.muted}>Đang tìm…</p> : null}
              {!searchBusy && searchHits.length === 0 ? (
                <p className={styles.muted}>Không có kết quả</p>
              ) : null}
              {searchHits.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  className={styles.hitBtn}
                  onClick={() => confirmProduct(p)}
                >
                  <span>{p.nameVi}</span>
                  <span className={styles.muted}>{p.slug}</span>
                </button>
              ))}
            </div>
            <button type="button" className="btn btn--ghost adminCancelGhost" onClick={() => setModalOpen(false)}>
              Hủy
            </button>
          </div>
        </div>
      ) : null}
    </AdminPageLayout>
  );
}
