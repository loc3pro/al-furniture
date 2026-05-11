import Link from "next/link";
import { AdminBackLink } from "@/components/admin/AdminBackNav";
import type { Prisma } from "@prisma/client";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { formatVnd } from "@/lib/money";
import { collectVariantGalleryUrls } from "@/lib/variant-gallery-urls";
import {
  isOnlinePaymentPending,
  paymentMethodLabelVi,
  resolvePaymentChannel,
} from "@/lib/order-payment-display";
import { AdminPageLayout } from "@/components/admin/AdminPageLayout";
import { AdminStickyPageHeader } from "@/components/admin/AdminStickyPageHeader";
import { staffDisplayName } from "@/lib/admin-staff-label";
import { OrderStatusSelect } from "../OrderStatusSelect";
import { ConfirmOnlinePayment } from "./ConfirmOnlinePayment";
import styles from "./admin-order-detail.module.scss";

const orderInclude = {
  items: {
    include: {
      productVariant: {
        select: {
          id: true,
          sku: true,
          imageUrls: true,
          product: { select: { nameVi: true, slug: true } },
        },
      },
    },
  },
  user: { select: { email: true, phone: true, name: true } },
  placedBy: { select: { name: true, email: true } },
  paymentTxs: { orderBy: { createdAt: "desc" as const }, take: 10 },
} satisfies Prisma.OrderInclude;

type OrderDetail = Prisma.OrderGetPayload<{ include: typeof orderInclude }>;

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
      <span className={styles.currencyMark}>₫</span>
    </>
  );
}

function txStatusClass(status: string): string {
  const s = status.toUpperCase();
  if (s === "SUCCESS" || s === "COMPLETED" || s === "PAID") return styles.txOk;
  if (s === "PENDING" || s === "PROCESSING") return styles.txPending;
  if (s === "FAILED" || s === "CANCELLED") return styles.txFail;
  return styles.txNeutral;
}

