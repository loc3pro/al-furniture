import { OrderStatus } from "@prisma/client";

/** Trạng thái mà hệ thống đã trừ tồn kho (COD sau tạo đơn; MoMo/CK sau xác nhận thanh toán). */
const HAD_STOCK_OUT: ReadonlySet<OrderStatus> = new Set([
  OrderStatus.PROCESSING,
  OrderStatus.PAID,
  OrderStatus.SHIPPING,
  OrderStatus.COMPLETED,
]);

export function orderHadStockDeducted(status: OrderStatus): boolean {
  return HAD_STOCK_OUT.has(status);
}
