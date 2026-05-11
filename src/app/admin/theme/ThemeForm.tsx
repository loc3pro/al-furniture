"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState, type MutableRefObject } from "react";
import type { ThemeSettings } from "@prisma/client";
import { ADMIN_STOREFRONT_THEME_FORM_ID } from "@/lib/admin-theme-form-constants";
import { AdminDeferredImageField } from "@/components/admin/AdminDeferredImageField";
import { deleteAdminCloudinaryUrls, uploadAdminImageFile } from "@/lib/admin-upload-client";
import { showAdminToast } from "@/lib/admin-toast";
import {
  STOREFRONT_THEME_FACTORY_DEFAULTS,
  STOREFRONT_THEME_COLOR_FIELDS,
  type ThemeColorKey,
} from "@/lib/theme-storefront-fields";
import { stableValueJson } from "@/lib/form-dirty-snapshot";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import styles from "./ThemeForm.module.scss";

const FACTORY = STOREFRONT_THEME_FACTORY_DEFAULTS;

function safeHex6(raw: string, fallback: string): string {
  const t = raw.trim();
  const m6 = t.match(/^#?([0-9A-Fa-f]{6})$/i);
  if (m6) return `#${m6[1]!.toUpperCase()}`;
  const m3 = t.match(/^#?([0-9A-Fa-f]{3})$/i);
  if (m3) {
    const s = m3[1]!;
    return `#${s[0]}${s[0]}${s[1]}${s[1]}${s[2]}${s[2]}`.toUpperCase();
  }
  return fallback;
}

export type ThemeFormProps = {
  initial: ThemeSettings | null;
  onToolbarChange?: (state: { isDirty: boolean; saving: boolean }) => void;
  resetRef?: MutableRefObject<(() => void | Promise<void>) | null>;
};

export function ThemeForm({ initial, onToolbarChange, resetRef }: ThemeFormProps) {
  const askConfirm = useConfirm();
  const router = useRouter();
  const [f, setF] = useState({
    primaryColor: initial?.primaryColor ?? FACTORY.primaryColor,
    accentColor: initial?.accentColor ?? FACTORY.accentColor,
    headerBg: initial?.headerBg ?? FACTORY.headerBg,
    menuColor: initial?.menuColor ?? FACTORY.menuColor,
    textOnPrimary: initial?.textOnPrimary ?? FACTORY.textOnPrimary,
    buttonHoverBg: initial?.buttonHoverBg ?? FACTORY.buttonHoverBg,
    footerNote: initial?.footerNote ?? FACTORY.footerNote,
    brandText: initial?.brandText ?? FACTORY.brandText,
    headerShowBrandBesideLogo: initial?.headerShowBrandBesideLogo ?? FACTORY.headerShowBrandBesideLogo,
    headerStoreName: initial?.headerStoreName ?? FACTORY.headerStoreName,
    logoUrl: initial?.logoUrl ?? FACTORY.logoUrl,
    logoDarkUrl: initial?.logoDarkUrl ?? FACTORY.logoDarkUrl,
    faviconUrl: initial?.faviconUrl ?? FACTORY.faviconUrl,
    headerHotlineLabel: initial?.headerHotlineLabel ?? FACTORY.headerHotlineLabel,
    headerHotlinePhone: initial?.headerHotlinePhone ?? FACTORY.headerHotlinePhone,
    headerShippingLine1: initial?.headerShippingLine1 ?? FACTORY.headerShippingLine1,
    headerShippingLine2: initial?.headerShippingLine2 ?? FACTORY.headerShippingLine2,
  });
  const [pendingLogo, setPendingLogo] = useState<File | null>(null);
  const [pendingLogoDark, setPendingLogoDark] = useState<File | null>(null);
  const [pendingFavicon, setPendingFavicon] = useState<File | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const currentSnap = useMemo(
    () =>
      stableValueJson({
        ...f,
        pendingLogo: !!pendingLogo,
        pendingLogoDark: !!pendingLogoDark,
        pendingFavicon: !!pendingFavicon,
      }),
    [f, pendingLogo, pendingLogoDark, pendingFavicon],
  );
  const savedSnap = useMemo(
    () =>
      stableValueJson({
        primaryColor: initial?.primaryColor ?? FACTORY.primaryColor,
        accentColor: initial?.accentColor ?? FACTORY.accentColor,
        headerBg: initial?.headerBg ?? FACTORY.headerBg,
        menuColor: initial?.menuColor ?? FACTORY.menuColor,
        textOnPrimary: initial?.textOnPrimary ?? FACTORY.textOnPrimary,
        buttonHoverBg: initial?.buttonHoverBg ?? FACTORY.buttonHoverBg,
        footerNote: initial?.footerNote ?? FACTORY.footerNote,
        brandText: initial?.brandText ?? FACTORY.brandText,
        headerShowBrandBesideLogo: initial?.headerShowBrandBesideLogo ?? FACTORY.headerShowBrandBesideLogo,
        headerStoreName: initial?.headerStoreName ?? FACTORY.headerStoreName,
        logoUrl: initial?.logoUrl ?? FACTORY.logoUrl,
        logoDarkUrl: initial?.logoDarkUrl ?? FACTORY.logoDarkUrl,
        faviconUrl: initial?.faviconUrl ?? FACTORY.faviconUrl,
        headerHotlineLabel: initial?.headerHotlineLabel ?? FACTORY.headerHotlineLabel,
        headerHotlinePhone: initial?.headerHotlinePhone ?? FACTORY.headerHotlinePhone,
        headerShippingLine1: initial?.headerShippingLine1 ?? FACTORY.headerShippingLine1,
        headerShippingLine2: initial?.headerShippingLine2 ?? FACTORY.headerShippingLine2,
        pendingLogo: false,
        pendingLogoDark: false,
        pendingFavicon: false,
      }),
    [initial],
  );
  const isDirty = currentSnap !== savedSnap;

  useEffect(() => {
    onToolbarChange?.({ isDirty, saving });
  }, [isDirty, saving, onToolbarChange]);

  const resetToFactory = useCallback(async () => {
    if (
      !(await askConfirm(
        "Đặt lại form về theme mặc định (màu gốc, chữ thương hiệu/chân trang, xóa logo/favicon trong form)? Bạn cần bấm Lưu để gửi lên cửa hàng.",
      ))
    ) {
      return;
    }
    setF({ ...FACTORY });
    setPendingLogo(null);
    setPendingLogoDark(null);
    setPendingFavicon(null);
    setMsg(null);
    showAdminToast("Đã khôi phục form — bấm Lưu để đồng bộ website khách", "success");
  }, [askConfirm]);

  useEffect(() => {
    if (!resetRef) return;
    resetRef.current = resetToFactory;
    return () => {
      resetRef.current = null;
    };
  }, [resetRef, resetToFactory]);

  function setColor(key: ThemeColorKey, hex: string) {
    setF((prev) => ({ ...prev, [key]: safeHex6(hex, FACTORY[key]) }));
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    setSaving(true);
    const staged: string[] = [];
    try {
      let logoUrl = f.logoUrl;
      let logoDarkUrl = f.logoDarkUrl;
      let faviconUrl = f.faviconUrl;
      if (pendingLogo) {
        logoUrl = await uploadAdminImageFile(pendingLogo, "theme");
        staged.push(logoUrl);
      }
      if (pendingLogoDark) {
        logoDarkUrl = await uploadAdminImageFile(pendingLogoDark, "theme");
        staged.push(logoDarkUrl);
      }
      if (pendingFavicon) {
        faviconUrl = await uploadAdminImageFile(pendingFavicon, "theme");
        staged.push(faviconUrl);
      }
      const res = await fetch("/api/admin/theme", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...f,
          primaryColor: safeHex6(f.primaryColor, FACTORY.primaryColor),
          accentColor: safeHex6(f.accentColor, FACTORY.accentColor),
          headerBg: safeHex6(f.headerBg, FACTORY.headerBg),
          menuColor: safeHex6(f.menuColor, FACTORY.menuColor),
          textOnPrimary: safeHex6(f.textOnPrimary, FACTORY.textOnPrimary),
          buttonHoverBg: safeHex6(f.buttonHoverBg, FACTORY.buttonHoverBg),
          logoUrl: logoUrl || null,
          logoDarkUrl: logoDarkUrl || null,
          faviconUrl: faviconUrl || null,
          brandText: f.brandText?.trim() || null,
          headerShowBrandBesideLogo: f.headerShowBrandBesideLogo,
          headerStoreName: f.headerStoreName?.trim() || null,
          footerNote: f.footerNote || null,
          headerHotlineLabel: f.headerHotlineLabel.trim(),
          headerHotlinePhone: f.headerHotlinePhone.trim(),
          headerShippingLine1: f.headerShippingLine1.trim(),
          headerShippingLine2: f.headerShippingLine2.trim(),
        }),
      });
      if (!res.ok) {
        await deleteAdminCloudinaryUrls(staged);
        setMsg("Lưu thất bại");
        showAdminToast("Lưu thất bại", "error");
        return;
      }
      setPendingLogo(null);
      setPendingLogoDark(null);
      setPendingFavicon(null);
      setF((prev) => ({
        ...prev,
        logoUrl: logoUrl ?? "",
        logoDarkUrl: logoDarkUrl ?? "",
        faviconUrl: faviconUrl ?? "",
      }));
      setMsg(null);
      showAdminToast("Đã lưu — tải lại trang cửa hàng để xem màu & logo mới");
      router.refresh();
    } catch {
      await deleteAdminCloudinaryUrls(staged);
      setMsg("Lưu thất bại");
      showAdminToast("Lưu thất bại", "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className={styles.themeFormCard}>
      <form id={ADMIN_STOREFRONT_THEME_FORM_ID} className={styles.wrap} onSubmit={(e) => void save(e)}>
          <div className={styles.syncNote} role="status">
            <div>
              <strong>Đồng bộ với website khách</strong>
              <p style={{ margin: "0.35rem 0 0" }}>
                Mỗi lần bấm Lưu, màu và ảnh được ghi vào cùng bộ dữ liệu mà trang cửa hàng đọc (CSS biến trên toàn site,
                logo trên header). Mở tab shop và <strong>tải lại (F5)</strong> để thấy thay đổi.
              </p>
            </div>
          </div>

          <div className={styles.section} aria-labelledby="tf-colors">
            <h3 id="tf-colors" className={styles.sectionTitle}>
              Màu sắc cửa hàng
            </h3>
            <p className={styles.sectionLead}>
              Dùng bảng mã #RRGGBB. Chọn màu bằng ô vuông hoặc dán mã từ bảng gợi ý ở trên. Các biến bên dưới trùng với
              giao diện thật.
            </p>
            <div className={styles.colorGrid}>
              {STOREFRONT_THEME_COLOR_FIELDS.map((row) => {
                const k = row.key;
                const fallback = FACTORY[k];
                const v = f[k];
                const picker = safeHex6(v, fallback);
                return (
                  <div key={k} className={styles.colorRow}>
                    <div className={styles.colorTop}>
                      <label className={styles.label} htmlFor={`tf-color-${k}`}>
                        {row.label}
                      </label>
                      <p className={styles.hint}>{row.hint}</p>
                      <code className={styles.varCode}>{row.cssVar}</code>
                      <p className={styles.usedFor}>Dùng cho: {row.usedFor}</p>
                    </div>
                    <div className={styles.colorInputs}>
                      <input
                        id={`tf-pick-${k}`}
                        className={styles.colorPicker}
                        type="color"
                        value={picker}
                        onChange={(e) => setColor(k, e.target.value)}
                        disabled={saving}
                        aria-label={`Chọn ${row.label}`}
                      />
                      <input
                        id={`tf-color-${k}`}
                        className={styles.hexInput}
                        type="text"
                        value={v}
                        onChange={(e) => setF({ ...f, [k]: e.target.value })}
                        onBlur={(e) => setColor(k, e.target.value)}
                        placeholder="#RRGGBB"
                        autoComplete="off"
                        spellCheck={false}
                        disabled={saving}
                        aria-label={`Mã hex ${row.label}`}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className={styles.section} aria-labelledby="tf-assets">
            <h3 id="tf-assets" className={styles.sectionTitle}>
              Logo &amp; biểu tượng trình duyệt
            </h3>
            <p className={styles.sectionLead}>
              Ảnh chỉ tải lên khi bấm Lưu. Logo sáng nền dùng trên thanh header; logo tối dành khi bạn bật giao diện tối
              (nếu triển khai sau).
            </p>
            <div className={styles.fieldBlock}>
              <label className={styles.label} htmlFor="tf-brandtext">
                Chữ thương hiệu khi chưa có logo
              </label>
              <p className={styles.hint}>
                Khi chưa có logo: hiển thị trên header thay ảnh (mặc định «{FACTORY.footerNote}» nếu để trống). Khi có
                logo: có thể bật tùy chọn bên dưới để dùng cùng một ô chữ làm chữ cạnh logo (shop + admin).
              </p>
              <input
                id="tf-brandtext"
                type="text"
                className={styles.textInput}
                value={f.brandText}
                onChange={(e) => setF({ ...f, brandText: e.target.value })}
                placeholder="Furniture ECM"
                disabled={saving}
                autoComplete="off"
              />
            </div>
            <div className={styles.fieldBlock}>
              <label className={styles.checkboxRow}>
                <input
                  type="checkbox"
                  checked={f.headerShowBrandBesideLogo}
                  onChange={(e) => setF({ ...f, headerShowBrandBesideLogo: e.target.checked })}
                  disabled={saving}
                />
                <span>
                  Hiển thị chữ thương hiệu <strong>cạnh logo</strong> (header cửa hàng &amp; admin) khi đã có logo và
                  đã nhập chữ ở trên — nếu để trống chữ thì chỉ hiện logo.
                </span>
              </label>
            </div>
            <div className={styles.fieldBlock}>
              <label className={styles.label} htmlFor="tf-headerstore">
                Tên cửa hàng
              </label>
              <p className={styles.hint}>
                Hiển thị cạnh logo trên <strong>sidebar admin</strong> (mặc định «AL Furniture» nếu để trống) và trên{" "}
                <strong>header website khách</strong> khi bật hiển thị tên.
              </p>
              <input
                id="tf-headerstore"
                type="text"
                className={styles.textInput}
                value={f.headerStoreName}
                onChange={(e) => setF({ ...f, headerStoreName: e.target.value })}
                placeholder="AL Furniture"
                disabled={saving}
                maxLength={120}
                autoComplete="off"
              />
            </div>
            <div className={styles.fieldBlock}>
              <AdminDeferredImageField
                label="Logo (nền sáng / mặc định)"
                savedUrl={f.logoUrl}
                pendingFile={pendingLogo}
                onPickFile={setPendingLogo}
                onClearSaved={() => {
                  setF((p) => ({ ...p, logoUrl: "" }));
                  setPendingLogo(null);
                }}
                disabled={saving}
                hint="Hiển thị bên cạnh menu trên website khách. Định dạng PNG, SVG, hoặc WebP nền trong suốt."
                emptyTitle="Chọn logo"
                acceptSummary="PNG, SVG hoặc WebP (nền trong suốt)."
                maxSizeHint="Khuyến nghị dưới 2 MB."
              />
            </div>
            <div className={styles.fieldBlock}>
              <AdminDeferredImageField
                label="Logo (nền tối) — tùy chọn"
                savedUrl={f.logoDarkUrl}
                pendingFile={pendingLogoDark}
                onPickFile={setPendingLogoDark}
                onClearSaved={() => {
                  setF((p) => ({ ...p, logoDarkUrl: "" }));
                  setPendingLogoDark(null);
                }}
                disabled={saving}
                hint="Dùng khi header/dark mode cần bản logo sáng màu. Có thể bỏ trống."
                emptyTitle="Chọn logo nền tối"
                acceptSummary="PNG, SVG hoặc WebP."
                maxSizeHint="Khuyến nghị dưới 2 MB."
              />
            </div>
            <div className={styles.fieldBlock}>
              <AdminDeferredImageField
                label="Favicon"
                savedUrl={f.faviconUrl}
                pendingFile={pendingFavicon}
                onPickFile={setPendingFavicon}
                onClearSaved={() => {
                  setF((p) => ({ ...p, faviconUrl: "" }));
                  setPendingFavicon(null);
                }}
                disabled={saving}
                hint="Icon tab trình duyệt. Nên 32×32 hoặc 64×64 px, PNG/ICO."
                emptyTitle="Chọn favicon"
                acceptSummary="PNG, ICO hoặc WebP — kích thước nhỏ."
                maxSizeHint="Khuyến nghị dưới 500 KB."
              />
            </div>
          </div>

          <div className={styles.section} aria-labelledby="tf-header-promo">
            <h3 id="tf-header-promo" className={styles.sectionTitle}>
              Header — hotline &amp; vận chuyển
            </h3>
            <p className={styles.sectionLead}>
              Hotline góc phải thanh trên; hai dòng chữ bên phải menu (dưới logo). Thanh nổi «Gọi» dùng cùng số điện thoại.
            </p>
            <div className={styles.fieldGrid}>
              <div className={styles.fieldBlock}>
                <label className={styles.label} htmlFor="tf-hotline-label">
                  Nhãn hotline (dòng nhỏ phía trên số)
                </label>
                <input
                  id="tf-hotline-label"
                  type="text"
                  className={styles.textInput}
                  value={f.headerHotlineLabel}
                  onChange={(e) => setF({ ...f, headerHotlineLabel: e.target.value })}
                  placeholder="Hotline"
                  disabled={saving}
                  autoComplete="off"
                  maxLength={80}
                />
              </div>
              <div className={styles.fieldBlock}>
                <label className={styles.label} htmlFor="tf-hotline-phone">
                  Số điện thoại hiển thị
                </label>
                <p className={styles.hint}>Link gọi tự lấy chữ số (có thể gõ khoảng trắng để trình bày).</p>
                <input
                  id="tf-hotline-phone"
                  type="text"
                  className={styles.textInput}
                  value={f.headerHotlinePhone}
                  onChange={(e) => setF({ ...f, headerHotlinePhone: e.target.value })}
                  placeholder="0931 799 744"
                  disabled={saving}
                  autoComplete="off"
                  maxLength={48}
                />
              </div>
              <div className={styles.fieldBlock}>
                <label className={styles.label} htmlFor="tf-ship-line1">
                  Dòng vận chuyển 1 (menu phải)
                </label>
                <input
                  id="tf-ship-line1"
                  type="text"
                  className={styles.textInput}
                  value={f.headerShippingLine1}
                  onChange={(e) => setF({ ...f, headerShippingLine1: e.target.value })}
                  placeholder="Miễn phí vận chuyển HCM"
                  disabled={saving}
                  autoComplete="off"
                  maxLength={200}
                />
              </div>
              <div className={styles.fieldBlock}>
                <label className={styles.label} htmlFor="tf-ship-line2">
                  Dòng vận chuyển 2 (nhỏ hơn, dưới dòng 1)
                </label>
                <input
                  id="tf-ship-line2"
                  type="text"
                  className={styles.textInput}
                  value={f.headerShippingLine2}
                  onChange={(e) => setF({ ...f, headerShippingLine2: e.target.value })}
                  placeholder="Hóa đơn trên 2.000.000₫"
                  disabled={saving}
                  autoComplete="off"
                  maxLength={200}
                />
              </div>
            </div>
          </div>

          <div className={styles.section} aria-labelledby="tf-footer">
            <h3 id="tf-footer" className={styles.sectionTitle}>
              Chân trang
            </h3>
            <p className={styles.sectionLead}>
              Một dòng ghi chú (copyright, tên công ty) xuất hiện ở cuối mỗi trang cửa hàng.
            </p>
            <div className={styles.fieldBlock}>
              <label className={styles.label} htmlFor="tf-footernote">
                Ghi chú chân trang
              </label>
              <textarea
                id="tf-footernote"
                className={styles.textArea}
                value={f.footerNote}
                onChange={(e) => setF({ ...f, footerNote: e.target.value })}
                rows={3}
                disabled={saving}
              />
            </div>
          </div>

          {msg ? <p className="muted">{msg}</p> : null}
      </form>
    </div>
  );
}
