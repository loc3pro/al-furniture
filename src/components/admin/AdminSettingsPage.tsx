"use client";

import type { ThemeSettings } from "@prisma/client";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ThemeFormGate } from "@/app/admin/theme/ThemeFormGate";
import { AdminPageLayout } from "@/components/admin/AdminPageLayout";
import { AdminStickyPageHeader } from "@/components/admin/AdminStickyPageHeader";
import { ADMIN_STOREFRONT_THEME_FORM_ID } from "@/lib/admin-theme-form-constants";
import { useAdminAppearance, type AdminDensity } from "@/components/admin/AdminAppearanceContext";
import { showAdminToast } from "@/lib/admin-toast";
import { STOREFRONT_THEME_COLOR_FIELDS } from "@/lib/theme-storefront-fields";
import { STOREFRONT_THEME_PRESETS } from "@/lib/storefront-theme-presets";
import { Spinner } from "@/components/ui/Spinner";
import styles from "./AdminSettingsPage.module.scss";

const LS_VIEW_MODE = "admin-settings-view-mode";
const LS_SECTION_VIS = "admin-settings-section-visibility";

export type SettingsViewMode = "overview" | "admin" | "storefront" | "all";

type SectionVis = {
  presets: boolean;
  hexTable: boolean;
  themeDetail: boolean;
  fonts: boolean;
};

const DEFAULT_SECTION_VIS: SectionVis = {
  presets: true,
  hexTable: true,
  themeDetail: true,
  fonts: true,
};

const VIEW_MODES: { id: SettingsViewMode; label: string; shortHint: string }[] = [
  { id: "overview", label: "Tổng quan", shortHint: "Trạng thái đang bật · ảnh màu cửa hàng" },
  { id: "admin", label: "Khu admin", shortHint: "Sáng/Tối, gọn, giảm động — chỉ bạn thấy" },
  { id: "storefront", label: "Cửa hàng", shortHint: "Màu, logo, chân trang cho khách" },
  { id: "all", label: "Toàn bộ", shortHint: "Mọi mục + tuỳ chỉnh hiển thị" },
];

function safeParseVis(raw: string | null): SectionVis {
  if (!raw) return DEFAULT_SECTION_VIS;
  try {
    const j = JSON.parse(raw) as Partial<SectionVis>;
    return {
      presets: j.presets !== false,
      hexTable: j.hexTable !== false,
      themeDetail: j.themeDetail !== false,
      fonts: j.fonts !== false,
    };
  } catch {
    return DEFAULT_SECTION_VIS;
  }
}

function densityLabel(d: AdminDensity): string {
  return d === "compact" ? "Gọn hơn" : "Thoải mái";
}

