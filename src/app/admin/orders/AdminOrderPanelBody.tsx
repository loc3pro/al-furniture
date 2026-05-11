"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { formatVnd } from "@/lib/money";
import { collectVariantGalleryUrls } from "@/lib/variant-gallery-urls";
import {
  isOnlinePaymentPending,
  paymentMethodLabelVi,
  resolvePaymentChannel,
} from "@/lib/order-payment-display";
import { orderStatusLabel } from "@/lib/order-status-vi";
import { staffDisplayName } from "@/lib/admin-staff-label";
import { Spinner } from "@/components/ui/Spinner";
import { ConfirmOnlinePayment } from "./[id]/ConfirmOnlinePayment";
import { OrderStatusSelect } from "./OrderStatusSelect";
import detailStyles from "./[id]/admin-order-detail.module.scss";

type ApiOrder = {
  id: string;
  orderNumber: string;
  status: string;
  totalAmount: number;
  createdAt: string;
  updatedAt: string;
  placedByUserId: string | null;
  shippingAddress: unknown;
  paymentMethod: string;
  payMode?: string;
  depositDue?: number | null;
  balanceDue?: number | null;
  user: { email: string | null; phone: string | null; name: string | null } | null;
  placedBy: { name: string | null; email: string | null } | null;
  items: {
    id: string;
    quantity: number;
    price: number;
    colorLabelSnapshot: string;
    sizeLabelSnapshot: string;
    productVariant: {
      sku: string;
      imageUrls: unknown;
      product: { nameVi: string; slug: string };
    };
  }[];
  paymentTxs: { id: string; provider: string; status: string; createdAt: string }[];
};

function firstThumb(imageUrls: unknown): string | null {
  const urls = collectVariantGalleryUrls([{ imageUrls }]);
  return urls[0] ?? null;
}

function VndWithUnderlinedDong(amount: number) {
  const s = formatVnd(amount);
  const i = s.lastIndexOf("₫");
  if (i < 0) return s;
  return (
    <>
      {s.slice(0, i)}
      <span className={detailStyles.currencyMark}>₫</span>
    </>
  );
}

