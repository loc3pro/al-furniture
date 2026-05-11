"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { accountOrderStatusLabel } from "@/lib/account-order-status";
import { formatVnd } from "@/lib/money";
import { formatShippingAddressBlock } from "@/lib/format-shipping-address";
import {
  paymentMethodLabelVi,
  resolvePaymentChannel,
} from "@/lib/order-payment-display";
import { SectionLoading } from "@/components/ui/SectionLoading";
import styles from "./accountOrderDetail.module.scss";
import pageStyles from "../../accountPages.module.scss";

type DetailJson = {
  order: {
    id: string;
    orderNumber: string;
    totalAmount: number;
    status: string;
    payMode: string;
    depositDue: number | null;
    balanceDue: number | null;
    paymentMethod: string;
    shippingAddress: unknown;
    createdAt: string;
    updatedAt: string;
    items: Array<{
      id: string;
      quantity: number;
      price: number;
      discountSnapshot: number | null;
      colorLabelSnapshot: string;
      sizeLabelSnapshot: string;
      productName: string;
      productSlug: string;
    }>;
    paymentTxs: Array<{ id: string; provider: string; status: string; createdAt: string }>;
  };
};

function txBadgeClass(status: string): string {
  const s = status.toUpperCase();
  if (s === "SUCCESS" || s === "SUCCEEDED" || s === "PAID" || s === "COMPLETED") return styles.txOk;
  if (s === "PENDING" || s === "PROCESSING") return styles.txPending;
  if (s === "FAILED" || s === "CANCELLED") return styles.txFail;
  return styles.txNeutral;
}

function formatShipping(addr: Record<string, unknown>): string {
  const lines: string[] = [];
  const name = typeof addr.name === "string" ? addr.name : "";
  const phone = typeof addr.phone === "string" ? addr.phone : "";
  if (name || phone) lines.push([name, phone].filter(Boolean).join(" · "));
  const line = typeof addr.line === "string" ? addr.line : "";
  const ward = typeof addr.ward === "string" ? addr.ward : "";
  const district = typeof addr.district === "string" ? addr.district : "";
  const city = typeof addr.city === "string" ? addr.city : "";
  const addrLine = [line, ward, district, city].filter(Boolean).join(", ");
  if (addrLine) lines.push(addrLine);
  const note = typeof addr.note === "string" ? addr.note.trim() : "";
  if (note) lines.push(`Ghi chú: ${note}`);
  return lines.join("\n") || "—";
}

export function AccountOrderDetailClient() {
  const params = useParams();
  const id = typeof params?.id === "string" ? params.id : "";
  const [data, setData] = useState<DetailJson["order"] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) {
      setLoading(false);
      setErr("Thiếu mã đơn.");
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch(`/api/user/orders/${encodeURIComponent(id)}`, {
          credentials: "same-origin",
        });
        const json = (await res.json().catch(() => null)) as DetailJson & { error?: string };
        if (cancelled) return;
        if (!res.ok) {
          setErr(typeof json?.error === "string" ? json.error : "Không tải được đơn hàng.");
          setData(null);
          return;
        }
        if (json?.order) {
          setData(json.order);
          setErr(null);
        } else {
          setErr("Dữ liệu không hợp lệ.");
        }
      } catch {
        if (!cancelled) setErr("Lỗi mạng.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const channelLabel = useMemo(() => {
    if (!data) return "—";
    const ch = resolvePaymentChannel({
      paymentMethod: data.paymentMethod,
      shippingAddress: data.shippingAddress,
      paymentTxs: data.paymentTxs,
    });
    return paymentMethodLabelVi(ch);
  }, [data]);

  const payModeLabel = useMemo(() => {
    if (!data) return "—";
    if (data.payMode === "DEPOSIT") return "Đặt cọc";
    return "Trả đủ";
  }, [data]);

  if (loading) {
    return <SectionLoading label="Đang tải đơn hàng" />;
  }

  if (err || !data) {
    return <p className={pageStyles.msgErr}>{err ?? "Không có dữ liệu."}</p>;
  }

  const addr = (data.shippingAddress ?? {}) as Record<string, unknown>;

  return (
    <>
      <header className={styles.hero}>
        <div className={styles.heroTop}>
          <div>
            <h1 className={styles.heroTitle}>Đơn {data.orderNumber}</h1>
            <p className={styles.heroMeta}>
              Đặt lúc {new Date(data.createdAt).toLocaleString("vi-VN")}
              {" · "}
              Cập nhật {new Date(data.updatedAt).toLocaleString("vi-VN")}
            </p>
            <span className={styles.statusPill}>{accountOrderStatusLabel(data.status)}</span>
          </div>
          <Link className={`btn btn--secondary ${styles.invoiceBtn}`} href={`/account/orders/${id}/invoice`}>
            In hóa đơn
          </Link>
        </div>
      </header>

      <div className={styles.grid}>
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Giao hàng</h2>
          <p className={styles.addrBlock}>{formatShippingAddressBlock(addr)}</p>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Thanh toán</h2>
          <dl className={styles.defList}>
            <dt>Hình thức</dt>
            <dd>{channelLabel}</dd>
            <dt>Loại</dt>
            <dd>{payModeLabel}</dd>
            <dt>Tổng đơn</dt>
            <dd>
              <strong>{formatVnd(data.totalAmount)}</strong>
            </dd>
            {data.payMode === "DEPOSIT" && data.depositDue != null ? (
              <>
                <dt>Cọc</dt>
                <dd>{formatVnd(data.depositDue)}</dd>
              </>
            ) : null}
            {data.payMode === "DEPOSIT" && data.balanceDue != null ? (
              <>
                <dt>Còn lại</dt>
                <dd>{formatVnd(data.balanceDue)}</dd>
              </>
            ) : null}
          </dl>
        </section>
      </div>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Sản phẩm</h2>
        <table className={styles.itemsTable}>
          <thead>
            <tr>
              <th>Sản phẩm</th>
              <th>SL</th>
              <th>Đơn giá</th>
              <th>Thành tiền</th>
            </tr>
          </thead>
          <tbody>
            {data.items.map((it) => (
              <tr key={it.id}>
                <td>
                  <Link href={`/products/${it.productSlug}`} className={styles.productLink}>
                    {it.productName}
                  </Link>
                  <span className={styles.variantHint}>
                    {it.colorLabelSnapshot}
                    {it.sizeLabelSnapshot ? ` · ${it.sizeLabelSnapshot}` : ""}
                  </span>
                </td>
                <td>{it.quantity}</td>
                <td>{formatVnd(it.price)}</td>
                <td>{formatVnd(it.price * it.quantity)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {data.paymentTxs.length > 0 ? (
        <section className={styles.section} style={{ marginTop: "1rem" }}>
          <h2 className={styles.sectionTitle}>Giao dịch thanh toán</h2>
          <ul className={styles.txList}>
            {data.paymentTxs.map((t) => (
              <li key={t.id} className={styles.txRow}>
                <span>{t.provider}</span>
                <span className={`${styles.txBadge} ${txBadgeClass(t.status)}`}>{t.status}</span>
                <span className={pageStyles.muted}>{new Date(t.createdAt).toLocaleString("vi-VN")}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </>
  );
}
