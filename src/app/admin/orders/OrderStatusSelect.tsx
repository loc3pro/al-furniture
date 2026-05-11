"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Select } from "antd";
import { ChevronDown } from "lucide-react";
import { showAdminToast } from "@/lib/admin-toast";
import { ORDER_STATUS_VI } from "@/lib/order-status-vi";
import { statusRequiresPaymentFirst } from "@/lib/order-payment-display";
import { SELECT_MENU_CHECK } from "@/design-system/select-icons";

const STATUSES = [
  "PENDING",
  "FAILED",
  "PAID",
  "PROCESSING",
  "SHIPPING",
  "COMPLETED",
  "CANCELLED",
  "RETURNED",
  "REFUNDED",
] as const;

/** Cao hơn {@link AdminRightPanel} (10040) để menu Select nhận click trong panel. */
const ORDER_STATUS_SELECT_POPUP_Z = 10100;

export function OrderStatusSelect({
  orderId,
  initial,
  className,
  wrapClassName,
  paymentHold,
}: {
  orderId: string;
  initial: string;
  /** Class cho khối Select */
  className?: string;
  /** Bọc ngoài — căn layout */
  wrapClassName?: string;
  paymentHold?: boolean;
}) {
  const router = useRouter();
  const [v, setV] = useState(initial);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setV(initial);
  }, [initial]);

  const options = useMemo(
    () =>
      STATUSES.map((s) => ({
        value: s,
        label: ORDER_STATUS_VI[s],
        disabled: Boolean(paymentHold && statusRequiresPaymentFirst(s)),
      })),
    [paymentHold],
  );

  async function onChange(next: string) {
    if (paymentHold && statusRequiresPaymentFirst(next)) {
      return;
    }
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setV(next);
        showAdminToast("Đã cập nhật trạng thái đơn");
        router.refresh();
      } else if (typeof data.error === "string") {
        showAdminToast(data.error, "error");
      }
    } catch {
      showAdminToast("Lỗi mạng", "error");
    } finally {
      setBusy(false);
    }
  }

  const sel = (
    <Select<string>
      className={className}
      value={v}
      disabled={busy}
      variant="outlined"
      aria-label="Trạng thái đơn"
      title={
        paymentHold
          ? "Xác nhận đã nhận tiền (MoMo/CK) trước khi chuyển sang trạng thái xử lý hoặc giao hàng."
          : undefined
      }
      options={options}
      onChange={(next) => void onChange(next)}
      suffixIcon={<ChevronDown size={16} strokeWidth={2} aria-hidden />}
      menuItemSelectedIcon={SELECT_MENU_CHECK}
      popupMatchSelectWidth={false}
      listHeight={360}
      styles={{ popup: { root: { zIndex: ORDER_STATUS_SELECT_POPUP_Z } } }}
    />
  );

  return wrapClassName ? <div className={wrapClassName}>{sel}</div> : sel;
}
