"use client";

import Link from "next/link";
import { Gift, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { formatVnd } from "@/lib/money";
import { spinDiscountLabelVi } from "@/lib/spin-discount-label";
import { AccountCouponsSkeleton } from "@/components/account/AccountPageSkeletons";
import styles from "../accountPages.module.scss";

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

type TabId = "all" | "active" | "used" | "expired";

const TABS: { id: TabId; label: string }[] = [
  { id: "all", label: "Tất cả" },
  { id: "active", label: "Còn hiệu lực" },
  { id: "used", label: "Đã dùng" },
  { id: "expired", label: "Hết hạn" },
];

function classify(c: CouponRow): "active" | "used" | "expired" {
  if (c.usedAt != null) return "used";
  if (new Date(c.expiresAt).getTime() <= Date.now()) return "expired";
  return "active";
}

const badgeTone: Record<ReturnType<typeof classify>, string> = {
  active: styles.couponBadge_active,
  used: styles.couponBadge_used,
  expired: styles.couponBadge_expired,
};

function discountLine(c: CouponRow): string {
  return spinDiscountLabelVi({
    discountType: c.discountType,
    discountValue: c.discountValue,
    discountMaxVnd: c.discountMaxVnd ?? 0,
  });
}

export function AccountCouponsClient() {
  const [rows, setRows] = useState<CouponRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<TabId>("all");
  const [q, setQ] = useState("");

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/account/spin-coupons", { credentials: "same-origin" });
        const data = await res.json().catch(() => ({}));
        if (!cancelled && res.ok && Array.isArray(data.coupons)) {
          setRows(data.coupons);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(() => {
    let list = rows;
    if (tab !== "all") {
      list = rows.filter((c) => classify(c) === tab);
    }
    const needle = q.trim().toLowerCase();
    if (!needle) return list;
    return list.filter(
      (c) =>
        c.code.toLowerCase().includes(needle) ||
        c.label.toLowerCase().includes(needle),
    );
  }, [rows, tab, q]);

  if (loading) {
    return <AccountCouponsSkeleton />;
  }

  return (
    <>
      <div className={styles.couponSearch}>
        <Search size={18} aria-hidden className={styles.couponSearchIcon} />
        <input
          type="search"
          placeholder="Tìm theo mã hoặc tên phần quà"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          aria-label="Tìm voucher"
        />
      </div>

      <div className={styles.couponTabs} role="tablist">
        {TABS.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tab === id}
            className={tab === id ? styles.couponTabActive : styles.couponTab}
            onClick={() => setTab(id)}
          >
            {label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className={styles.emptyBig}>
          <div className={styles.emptyIcon}>
            <Gift size={56} strokeWidth={1} aria-hidden />
          </div>
          <p style={{ margin: 0, fontSize: "1rem" }}>
            {rows.length === 0
              ? "Bạn chưa có mã voucher nào — quay vòng quay may mắn để nhận mã."
              : "Không có mã nào trong mục này."}
          </p>
          {q.trim() ? (
            <p className={styles.muted} style={{ marginTop: "0.5rem" }}>
              Thử bỏ bộ lọc hoặc từ khóa tìm kiếm.
            </p>
          ) : rows.length === 0 ? (
            <p style={{ marginTop: "1rem" }}>
              <Link href="/lucky-wheel">Đến trang vòng quay</Link>
            </p>
          ) : null}
        </div>
      ) : (
        <div className={styles.couponList}>
          {filtered.map((c) => {
            const kind = classify(c);
            const badge =
              kind === "used" ? "Đã dùng" : kind === "expired" ? "Hết hạn" : "Còn hiệu lực";
            return (
              <article
                key={c.id}
                className={`${styles.couponCard} ${styles[`couponCard_${kind}`]}`}
              >
                <div className={styles.couponHead}>
                  <div className={styles.couponCodeRow}>
                    <strong className={styles.couponCode}>{c.code}</strong>
                    <span className={`${styles.couponBadge} ${badgeTone[kind]}`}>{badge}</span>
                  </div>
                  <span className={styles.couponDiscount}>{discountLine(c)}</span>
                </div>
                <p className={styles.couponLabel}>{c.label}</p>
                <div className={styles.couponMeta}>
                  <p className={styles.couponMetaRow}>
                    <span className={styles.couponMetaKey}>Nhận:</span>{" "}
                    <time dateTime={c.issuedAt}>{new Date(c.issuedAt).toLocaleString("vi-VN")}</time>
                  </p>
                  {kind === "used" && c.usedAt ? (
                    <p className={styles.couponMetaRow}>
                      <span className={styles.couponMetaKey}>Đã dùng:</span>{" "}
                      <time dateTime={c.usedAt}>{new Date(c.usedAt).toLocaleString("vi-VN")}</time>
                    </p>
                  ) : (
                    <p className={styles.couponMetaRow}>
                      <span className={styles.couponMetaKey}>Hết hạn:</span>{" "}
                      <time dateTime={c.expiresAt}>{new Date(c.expiresAt).toLocaleString("vi-VN")}</time>
                    </p>
                  )}
                </div>
                {c.minOrderAmount > 0 ? (
                  <p className={styles.couponMin}>
                    <span className={styles.couponMetaKey}>Đơn tối thiểu:</span> {formatVnd(c.minOrderAmount)}
                  </p>
                ) : null}
                {kind === "active" ? (
                  <div className={styles.couponActions}>
                    <Link
                      href={`/checkout?spinCoupon=${encodeURIComponent(c.code)}`}
                      className={styles.couponCta}
                    >
                      Dùng khi thanh toán
                    </Link>
                  </div>
                ) : null}
              </article>
            );
          })}
        </div>
      )}
    </>
  );
}
