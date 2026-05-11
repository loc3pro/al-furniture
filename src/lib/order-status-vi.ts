import type { OrderStatus } from "@prisma/client";

export const ORDER_STATUS_VI: Record<OrderStatus, string> = {
  PENDING: "Chờ xử lý",
  FAILED: "Thanh toán thất bại",
  PAID: "Đã thanh toán",
  PROCESSING: "Đang xử lý",
  SHIPPING: "Đang giao hàng",
  COMPLETED: "Hoàn thành",
  CANCELLED: "Đã hủy",
  RETURNED: "Trả hàng",
  REFUNDED: "Đã hoàn tiền",
};

export function orderStatusLabel(s: OrderStatus | string): string {
  return ORDER_STATUS_VI[s as OrderStatus] ?? String(s);
}
