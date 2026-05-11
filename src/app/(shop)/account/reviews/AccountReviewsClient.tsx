"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Star } from "lucide-react";
import { AccountReviewsSkeleton } from "@/components/account/AccountPageSkeletons";
import styles from "../accountPages.module.scss";

type Row = {
  id: string;
  rating: number;
  comment: string | null;
  status: string;
  createdAt: string;
  productName: string;
  productSlug: string;
};

export function AccountReviewsClient() {
  const [reviews, setReviews] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await fetch("/api/user/reviews", { credentials: "same-origin" });
      const data = await res.json().catch(() => ({}));
      if (!cancelled && res.ok && Array.isArray(data.reviews)) setReviews(data.reviews);
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) return <AccountReviewsSkeleton />;

  if (reviews.length === 0) {
    return (
      <div className={styles.emptyBig}>
        <div className={styles.emptyIcon}>
          <Star size={56} strokeWidth={1} />
        </div>
        <p style={{ margin: 0 }}>Chưa có đánh giá nào.</p>
      </div>
    );
  }

  return (
    <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
      {reviews.map((r) => (
        <li
          key={r.id}
          className={styles.orderCard}
          style={{ listStyle: "none" }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap" }}>
            <Link href={`/products/${r.productSlug}`} style={{ fontWeight: 600 }}>
              {r.productName}
            </Link>
            <span className={styles.muted} style={{ fontSize: "0.85rem" }}>
              {new Date(r.createdAt).toLocaleDateString("vi-VN")}
              {r.status !== "APPROVED" ? ` · ${r.status}` : ""}
            </span>
          </div>
          <div style={{ marginTop: 8, display: "flex", gap: 4 }}>
            {Array.from({ length: 5 }, (_, i) => (
              <Star
                key={i}
                size={16}
                fill={i < r.rating ? "currentColor" : "none"}
                strokeWidth={i < r.rating ? 0 : 1.5}
                style={{ color: i < r.rating ? "#c9a227" : "rgba(0,0,0,0.25)" }}
              />
            ))}
          </div>
          {r.comment ? (
            <p style={{ margin: "0.65rem 0 0", fontSize: "0.92rem" }}>{r.comment}</p>
          ) : null}
        </li>
      ))}
    </ul>
  );
}