export default async function AdminOrderDetailPage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  let order: OrderDetail | null = null;
  try {
    order = await prisma.order.findUnique({
      where: { id },
      include: orderInclude,
    });
  } catch {
    order = null;
  }
  if (!order) notFound();

  const holdPayment = isOnlinePaymentPending(order);
  const addr = order.shippingAddress as Record<string, string>;

  return (
    <AdminPageLayout
      header={
        <AdminStickyPageHeader variant="muted">
          <p className={styles.back}>
            <AdminBackLink href="/admin/orders">Danh sách đơn</AdminBackLink>
          </p>

          <header className={styles.hero}>
            <div className={styles.heroMain}>
              <h1 className={styles.title}>Đơn {order.orderNumber}</h1>
              <p className={styles.orderIdFull} title="ID kỹ thuật (CUID)">
                {order.id}
              </p>
              <p className={styles.meta}>
                Tạo lúc {new Date(order.createdAt).toLocaleString("vi-VN")} · Cập nhật{" "}
                {new Date(order.updatedAt).toLocaleString("vi-VN")}
              </p>
              <p className={styles.meta}>
                {order.placedByUserId
                  ? `Đơn tạo bởi admin: ${staffDisplayName(order.placedBy)}`
                  : "Đơn từ khách (website / không ghi nhận người tạo thủ công)"}
              </p>
            </div>
            <div className={styles.heroAside}>
              <div className={styles.heroTotalLabel}>Tổng đơn</div>
              <div className={styles.heroTotal}>{formatVnd(order.totalAmount)}</div>
              <Link className={styles.invoicePrintLink} href={`/admin/orders/${order.id}/invoice`}>
                In hóa đơn
              </Link>
              <div className={styles.statusPill} data-status={order.status}>
                <OrderStatusSelect
                  orderId={order.id}
                  initial={order.status}
                  wrapClassName={styles.statusSelectShell}
                  className={styles.statusSelect}
                  paymentHold={holdPayment}
                />
              </div>
            </div>
          </header>
        </AdminStickyPageHeader>
      }
    >
      <div className={styles.cardsGrid}>
        <section className={styles.card}>
          <div className={styles.cardHead}>
            <span className={styles.cardIcon} aria-hidden>
              ◎
            </span>
            <h2 className={styles.cardTitle}>Khách</h2>
          </div>
          <dl className={styles.defList}>
            <div className={styles.defRow}>
              <dt>Họ tên</dt>
              <dd>{order.user?.name ?? "—"}</dd>
            </div>
            <div className={styles.defRow}>
              <dt>Email</dt>
              <dd>{order.user?.email ?? "—"}</dd>
            </div>
            <div className={styles.defRow}>
              <dt>Số điện thoại</dt>
              <dd>{order.user?.phone ?? "—"}</dd>
            </div>
          </dl>
        </section>

        <section className={styles.card}>
          <div className={styles.cardHead}>
            <span className={styles.cardIcon} aria-hidden>
              ⌖
            </span>
            <h2 className={styles.cardTitle}>Giao hàng</h2>
          </div>
          <dl className={styles.defList}>
            <div className={styles.defRow}>
              <dt>Người nhận</dt>
              <dd>{addr?.name ?? "—"}</dd>
            </div>
            <div className={styles.defRow}>
              <dt>SĐT</dt>
              <dd>{addr?.phone ?? "—"}</dd>
            </div>
            <div className={styles.defRow}>
              <dt>Địa chỉ</dt>
              <dd>
                {addr?.line ?? addr?.line1 ?? "—"}
                {addr?.line2 ? (
                  <>
                    <br />
                    {addr.line2}
                  </>
                ) : null}
              </dd>
            </div>
            <div className={styles.defRow}>
              <dt>Phường / Quận / Tỉnh</dt>
              <dd>{[addr?.ward, addr?.district, addr?.city].filter(Boolean).join(", ") || "—"}</dd>
            </div>
            {typeof addr?.note === "string" && addr.note.trim() ? (
              <div className={styles.defRow}>
                <dt>Ghi chú</dt>
                <dd className={styles.noteBlock}>{addr.note.trim()}</dd>
              </div>
            ) : null}
          </dl>
        </section>

        <section className={styles.card}>
          <div className={styles.cardHead}>
            <span className={styles.cardIcon} aria-hidden>
              ₫
            </span>
            <h2 className={styles.cardTitle}>Thanh toán</h2>
          </div>
          <dl className={styles.defList}>
            <div className={styles.defRow}>
              <dt>Phương thức</dt>
              <dd>
                <strong>{paymentMethodLabelVi(resolvePaymentChannel(order))}</strong>
              </dd>
            </div>
            <div className={styles.defRow}>
              <dt>Kiểu</dt>
              <dd>
                <strong>{(order as { payMode?: string }).payMode === "DEPOSIT" ? "Đặt cọc" : "Trả đủ"}</strong>
              </dd>
            </div>
            {(order as { payMode?: string; depositDue?: number | null }).payMode === "DEPOSIT" &&
            (order as { depositDue?: number | null }).depositDue != null ? (
              <div className={styles.defRow}>
                <dt>Cọc / còn lại</dt>
                <dd className={styles.muted}>
                  Cọc: {formatVnd((order as { depositDue: number }).depositDue)} · Còn:{" "}
                  {formatVnd((order as { balanceDue?: number }).balanceDue ?? 0)}
                </dd>
              </div>
            ) : null}
            <div className={styles.defRowHighlight}>
              <dt>Giá trị đơn</dt>
              <dd>{formatVnd(order.totalAmount)}</dd>
            </div>
          </dl>
          <ConfirmOnlinePayment orderId={order.id} visible={holdPayment} />
        </section>
      </div>

      {order.paymentTxs.length > 0 ? (
        <section className={styles.txsSection} aria-labelledby="txs-heading">
          <h2 id="txs-heading" className={styles.sectionTitle}>
            Giao dịch thanh toán
          </h2>
          <ul className={styles.txTimeline}>
            {order.paymentTxs.map((tx) => (
              <li key={tx.id} className={styles.txItem}>
                <span className={styles.txDot} aria-hidden />
                <div className={styles.txBody}>
                  <div className={styles.txTop}>
                    <span className={styles.txProvider}>{tx.provider}</span>
                    <time className={styles.txTime} dateTime={tx.createdAt.toISOString()}>
                      {new Date(tx.createdAt).toLocaleString("vi-VN")}
                    </time>
                  </div>
                  <span className={`${styles.txStatus} ${txStatusClass(tx.status)}`}>{tx.status}</span>
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className={styles.productsSection} aria-labelledby="items-heading">
        <div className={styles.productsSectionHead}>
          <h2 id="items-heading" className={styles.sectionTitle}>
            Sản phẩm
          </h2>
          <span className={styles.itemCount}>{order.items.length} mặt hàng</span>
        </div>
        <ul className={styles.lineList}>
          {order.items.map((it) => {
            const slug = it.productVariant.product.slug;
            const thumb = firstThumb(it.productVariant.imageUrls);
            const lineTotal = it.price * it.quantity;
            return (
              <li key={it.id} className={styles.lineItem}>
                <div className={styles.lineThumb}>
                  {thumb ? (
                    // eslint-disable-next-line @next/next/no-img-element -- URL động từ Cloudinary / host khác
                    <img src={thumb} alt="" className={styles.lineThumbImg} loading="lazy" />
                  ) : (
                    <span className={styles.lineThumbPlaceholder}>Ảnh</span>
                  )}
                </div>
                <div className={styles.gridProductCol}>
                  <Link href={`/products/${slug}`} className={styles.productLink} target="_blank" rel="noreferrer">
                    {it.productVariant.product.nameVi}
                  </Link>
                  <div className={styles.variantChipsRow}>
                    <div className={styles.variantChips}>
                      <span className={styles.chip}>{it.colorLabelSnapshot}</span>
                      <span className={styles.chipDim}>{it.sizeLabelSnapshot}</span>
                    </div>
                  </div>
                  <code className={styles.lineSkuMono}>{it.productVariant.sku}</code>
                </div>
                <div className={styles.lineMetricsRow}>
                  <div className={styles.lineColUnit}>
                    <span className={styles.numLabel}>Đơn giá</span>
                    <span className={styles.colPriceValue}>{VndWithUnderlinedDong(it.price)}</span>
                  </div>
                  <div className={styles.lineColQty}>
                    <span className={styles.numLabel}>SL</span>
                    <span className={styles.colQtyValue}>{it.quantity}</span>
                  </div>
                  <div className={styles.lineColTotal}>
                    <span className={styles.numLabel}>Thành tiền</span>
                    <span className={styles.colTotalValue}>{VndWithUnderlinedDong(lineTotal)}</span>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </section>
    </AdminPageLayout>
  );
}
