"use client";

import Link from "next/link";
import { ArrowBigUp, ArrowLeft, Gift, Sparkles, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useShopSession } from "@/components/session/ShopSessionProvider";
import { showAppToast } from "@/lib/app-toast";
import { spinDiscountLabelVi } from "@/lib/spin-discount-label";
import styles from "./LuckyWheelPage.module.scss";

const FULL_SPINS = 6;

async function burstConfetti() {
  const confetti = (await import("canvas-confetti")).default;
  const z = 2500;
  const base = { zIndex: z, disableForReducedMotion: true } as const;
  confetti({ ...base, particleCount: 55, spread: 46, startVelocity: 48, origin: { y: 0.62 }, scalar: 1.05 });
  window.setTimeout(() => {
    confetti({ ...base, particleCount: 80, spread: 78, startVelocity: 38, origin: { y: 0.58 }, scalar: 0.95 });
  }, 110);
  window.setTimeout(() => {
    confetti({ ...base, particleCount: 45, spread: 100, ticks: 220, origin: { y: 0.68 }, gravity: 0.85 });
  }, 220);
}

type Seg = { id: string; label: string; color: string };

type CouponRow = {
  id: string;
  code: string;
  label: string;
  discountType: string;
  discountValue: number;
  discountMaxVnd?: number;
  minOrderAmount: number;
  issuedAt: string;
  expiresAt: string;
  usedAt: string | null;
};

