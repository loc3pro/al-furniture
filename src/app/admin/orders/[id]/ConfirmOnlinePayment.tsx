"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { showAdminToast } from "@/lib/admin-toast";
import { Spinner } from "@/components/ui/Spinner";
import styles from "./confirm-payment.module.scss";

export function ConfirmOnlinePayment({
  orderId,
  visible,
}: {
  orderId: string;
  visible: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  if (!visible) return null;

  async function confirm() {
    setErr(null);
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/orders/${orderId}/confirm-payment`, {
        method: "POST",
        credentials: "same-origin",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg = typeof data.error === "string" ? data.error : "Thất bại";
        setErr(msg);
        showAdminToast(msg, "error");
        return;
      }
      showAdminToast("Đã xác nhận thanh toán");
      router.refresh();
    } catch {
      setErr("Lỗi mạng");
      showAdminToast("Lỗi mạng", "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={styles.box}>
      <p className={styles.lead}>
        Đơn <strong>MoMo</strong> hoặc <strong>chuyển khoản</strong> đang chờ thanh toán. Sau khi đối soát tiền, xác nhận
        để trừ tồn và chuyển sang xử lý đơn.
      </p>
      <button type="button" className={styles.btn} disabled={busy} onClick={() => void confirm()}>
        {busy ? <Spinner size="sm" inheritColor label="Đang xử lý" /> : "Xác nhận đã nhận tiền"}
      </button>
      {err ? <p className={styles.err}>{err}</p> : null}
    </div>
  );
}