export function AdminSettingsPage({ themeInitial }: { themeInitial: ThemeSettings | null }) {
  const router = useRouter();
  const { dark, setDark, ready, density, setDensity, motionReduced, setMotionReduced } = useAdminAppearance();
  const [presetBusy, setPresetBusy] = useState<string | null>(null);
  const themeResetRef = useRef<(() => void | Promise<void>) | null>(null);
  const [themeToolbar, setThemeToolbar] = useState({ isDirty: false, saving: false });
  const onThemeToolbarChange = useCallback((s: { isDirty: boolean; saving: boolean }) => {
    setThemeToolbar(s);
  }, []);

  const [viewMode, setViewMode] = useState<SettingsViewMode>("overview");
  const [sectionVis, setSectionVis] = useState<SectionVis>(DEFAULT_SECTION_VIS);
  const [uiPrefsReady, setUiPrefsReady] = useState(false);

  useEffect(() => {
    try {
      const vm = localStorage.getItem(LS_VIEW_MODE) as SettingsViewMode | null;
      if (vm && VIEW_MODES.some((m) => m.id === vm)) setViewMode(vm);
      setSectionVis(safeParseVis(localStorage.getItem(LS_SECTION_VIS)));
    } catch {
      /* ignore */
    }
    setUiPrefsReady(true);
  }, []);

  useEffect(() => {
    if (!uiPrefsReady) return;
    try {
      localStorage.setItem(LS_VIEW_MODE, viewMode);
    } catch {
      /* ignore */
    }
  }, [viewMode, uiPrefsReady]);

  useEffect(() => {
    if (!uiPrefsReady) return;
    try {
      localStorage.setItem(LS_SECTION_VIS, JSON.stringify(sectionVis));
    } catch {
      /* ignore */
    }
  }, [sectionVis, uiPrefsReady]);

  const showOverviewStrip = viewMode === "overview";
  const showAdminSection = viewMode === "admin" || viewMode === "all";
  const showStorefrontSections = viewMode === "storefront" || viewMode === "all";
  const showVisibilityToolbar = viewMode === "storefront" || viewMode === "all";
  const showOverviewIntro = viewMode === "overview";
  const mountThemeDetailForm =
    showStorefrontSections || (themeToolbar.isDirty && (viewMode === "overview" || viewMode === "admin"));

  const showThemeStickyActions =
    (viewMode === "storefront" ||
      viewMode === "all" ||
      ((viewMode === "overview" || viewMode === "admin") && themeToolbar.isDirty)) &&
    (sectionVis.themeDetail || themeToolbar.isDirty);

  const storefrontColors = useMemo(() => {
    const t = themeInitial;
    return {
      primaryColor: t?.primaryColor ?? "#2C2620",
      accentColor: t?.accentColor ?? "#8B7355",
      headerBg: t?.headerBg ?? "#F7F4EF",
      menuColor: t?.menuColor ?? "#1A1612",
      textOnPrimary: t?.textOnPrimary ?? "#FAF8F5",
      buttonHoverBg: t?.buttonHoverBg ?? "#EBE5DF",
      footerNote: t?.footerNote?.trim() || "—",
    };
  }, [themeInitial]);

  async function applyPreset(id: string, colors: (typeof STOREFRONT_THEME_PRESETS)[0]["colors"]) {
    setPresetBusy(id);
    try {
      const res = await fetch("/api/admin/theme", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(colors),
      });
      if (!res.ok) {
        showAdminToast("Không lưu được màu. Kiểm tra quyền admin hoặc thử lại.", "error");
        return;
      }
      showAdminToast("Đã áp dụng màu cho website khách. Mở / tải lại tab cửa hàng để xem.", "success");
      router.refresh();
    } catch {
      showAdminToast("Lỗi mạng — thử lại sau.", "error");
    } finally {
      setPresetBusy(null);
    }
  }

  function toggleSection(key: keyof SectionVis) {
    setSectionVis((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  return (
    <AdminPageLayout
      scrollClassName={styles.settingsScroll}
      header={
        <AdminStickyPageHeader className={styles.settingsStickyRoot}>
          <div className="adminPageHeaderRow">
            <div className={`adminPageHeaderMain ${styles.settingsPageStickyMain}`}>
              <h1 className={styles.title}>Cài đặt theme &amp; giao diện</h1>
            </div>
            <div className={`adminToolbar adminToolbar--end ${styles.settingsPageStickyActions}`}>
              {showThemeStickyActions ? (
                <>
                  <button
                    type="button"
                    className="btn btn--ghost adminToolbarBtn adminCancelGhost"
                    title="Đặt lại form theme về giá trị mặc định trong form (chưa gửi lên server nếu chưa bấm Lưu)"
                    onClick={() => void themeResetRef.current?.()}
                    disabled={themeToolbar.saving || !themeToolbar.isDirty}
                  >
                    Khôi phục
                  </button>
                  <button
                    type="submit"
                    form={ADMIN_STOREFRONT_THEME_FORM_ID}
                    className="btn btn--primary adminToolbarBtn"
                    title="Lưu theme & logo cho website khách"
                    disabled={themeToolbar.saving || !themeToolbar.isDirty}
                  >
                    {themeToolbar.saving ? (
                      <>
                        <Spinner size="sm" inheritColor label="Đang lưu theme" /> Đang lưu…
                      </>
                    ) : (
                      "Lưu"
                    )}
                  </button>
                </>
              ) : (
                <p className={styles.stickyToolbarHint}>
                  Mở chế độ <strong>Cửa hàng</strong> hoặc <strong>Toàn bộ</strong> và bật <strong>Chi tiết theme</strong>{" "}
                  để dùng hai nút lưu / khôi phục form.
                </p>
              )}
            </div>
          </div>
          <p className={styles.settingsPageStickyLead}>
            Chọn <strong>chế độ xem</strong> bên dưới — khu admin (Sáng/Tối, gọn, giảm động) lưu trên trình duyệt của
            bạn; theme cửa hàng lưu trên máy chủ khi bạn bấm <strong>Lưu theme</strong>.
          </p>
        </AdminStickyPageHeader>
      }
    >
      <nav className={styles.modeNav} aria-label="Chế độ cài đặt">
        <div className={styles.modeNavInner}>
          {VIEW_MODES.map((m) => (
            <button
              key={m.id}
              type="button"
              className={`${styles.modeTab} ${viewMode === m.id ? styles.modeTabActive : ""}`}
              onClick={() => setViewMode(m.id)}
              aria-pressed={viewMode === m.id}
            >
              <span className={styles.modeTabLabel}>{m.label}</span>
              <span className={styles.modeTabHint}>{m.shortHint}</span>
            </button>
          ))}
        </div>
      </nav>

      {showOverviewIntro ? (
        <p className={styles.modeContext}>
          Đang xem <strong>Tổng quan</strong> — đối chiếu nhanh giữa giao diện admin hiện tại và màu đang lưu cho cửa
          hàng (đồng bộ sau khi Lưu hoặc áp dụng bộ màu).
        </p>
      ) : null}

      {showVisibilityToolbar ? (
        <div className={styles.visBar} aria-label="Tuỳ chọn hiển thị phần cửa hàng">
          <span className={styles.visBarTitle}>Hiển thị trong chế độ này</span>
          <div className={styles.visToggles}>
            <label className={styles.visChip}>
              <input
                type="checkbox"
                checked={sectionVis.presets}
                onChange={() => toggleSection("presets")}
              />
              <span>Bộ gợi ý màu</span>
            </label>
            <label className={styles.visChip}>
              <input
                type="checkbox"
                checked={sectionVis.hexTable}
                onChange={() => toggleSection("hexTable")}
              />
              <span>Bảng mã hex</span>
            </label>
            <label className={styles.visChip}>
              <input
                type="checkbox"
                checked={sectionVis.themeDetail}
                onChange={() => toggleSection("themeDetail")}
              />
              <span>Chi tiết theme</span>
            </label>
            <label className={styles.visChip}>
              <input type="checkbox" checked={sectionVis.fonts} onChange={() => toggleSection("fonts")} />
              <span>Ghi chú font</span>
            </label>
          </div>
        </div>
      ) : null}

      {showOverviewStrip ? (
        <div className={styles.overviewGrid}>
          <section className={`${styles.card} ${styles.syncCard}`} aria-labelledby="ov-admin-heading">
            <div className={styles.syncCardHead}>
              <div>
                <h2 id="ov-admin-heading" className={styles.cardTitle}>
                  Khu quản trị — đang áp dụng cho bạn
                </h2>
                <p className={styles.cardSub}>Khớp với thanh menu và trang admin lúc này (lưu cục bộ trình duyệt).</p>
              </div>
            </div>
            <dl className={styles.syncDl}>
              <div className={styles.syncRow}>
                <dt>Giao diện</dt>
                <dd>{dark ? "Tối" : "Sáng"}</dd>
              </div>
              <div className={styles.syncRow}>
                <dt>Mật độ</dt>
                <dd>{densityLabel(density)}</dd>
              </div>
              <div className={styles.syncRow}>
                <dt>Chuyển động</dt>
                <dd>{motionReduced ? "Giảm (ít hiệu ứng)" : "Chuẩn"}</dd>
              </div>
            </dl>
            <p className={styles.syncFoot}>
              Chỉnh chi tiết trong mục <button type="button" className={styles.inlineLink} onClick={() => setViewMode("admin")}>Khu admin</button>.
            </p>
          </section>

          <section className={`${styles.card} ${styles.syncCard}`} aria-labelledby="ov-store-heading">
            <div className={styles.syncCardHead}>
              <div>
                <h2 id="ov-store-heading" className={styles.cardTitle}>
                  Website khách — màu đang lưu trên máy chủ
                </h2>
                <p className={styles.cardSub}>
                  Là bộ giá trị hiện tại trong CSDL (sau <strong>Lưu theme</strong> hoặc «Áp dụng bộ màu»). Khách thấy sau khi tải lại trang shop.
                </p>
              </div>
            </div>
            <div className={styles.livePalette} aria-hidden={false}>
              {STOREFRONT_THEME_COLOR_FIELDS.map((col) => (
                <div key={col.key} className={styles.liveSwatch}>
                  <span
                    className={styles.liveSwatchDot}
                    style={{ background: storefrontColors[col.key as keyof typeof storefrontColors] as string }}
                  />
                  <span className={styles.liveSwatchMeta}>
                    <span className={styles.liveSwatchLabel}>{col.shortLabel}</span>
                    <code className={styles.liveSwatchHex}>
                      {storefrontColors[col.key as keyof typeof storefrontColors] as string}
                    </code>
                  </span>
                </div>
              ))}
            </div>
            <p className={styles.footerNotePreview}>
              <strong>Chân trang:</strong>{" "}
              <span className={styles.footerNoteText}>{storefrontColors.footerNote}</span>
            </p>
            <p className={styles.syncFoot}>
              Sửa đầy đủ trong{" "}
              <button type="button" className={styles.inlineLink} onClick={() => setViewMode("storefront")}>
                Cửa hàng
              </button>{" "}
              hoặc <button type="button" className={styles.inlineLink} onClick={() => setViewMode("all")}>Toàn bộ</button>.
            </p>
          </section>
        </div>
      ) : null}

      {showAdminSection ? (
        <section className={styles.card} aria-labelledby="admin-theme-heading">
          <div className={styles.cardHead}>
            <div>
              <h2 id="admin-theme-heading" className={styles.cardTitle}>
                Giao diện khu quản trị (chỉ mình bạn)
              </h2>
              <p className={styles.cardSub}>
                Áp dụng ngay lên sidebar và vùng làm việc. Không ảnh hưởng website khách. Trạng thái hiện tại:{" "}
                <strong>{dark ? "Tối" : "Sáng"}</strong>, <strong>{densityLabel(density)}</strong>,{" "}
                <strong>{motionReduced ? "giảm chuyển động" : "hiệu ứng chuẩn"}</strong>.
              </p>
            </div>
          </div>

          <div className={styles.adminPrefsGrid}>
            <div className={styles.prefBlock}>
              <h3 className={styles.prefTitle}>Sáng / Tối</h3>
              <div className={styles.darkDemoVisual}>
                <div className={`${styles.modeBadge} ${!dark ? styles.modeBadgeOn : ""}`}>
                  <span>Sáng</span>
                  {!dark ? <span className={styles.modePill}>Đang dùng</span> : null}
                </div>
                <div className={styles.switchBlock}>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={dark}
                    aria-label={
                      dark
                        ? "Đang bật giao diện Tối. Nhấn để chuyển sang Sáng."
                        : "Đang giao diện Sáng. Nhấn để bật Tối."
                    }
                    disabled={!ready}
                    className={`${styles.bigSwitch} ${dark ? styles.bigSwitchOn : ""}`}
                    onClick={() => setDark(!dark)}
                  >
                    <span className={styles.bigSwitchKnob} aria-hidden />
                  </button>
                  <span className={styles.switchHint}>{dark ? "Đang bật: Tối" : "Đang bật: Sáng"}</span>
                </div>
                <div className={`${styles.modeBadge} ${dark ? styles.modeBadgeOn : ""}`}>
                  <span>Tối</span>
                  {dark ? <span className={styles.modePill}>Đang dùng</span> : null}
                </div>
              </div>
            </div>

            <div className={styles.prefBlock}>
              <h3 className={styles.prefTitle}>Mật độ hiển thị</h3>
              <p className={styles.prefLead}>Chữ và khoảng cách trong admin — chọn <strong>Gọn</strong> khi cần xem nhiều dòng.</p>
              <div className={styles.segmented}>
                <button
                  type="button"
                  className={`${styles.segBtn} ${density === "comfortable" ? styles.segBtnOn : ""}`}
                  onClick={() => setDensity("comfortable")}
                >
                  Thoải mái
                </button>
                <button
                  type="button"
                  className={`${styles.segBtn} ${density === "compact" ? styles.segBtnOn : ""}`}
                  onClick={() => setDensity("compact")}
                >
                  Gọn hơn
                </button>
              </div>
            </div>

            <div className={styles.prefBlock}>
              <h3 className={styles.prefTitle}>Hiệu ứng chuyển động</h3>
              <p className={styles.prefLead}>
                Giảm hover/transform trong admin. Nếu chưa chỉnh tay, hệ thống có thể theo cài đặt «Giảm chuyển động» của
                máy.
              </p>
              <label className={styles.motionRow}>
                <input
                  type="checkbox"
                  checked={motionReduced}
                  onChange={(e) => setMotionReduced(e.target.checked)}
                />
                <span>Giảm chuyển động (ít hiệu ứng)</span>
              </label>
            </div>
          </div>

          <ul className={styles.tipList}>
            <li>
              <strong>Đồng bộ:</strong> mở hai tab admin — đổi Sáng/Tối ở một tab, tab kia cập nhật nhờ lưu trữ chung.
            </li>
            <li>
              Trình duyệt có thể phóng to chữ (<kbd className={styles.kbd}>Ctrl</kbd> + <kbd className={styles.kbd}>+</kbd>
              ) — độc lập với các tuỳ chọn ở đây.
            </li>
          </ul>
        </section>
      ) : null}

      {showStorefrontSections && sectionVis.presets ? (
        <section className={styles.card} aria-labelledby="store-colors-heading">
          <div className={styles.cardHead}>
            <div>
              <h2 id="store-colors-heading" className={styles.cardTitle}>
                Màu website khách (cửa hàng online)
              </h2>
              <p className={styles.cardSub}>
                Bấm <strong>Áp dụng</strong> để ghi nhanh lên máy chủ. Logo &amp; chi tiết từng ô màu nằm ở{" "}
                <strong>Chi tiết theme</strong> (bật trong thanh «Hiển thị» nếu đang ẩn).
              </p>
            </div>
          </div>

          <div className={styles.presetGrid}>
            {STOREFRONT_THEME_PRESETS.map((p) => (
              <article key={p.id} className={styles.presetCard}>
                <div className={styles.presetStripe} aria-hidden>
                  <span style={{ background: p.colors.primaryColor }} />
                  <span style={{ background: p.colors.accentColor }} />
                  <span style={{ background: p.colors.headerBg }} />
                  <span style={{ background: p.colors.menuColor }} />
                  <span style={{ background: p.colors.textOnPrimary }} />
                  <span style={{ background: p.colors.buttonHoverBg }} />
                </div>
                <h3 className={styles.presetName}>{p.name}</h3>
                <p className={styles.presetDesc}>{p.description}</p>
                <button
                  type="button"
                  className={`btn btn--primary ${styles.presetBtn}`}
                  disabled={presetBusy !== null}
                  title="Áp dụng bộ màu này lên website khách"
                  onClick={() => void applyPreset(p.id, p.colors)}
                >
                  {presetBusy === p.id ? (
                    <>
                      <Spinner size="sm" inheritColor label="Đang lưu" /> Đang áp dụng…
                    </>
                  ) : (
                    "Dùng"
                  )}
                </button>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      {showStorefrontSections && sectionVis.hexTable ? (
        <section className={styles.card} aria-labelledby="hex-table-heading">
          <div className={styles.cardHead}>
            <div>
              <h2 id="hex-table-heading" className={styles.cardTitle}>
                Bảng mã màu đầy đủ
              </h2>
              <p className={styles.cardSub}>Đối chiếu hex với form chi tiết hoặc áp dụng trực tiếp từ cột thao tác.</p>
            </div>
          </div>
          <h3 className={styles.tableHeading}>Các biến CSS trên cửa hàng</h3>
          <p className={styles.tableLead}>
            Mỗi hàng là một bộ đã lưu sẵn — cùng payload với nút «Áp dụng» trên thẻ gợi ý.
          </p>
          <div className={styles.presetTableWrap}>
            <table className={styles.presetTable}>
              <thead>
                <tr>
                  <th scope="col" className={styles.presetTh}>
                    Bộ màu
                  </th>
                  {STOREFRONT_THEME_COLOR_FIELDS.map((col) => (
                    <th key={col.key} scope="col" className={styles.presetTh} title={col.hint}>
                      {col.shortLabel}
                    </th>
                  ))}
                  <th scope="col" className={`${styles.presetTh} ${styles.presetThAction}`}>
                    Thao tác
                  </th>
                </tr>
              </thead>
              <tbody>
                {STOREFRONT_THEME_PRESETS.map((p) => (
                  <tr key={p.id}>
                    <td className={styles.presetTd}>
                      <strong>{p.name}</strong>
                      <div className={styles.presetTdDesc}>{p.description}</div>
                    </td>
                    {STOREFRONT_THEME_COLOR_FIELDS.map((col) => {
                      const hex = p.colors[col.key];
                      return (
                        <td key={col.key} className={styles.presetTd}>
                          <span className={styles.swatchPair}>
                            <span
                              className={styles.swatch}
                              style={{ background: hex }}
                              title={hex}
                              aria-hidden
                            />
                            <code className={styles.hexCode}>{hex}</code>
                          </span>
                        </td>
                      );
                    })}
                    <td className={`${styles.presetTd} ${styles.presetTdAction}`}>
                      <button
                        type="button"
                        className={`btn btn--ghost ${styles.tableApplyBtn}`}
                        disabled={presetBusy !== null}
                        title="Áp dụng bộ màu này vào form"
                        onClick={() => void applyPreset(p.id, p.colors)}
                      >
                        {presetBusy === p.id ? <Spinner size="sm" inheritColor label="Đang lưu" /> : "Dùng"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      {mountThemeDetailForm ? (
        <section
          className={styles.themeDetailSection}
          id="theme-storefront-detail"
          hidden={!showStorefrontSections || !sectionVis.themeDetail}
          aria-hidden={!showStorefrontSections || !sectionVis.themeDetail}
        >
          <div className={styles.themeDetailBar}>
            <h2 className={styles.themeDetailHeading}>Chi tiết theme cửa hàng</h2>
            <p className={styles.themeDetailLead}>
              Form đồng bộ với biến CSS trên layout khách và ảnh logo/favicon — nút Lưu trên đầu trang áp dụng khi có thay đổi.
              Ẩn mục này bằng tuỳ chọn hiển thị vẫn <strong>giữ nội dung đang sửa</strong> cho đến khi tải lại trang.
            </p>
          </div>
          <ThemeFormGate initial={themeInitial} onToolbarChange={onThemeToolbarChange} resetRef={themeResetRef} />
        </section>
      ) : null}

      {showStorefrontSections && sectionVis.fonts ? (
        <section className={`${styles.card} ${styles.cardMuted}`} aria-labelledby="fonts-heading">
          <div className={styles.cardHead}>
            <div>
              <h2 id="fonts-heading" className={styles.cardTitle}>
                Chữ (font) trên website khách
              </h2>
              <p className={styles.cardSub}>
                Hiện website dùng font hệ thống tối ưu mobile / desktop. Đổi font toàn site cần chỉnh mã nguồn hoặc theme
                — liên hệ kỹ thuật nếu cần font thương hiệu.
              </p>
            </div>
          </div>
          <div className={styles.callout}>
            <div>
              <strong>Mẹo:</strong> trên Chrome / Edge, <kbd className={styles.kbd}>Ctrl</kbd> +{" "}
              <kbd className={styles.kbd}>+</kbd> phóng to chữ toàn trang khách;{" "}
              <kbd className={styles.kbd}>Ctrl</kbd> + <kbd className={styles.kbd}>0</kbd> về mặc định.
            </div>
          </div>
        </section>
      ) : null}

      {showVisibilityToolbar && !sectionVis.presets && !sectionVis.hexTable && !sectionVis.themeDetail && !sectionVis.fonts ? (
        <div className={styles.allHiddenHint} role="status">
          <div>
            <strong>Bạn đã ẩn toàn bộ mục cửa hàng.</strong> Bật lại ít nhất một ô trong «Hiển thị trong chế độ này» hoặc
            chuyển sang <button type="button" className={styles.inlineLink} onClick={() => setViewMode("overview")}>Tổng quan</button>.
          </div>
        </div>
      ) : null}
    </AdminPageLayout>
  );
}