export function AdminOrderPanelBody({ orderId }: { orderId: string }) {
  const router = useRouter();
  const [order, setOrder] = useState<ApiOrder | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setErr(null);
    setOrder(null);
    void (async () => {
      try {
        const res = await fetch(`/api/admin/orders/${orderId}`, { credentials: "same-origin" });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          if (!cancelled) setErr((data as { error?: string }).error ?? "Không tải được đơn");
          return;
        }
        const o = (data as { order?: ApiOrder }).order;
        if (!cancelled && o) setOrder(o);
      } catch {
        if (!cancelled) setErr("Lỗi mạng");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [orderId]);

  if (err) {
    return (
      <p className={detailStyles.muted} style={{ margin: 0 }}>
        {err}
      </p>
    );
  }

  if (!order) {
    return (
      <div style={{ display: "flex", justifyContent: "center", padding: "2rem" }}>
        <Spinner label="Đang tải đơn" />
      </div>
    );
  }

  const addr = order.shippingAddress as Record<string, string>;
  const holdPayment = isOnlinePaymentPending({
    status: order.status,
    paymentMethod: order.paymentMethod,
    shippingAddress: order.shippingAddress,
    paymentTxs: order.paymentTxs,
  });

  return (
    <div className={detailStyles.panelOrderBody}>
      <div className={detailStyles.orderHeadRow}>
        <p className={detailStyles.meta}>
          <strong>Mã đơn:</strong> {order.orderNumber}
        </p>
        <div className={detailStyles.statusPill} data-status={order.status}>
          <OrderStatusSelect
            orderId={order.id}
            initial={order.status}
            wrapClassName={detailStyles.statusSelectShell}
            className={detailStyles.statusSelect}
            paymentHold={holdPayment}
          />
        </div>
      </div>
      <p className={detailStyles.meta}>
        {orderStatusLabel(order.status)} · {formatVnd(order.totalAmount)}
      </p>
      <p className={detailStyles.meta}>
        {new Date(order.createdAt).toLocaleString("vi-VN")} ·{" "}
        {order.placedByUserId ? `Admin: ${staffDisplayName(order.placedBy)}` : "Đơn khách"}
      </p>

      <ConfirmOnlinePayment orderId={order.id} visible={holdPayment} />

      <section className={detailStyles.card}>
        <div className={detailStyles.cardHead}>
          <h2 className={detailStyles.cardTitle}>Khách & giao hàng</h2>
        </div>
        <dl className={detailStyles.defList}>
          <div className={detailStyles.defRow}>
            <dt>Họ tên</dt>
            <dd>{addr?.name ?? order.user?.name ?? "—"}</dd>
          </div>
          <div className={detailStyles.defRow}>
            <dt>SĐT</dt>
            <dd>{addr?.phone ?? order.user?.phone ?? "—"}</dd>
          </div>
          <div className={detailStyles.defRow}>
            <dt>Địa chỉ</dt>
            <dd>{[addr?.line, addr?.ward, addr?.district, addr?.city].filter(Boolean).join(", ") || "—"}</dd>
          </div>
        </dl>
      </section>

      <section className={detailStyles.card}>
        <div className={detailStyles.cardHead}>
          <h2 className={detailStyles.cardTitle}>Thanh toán</h2>
        </div>
        <dl className={detailStyles.defList}>
          <div className={detailStyles.defRow}>
            <dt>Phương thức</dt>
            <dd>
              <strong>{paymentMethodLabelVi(resolvePaymentChannel(order))}</strong>
            </dd>
          </div>
          <div className={detailStyles.defRowHighlight}>
            <dt>Tổng</dt>
            <dd>{formatVnd(order.totalAmount)}</dd>
          </div>
        </dl>
      </section>

      <section className={detailStyles.productsSection}>
        <div className={detailStyles.productsSectionHead}>
          <h2 className={detailStyles.sectionTitle}>Sản phẩm</h2>
          <span className={detailStyles.itemCount}>{order.items.length} mặt hàng</span>
        </div>
        <ul className={detailStyles.lineList}>
          {order.items.map((it) => {
            const slug = it.productVariant.product.slug;
            const thumb = firstThumb(it.productVariant.imageUrls);
            const lineTotal = it.price * it.quantity;
            return (
              <li key={it.id} className={detailStyles.lineItem}>
                <div className={detailStyles.lineThumb}>
                  {thumb ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={thumb} alt="" className={detailStyles.lineThumbImg} loading="lazy" />
                  ) : (
                    <span className={detailStyles.lineThumbPlaceholder}>Ảnh</span>
                  )}
                </div>
                <div className={detailStyles.gridProductCol}>
                  <Link href={`/products/${slug}`} className={detailStyles.productLink} target="_blank" rel="noreferrer">
                    {it.productVariant.product.nameVi}
                  </Link>
                  <div className={detailStyles.variantChipsRow}>
                    <div className={detailStyles.variantChips}>
                      <span className={detailStyles.chip}>{it.colorLabelSnapshot}</span>
                      <span className={detailStyles.chipDim}>{it.sizeLabelSnapshot}</span>
                    </div>
                    <code className={detailStyles.lineSkuMono}>{it.productVariant.sku}</code>
                  </div>
                </div>
                <div className={detailStyles.lineMetricsRow}>
                  <div className={detailStyles.lineColUnit}>
                    <span className={detailStyles.numLabel}>Đơn giá</span>
                    <span className={detailStyles.colPriceValue}>{VndWithUnderlinedDong(it.price)}</span>
                  </div>
                  <div className={detailStyles.lineColQty}>
                    <span className={detailStyles.numLabel}>SL</span>
                    <span className={detailStyles.colQtyValue}>{it.quantity}</span>
                  </div>
                  <div className={detailStyles.lineColTotal}>
                    <span className={detailStyles.numLabel}>Thành tiền</span>
                    <span className={detailStyles.colTotalValue}>{VndWithUnderlinedDong(lineTotal)}</span>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      <p style={{ marginTop: "1.25rem" }}>
        <Link
          href={`/admin/orders/${orderId}`}
          className="btn btn--ghost"
          style={{ width: "100%", justifyContent: "center" }}
          onClick={() => router.refresh()}
        >
          Mở trang đầy đủ
        </Link>
      </p>
    </div>
  );
}
