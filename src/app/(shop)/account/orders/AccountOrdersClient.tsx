"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Package } from "lucide-react";
import { ACCOUNT_ORDER_TAB_FILTERS, accountOrderStatusLabel } from "@/lib/account-order-status";
import { formatVnd } from "@/lib/money";
import { AccountOrdersSkeleton } from "@/components/account/AccountPageSkeletons";
import styles from "../accountPages.module.scss";

type OrderItem = {
  quantity: number;
  productName: string;
  productSlug: string;
};

type OrderRow = {
  id: string;
  totalAmount: number;
  status: string;
  createdAt: string;
  items: OrderItem[];
};

const TABS = ACCOUNT_ORDER_TAB_FILTERS;

export function AccountOrdersClient() {
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<string>("pending");
  const [q, setQ] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await fetch("/api/user/orders", { credentials: "same-origin" });
      const data = await res.json().catch(() => ({}));
      if (!cancelled && res.ok && Array.isArray(data.orders)) {
        setOrders(data.orders);
      }
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(() => {
    const t = TABS.find((x) => x.id === tab);
    let list = orders;
    if (t) {
      list = orders.filter((o) => t.match(o.status));
    }
    const needle = q.trim().toLowerCase();
    if (!needle) return list;
    return list.filter((o) => {
      if (o.id.toLowerCase().includes(needle)) return true;
      return o.items.some((it) => it.productName.toLowerCase().includes(needle));
    });
  }, [orders, tab, q]);

  if (loading) {
    return <AccountOrdersSkeleton />;
  }

  return (
    <>
      <div className={styles.search}>
        <Package size={18} aria-hidden />
        <input
          type="search"
          placeholder="Tìm theo mã đơn hàng hoặc tên sản phẩm"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          aria-label="Tìm đơn hàng"
        />
      </div>

      <div className={styles.tabs} role="tablist">
        {TABS.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tab === id}
            className={tab === id ? styles.tabActive : styles.tab}
            onClick={() => setTab(id)}
          >
            {label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className={styles.emptyBig}>
          <div className={styles.emptyIcon}>
            <Package size={56} strokeWidth={1} />
          </div>
          <p style={{ margin: 0, fontSize: "1rem" }}>Bạn chưa có đơn hàng nào trong mục này</p>
          {q.trim() ? (
            <p className={styles.muted} style={{ marginTop: "0.5rem" }}>
              Thử bỏ bộ lọc hoặc từ khóa tìm kiếm.
            </p>
          ) : null}
        </div>
      ) : (
        filtered.map((o) => (
          <Link
            key={o.id}
            href={`/account/orders/${encodeURIComponent(o.id)}`}
            className={styles.orderCardLink}
            aria-label={`Xem chi tiết đơn ${o.id.slice(-12)}`}
          >
            <article className={styles.orderCard}>
              <div className={styles.orderHead}>
                <strong>{formatVnd(o.totalAmount)}</strong>
                <span className={styles.muted}>{accountOrderStatusLabel(o.status)}</span>
              </div>
              <div className={styles.muted} style={{ fontSize: "0.8rem", marginBottom: 8 }}>
                Mã đơn: <code style={{ fontSize: "0.85rem" }}>{o.id.slice(-12)}</code>
                {" · "}
                {new Date(o.createdAt).toLocaleString("vi-VN")}
              </div>
              <ul className={styles.orderItems}>
                {o.items.map((it, i) => (
                  <li key={i}>
                    {it.productName} × {it.quantity}
                  </li>
                ))}
              </ul>
              <p className={styles.orderCardHint} aria-hidden>
                Chi tiết đơn →
              </p>
            </article>
          </Link>
        ))
      )}
    </>
  );
}
