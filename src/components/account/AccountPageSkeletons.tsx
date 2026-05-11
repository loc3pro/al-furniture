"use client";

import styles from "@/app/(shop)/account/accountPages.module.scss";
import sk from "./AccountSkeleton.module.scss";

export function AccountCouponsSkeleton() {
  return (
    <div aria-busy="true" aria-label="Đang tải voucher">
      <div className={sk.searchSk} />

      <div className={sk.tabsRow}>
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className={sk.tabSk} style={{ width: i === 0 ? "3.5rem" : i === 1 ? "6rem" : i === 2 ? "4rem" : "4.25rem" }} />
        ))}
      </div>

      {[0, 1, 2].map((i) => (
        <div key={i} className={sk.orderCardSk}>
          <div className={sk.orderHeadSk}>
            <span className={sk.orderAmountSk} />
            <span className={sk.orderStatusSk} />
          </div>
          <div className={sk.metaSk} />
          <div className={sk.itemLineSk} />
        </div>
      ))}
    </div>
  );
}

export function AccountOrdersSkeleton() {
  return (
    <div aria-busy="true" aria-label="Đang tải đơn hàng">
      <div className={sk.searchSk} />

      <div className={sk.tabsRow}>
        {[0, 1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className={sk.tabSk} style={{ width: i % 2 === 0 ? "5.25rem" : "4.75rem" }} />
        ))}
      </div>

      {[0, 1, 2].map((i) => (
        <div key={i} className={sk.orderCardSk}>
          <div className={sk.orderHeadSk}>
            <span className={sk.orderAmountSk} />
            <span className={sk.orderStatusSk} />
          </div>
          <div className={sk.metaSk} />
          <div className={sk.itemLineSk} />
          <div className={sk.itemLineSk} />
        </div>
      ))}
    </div>
  );
}

export function AccountReviewsSkeleton() {
  return (
    <div aria-busy="true" aria-label="Đang tải đánh giá">
      <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
        {[0, 1, 2].map((i) => (
          <li key={i} className={styles.orderCard} style={{ listStyle: "none" }}>
            <div className={sk.reviewTitleRow}>
              <span className={sk.reviewLinkSk} />
              <span className={sk.reviewDateSk} />
            </div>
            <div className={sk.starsSk} aria-hidden>
              {[0, 1, 2, 3, 4].map((j) => (
                <span key={j} className={sk.starSk} />
              ))}
            </div>
            <div className={sk.commentSk} />
            <div className={sk.commentSkShort} />
          </li>
        ))}
      </ul>
    </div>
  );
}

export function AccountAddressesListSkeleton() {
  return (
    <div aria-busy="true" aria-label="Đang tải địa chỉ" style={{ marginBottom: "1.25rem" }}>
      <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
        {[0, 1].map((i) => (
          <li key={i} className={styles.orderCard} style={{ listStyle: "none" }}>
            <div className={sk.line} style={{ width: i === 0 ? "70%" : "55%", height: "1rem", marginBottom: "0.5rem" }} />
            <div className={sk.line} style={{ width: "85%", maxWidth: 360, marginBottom: "0.35rem" }} />
            <div className={sk.line} style={{ width: "40%", maxWidth: 160, marginBottom: 0 }} />
            <div style={{ marginTop: "0.6rem", display: "flex", gap: "0.5rem" }}>
              <span className={sk.tabSk} style={{ width: "3.25rem", height: "2rem" }} />
              <span className={sk.tabSk} style={{ width: "2.75rem", height: "2rem" }} />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