export function LuckyWheelPageClient() {
  const { user } = useShopSession();
  const [segments, setSegments] = useState<Seg[]>([]);
  const [bannerTitle, setBannerTitle] = useState("Vòng quay may mắn");
  const [eventOn, setEventOn] = useState(false);
  const [spinning, setSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [result, setResult] = useState<{
    code: string;
    label: string;
    expiresAt: string;
    discountType: string;
    discountValue: number;
    discountMaxVnd: number;
  } | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [history, setHistory] = useState<CouponRow[]>([]);
  const [celebrateOpen, setCelebrateOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!celebrateOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setCelebrateOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [celebrateOpen]);
  const loadPublic = useCallback(async () => {
    const r = await fetch("/api/public/spin-wheel");
    const d = (await r.json()) as {
      active?: boolean;
      bannerTitle?: string;
      segments?: Seg[];
    };
    setEventOn(Boolean(d.active));
    if (typeof d.bannerTitle === "string") setBannerTitle(d.bannerTitle);
    setSegments(Array.isArray(d.segments) ? d.segments : []);
  }, []);

  const loadHistory = useCallback(async () => {
    const r = await fetch("/api/account/spin-coupons", { credentials: "same-origin" });
    if (r.status === 401) {
      setHistory([]);
      return;
    }
    const d = (await r.json()) as { coupons?: CouponRow[] };
    setHistory(Array.isArray(d.coupons) ? d.coupons : []);
  }, []);

  useEffect(() => {
    void loadPublic();
  }, [loadPublic]);

  useEffect(() => {
    if (user) void loadHistory();
  }, [user, loadHistory]);

  const gradient = useMemo(() => {
    if (segments.length === 0) return "conic-gradient(from 0deg, #e2e8f0 0% 100%)";
    const parts = segments.map((s, i) => `${s.color} ${(i / segments.length) * 100}% ${((i + 1) / segments.length) * 100}%`);
    /** `from 0deg`: bắt đầu từ 12h, khớp công thức góc trên server & kim dưới (180°) */
    return `conic-gradient(from 0deg at 50% 50%, ${parts.join(", ")})`;
  }, [segments]);

  /** Góc dừng khớp kim ở 6h — tính từ winIndex + prev để mọi lần quay đều đúng */
  const applySpinRotation = useCallback((winIndex: number, prevAngle: number) => {
    const nSeg = Math.max(1, segments.length);
    const slice = 360 / nSeg;
    const centerDeg = winIndex * slice + slice / 2;
    const targetMod = ((180 - (centerDeg % 360)) + 360) % 360;
    const prevMod = ((prevAngle % 360) + 360) % 360;
    const adjust = (targetMod - prevMod + 360) % 360;
    return prevAngle + FULL_SPINS * 360 + adjust;
  }, [segments.length]);

  async function onSpin() {
    if (spinning || segments.length === 0) return;
    setErr(null);
    setResult(null);
    setCelebrateOpen(false);
    setSpinning(true);
    try {
      const r = await fetch("/api/spin-wheel/spin", { method: "POST", credentials: "same-origin" });
      const d = (await r.json()) as {
        error?: string;
        winIndex?: number;
        code?: string;
        label?: string;
        expiresAt?: string;
        discountType?: string;
        discountValue?: number;
        discountMaxVnd?: number;
      };
      if (!r.ok) {
        const em = d.error ?? "Không quay được.";
        setErr(em);
        showAppToast(em, "error");
        setSpinning(false);
        return;
      }
      const winIdx = typeof d.winIndex === "number" && d.winIndex >= 0 ? d.winIndex : 0;
      setRotation((prev) => applySpinRotation(winIdx, prev));
      window.setTimeout(() => {
        setSpinning(false);
        setResult({
          code: d.code ?? "",
          label: d.label ?? "",
          expiresAt: d.expiresAt ?? "",
          discountType: d.discountType ?? "PERCENT",
          discountValue: d.discountValue ?? 0,
          discountMaxVnd: typeof d.discountMaxVnd === "number" ? d.discountMaxVnd : 0,
        });
        setCelebrateOpen(true);
        void burstConfetti();
        void loadHistory();
      }, 4200);
    } catch {
      setErr("Lỗi mạng");
      showAppToast("Lỗi mạng", "error");
      setSpinning(false);
    }
  }

  const loginNext = "/lucky-wheel";

  return (
    <div className={styles.page}>
      <div className={styles.mobileGate}>
        <p className={styles.mobileGateTitle}>Vòng quay may mắn</p>
        <p className={styles.mobileGateText}>
          Trang sự kiện chỉ hiển thị trên màn hình lớn (máy tính / tablet ngang). Vui lòng truy cập bằng trình duyệt trên
          desktop.
        </p>
        <Link href="/" className={styles.mobileGateCta}>
          Về trang chủ
        </Link>
      </div>

      <div className={`container ${styles.inner} ${styles.desktopShell}`}>
        <header className={styles.head}>
          <div className={styles.heroRow}>
            <div className={styles.heroBadge}>
              <Sparkles size={16} aria-hidden />
              Sự kiện
            </div>
            <span className={styles.couponBadge}>Voucher</span>
          </div>
          <h1 className={styles.title}>{bannerTitle}</h1>
          <p className={styles.lead}>
            Quay để nhận mã giảm giá — dùng khi thanh toán. Mỗi mã có hạn dùng riêng.
          </p>
        </header>

        {!eventOn || segments.length === 0 ? (
          <p className={styles.off}>Sự kiện đang tạm đóng hoặc chưa cấu hình ô quà.</p>
        ) : (
          <div className={styles.mainGrid}>
            <div className={styles.wheelColumn}>
              <div className={styles.stage}>
                <div className={styles.wheelWrap}>
                  <div className={styles.wheelAura} aria-hidden />
                  <div className={styles.pointer} role="img" aria-label="Vị trí trúng thưởng (kim ở dưới)">
                    <ArrowBigUp className={styles.pointerIcon} strokeWidth={2.6} aria-hidden />
                  </div>
                  <div
                    className={styles.wheel}
                    style={{
                      background: gradient,
                      transform: `rotate(${rotation}deg)`,
                      transition: spinning ? "transform 4s cubic-bezier(0.12, 0.85, 0.12, 1)" : "none",
                    }}
                  >
                    <span className={styles.wheelInnerShade} aria-hidden />
                    {segments.map((s, i) => {
                      const n = segments.length;
                      const slice = 360 / n;
                      /** CSS rotate(0) = 3h — cần -90° để khớp góc từ 12h như conic-gradient */
                      const deg = i * slice + slice / 2 - 90;
                      return (
                        <div key={s.id} className={styles.sliceLabel} style={{ transform: `rotate(${deg}deg)` }}>
                          <span className={styles.sliceText}>{s.label}</span>
                        </div>
                      );
                    })}
                  </div>
                  <button
                    type="button"
                    className={styles.centerBtn}
                    disabled={spinning || !user}
                    onClick={() => void onSpin()}
                  >
                    <span className={styles.centerBtnRing} aria-hidden />
                    <span className={styles.centerBtnLabel}>{spinning ? "Đang quay…" : "QUAY"}</span>
                  </button>
                </div>

                {!user ? (
                  <p className={styles.hint}>
                    <Link href={`/auth/login?next=${encodeURIComponent(loginNext)}`}>Đăng nhập</Link> để quay và lưu mã.
                  </p>
                ) : null}

                {err ? <p className={styles.err}>{err}</p> : null}
              </div>
            </div>

            <aside className={styles.sideColumn}>
              <section className={styles.history}>
                <h2 className={styles.historyTitle}>Mã của bạn</h2>
                <div className={styles.historyBody}>
                  {!user ? (
                    <p className={styles.muted}>Đăng nhập để xem lịch sử mã.</p>
                  ) : history.length === 0 ? (
                    <p className={styles.muted}>Chưa có mã — quay thử nhé!</p>
                  ) : (
                    <ul className={styles.historyList}>
                      {history.map((h) => (
                        <li key={h.id} className={styles.historyRow}>
                          <div>
                            <span className={styles.hCode}>{h.code}</span>
                            <span className={styles.hLabel}>{h.label}</span>
                          </div>
                          <p className={styles.hRule}>
                            Giảm{" "}
                            {spinDiscountLabelVi({
                              discountType: h.discountType,
                              discountValue: h.discountValue,
                              discountMaxVnd: h.discountMaxVnd,
                            })}
                          </p>
                          <div className={styles.hMeta}>
                            <span>Hết hạn: {new Date(h.expiresAt).toLocaleDateString("vi-VN")}</span>
                            {h.usedAt ? (
                              <span className={styles.used}>Đã dùng</span>
                            ) : (
                              <span className={styles.live}>Còn hiệu lực</span>
                            )}
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </section>
            </aside>
          </div>
        )}

        <footer className={styles.pageFoot}>
          <Link href="/" className={styles.backFoot}>
            <ArrowLeft size={20} strokeWidth={2} aria-hidden />
            Về trang chủ
          </Link>
        </footer>
      </div>

      {mounted && celebrateOpen && result
        ? createPortal(
            <div
              className={styles.celebrateOverlay}
              role="dialog"
              aria-modal="true"
              aria-labelledby="spin-win-title"
              onClick={() => setCelebrateOpen(false)}
            >
              <div className={styles.celebrateCard} onClick={(e) => e.stopPropagation()}>
                <button
                  type="button"
                  className={styles.celebrateClose}
                  onClick={() => setCelebrateOpen(false)}
                  aria-label="Đóng"
                >
                  <X size={22} strokeWidth={2.5} />
                </button>
                <div className={styles.celebrateBurst} aria-hidden />
                <div className={styles.celebrateIconWrap}>
                  <Gift className={styles.celebrateGift} size={40} strokeWidth={1.75} aria-hidden />
                </div>
                <p id="spin-win-title" className={styles.celebrateKicker}>
                  Chúc mừng bạn!
                </p>
                <p className={styles.celebratePrize}>{result.label}</p>
                <p className={styles.celebrateCode}>{result.code}</p>
                <p className={styles.celebrateMeta}>
                  Giảm{" "}
                  {spinDiscountLabelVi({
                    discountType: result.discountType,
                    discountValue: result.discountValue,
                    discountMaxVnd: result.discountMaxVnd,
                  })}{" "}
                  · HSD: {new Date(result.expiresAt).toLocaleString("vi-VN")}
                </p>
                <div className={styles.celebrateActions}>
                  <Link href="/checkout" className={styles.celebratePrimary}>
                    Dùng mã khi thanh toán
                  </Link>
                  <button type="button" className={styles.celebrateGhost} onClick={() => setCelebrateOpen(false)}>
                    Tiếp tục quay
                  </button>
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
