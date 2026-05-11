import type { Order, OrderItem, PaymentMethod } from "@prisma/client";
import { resolvePaymentChannel, paymentMethodLabelVi } from "@/lib/order-payment-display";
import { orderStatusLabel } from "@/lib/order-status-vi";
import { formatShippingAddressBlock } from "@/lib/format-shipping-address";

export type InvoiceLineItem = {
  name: string;
  variantLabel: string;
  sku: string | null;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
};

export type InvoiceViewModel = {
  storeName: string;
  orderNumber: string;
  orderId: string;
  issuedAt: Date;
  statusLabel: string;
  paymentLabel: string;
  payModeLabel: string;
  totalAmount: number;
  depositDue: number | null;
  balanceDue: number | null;
  shippingBlock: string;
  lines: InvoiceLineItem[];
  audience: "customer" | "admin";
  buyerName: string | null;
  buyerEmail: string | null;
  buyerPhone: string | null;
};

type OrderWithInvoiceRelations = Order & {
  items: (OrderItem & {
    productVariant: {
      sku: string;
      product: { nameVi: string };
    };
  })[];
  paymentTxs: { provider: string; status: string }[];
  user?: { name: string | null; email: string | null; phone: string | null } | null;
};

export function orderToInvoiceViewModel(
  order: OrderWithInvoiceRelations,
  storeName: string,
  audience: "customer" | "admin",
): InvoiceViewModel {
  const ch = resolvePaymentChannel({
    paymentMethod: order.paymentMethod as PaymentMethod,
    shippingAddress: order.shippingAddress,
    paymentTxs: order.paymentTxs,
  });

  const lines: InvoiceLineItem[] = order.items.map((it) => ({
    name: it.productVariant.product.nameVi,
    variantLabel: [it.colorLabelSnapshot, it.sizeLabelSnapshot].filter(Boolean).join(" · "),
    sku: audience === "admin" ? it.productVariant.sku : null,
    quantity: it.quantity,
    unitPrice: it.price,
    lineTotal: it.price * it.quantity,
  }));

  return {
    storeName,
    orderNumber: order.orderNumber,
    orderId: order.id,
    issuedAt: order.createdAt,
    statusLabel: orderStatusLabel(order.status),
    paymentLabel: paymentMethodLabelVi(ch),
    payModeLabel: order.payMode === "DEPOSIT" ? "Đặt cọc" : "Trả đủ",
    totalAmount: order.totalAmount,
    depositDue: order.depositDue,
    balanceDue: order.balanceDue,
    shippingBlock: formatShippingAddressBlock(order.shippingAddress),
    lines,
    audience,
    buyerName: order.user?.name ?? null,
    buyerEmail: order.user?.email ?? null,
    buyerPhone: order.user?.phone ?? null,
  };
}
