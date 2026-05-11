import type { PaymentMethod } from "@prisma/client";

/** Chuẩn hoá kênh TT kể cả khi enum DB/client cũ và chỉ lưu payChannel trong shippingAddress. */
export function resolvePaymentChannel(order: {
  paymentMethod: PaymentMethod | string;
  shippingAddress: unknown;
  paymentTxs?: { provider: string }[];
}): "COD" | "MOMO" | "BANK_TRANSFER" | string {
  const addr = order.shippingAddress as Record<string, unknown> | null;
  if (addr?.payChannel === "BANK_TRANSFER") return "BANK_TRANSFER";
  if (order.paymentMethod === "BANK_TRANSFER") return "BANK_TRANSFER";
  const tx = order.paymentTxs?.find((t) => t.provider === "BANK_TRANSFER");
  if (tx) return "BANK_TRANSFER";
  return order.paymentMethod;
}

export function paymentMethodLabelVi(channel: string): string {
  if (channel === "BANK_TRANSFER") return "Chuyển khoản";
  if (channel === "MOMO") return "MoMo";
  if (channel === "COD") return "COD";
  return channel;
}

const SUCCESS_STATUSES = new Set(["SUCCESS", "SUCCEEDED", "PAID", "COMPLETED"]);

/** Đơn MoMo / CK đang PENDING và chưa có giao dịch thành công — không cho đổi sang xử lý/giao cho đến khi admin xác nhận. */
export function isOnlinePaymentPending(order: {
  status: string;
  paymentMethod: PaymentMethod | string;
  shippingAddress: unknown;
  paymentTxs: { provider: string; status: string }[];
}): boolean {
  const ch = resolvePaymentChannel(order);
  if (ch !== "MOMO" && ch !== "BANK_TRANSFER") return false;
  if (order.status !== "PENDING") return false;
  const confirmed = order.paymentTxs.some(
    (t) =>
      (t.provider === "MOMO" || t.provider === "BANK_TRANSFER") && SUCCESS_STATUSES.has(t.status),
  );
  return !confirmed;
}

/** Trạng thái “tiến độ” sau thanh toán — chặn nếu MoMo/CK chưa xác nhận (tránh Set export lỗi runtime bundle). */
const PAYMENT_GATE_STATUSES = ["PAID", "PROCESSING", "SHIPPING", "COMPLETED"] as const;

export function statusRequiresPaymentFirst(status: string): boolean {
  return (PAYMENT_GATE_STATUSES as readonly string[]).includes(status);
}
