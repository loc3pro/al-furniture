/** Bộ lọc tab + nhãn hiển thị trạng thái đơn (trang tài khoản — lịch sử đơn). */
export const ACCOUNT_ORDER_TAB_FILTERS: { id: string; label: string; match: (s: string) => boolean }[] =
  [
    { id: "pending", label: "Chờ xác nhận", match: (s) => s === "PENDING" },
    { id: "payment_failed", label: "Thanh toán thất bại", match: (s) => s === "FAILED" },
    { id: "pickup", label: "Chờ lấy hàng", match: (s) => s === "PAID" },
    {
      id: "shipping",
      label: "Đang giao hàng",
      match: (s) => s === "PROCESSING" || s === "SHIPPING",
    },
    { id: "done", label: "Đã giao", match: (s) => s === "COMPLETED" },
    { id: "returned", label: "Trả hàng", match: (s) => s === "RETURNED" || s === "REFUNDED" },
    { id: "cancelled", label: "Đã huỷ", match: (s) => s === "CANCELLED" },
  ];

export function accountOrderStatusLabel(status: string): string {
  const tab = ACCOUNT_ORDER_TAB_FILTERS.find((t) => t.match(status));
  return tab?.label ?? status;
}
