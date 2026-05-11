"use client";

import { Loader2, Pencil, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { showAdminToast } from "@/lib/admin-toast";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import { AdminOrderOpenLink } from "./AdminOrderOpenLink";
import styles from "./admin-orders.module.scss";

export function OrderRowActions({ orderId, orderNumber }: { orderId: string; orderNumber: string }) {
  const router = useRouter();
  const askConfirm = useConfirm();
  const [busy, setBusy] = useState(false);

  async function handleDelete() {
    if (!(await askConfirm({ message: "Xóa đơn hàng này? Hành động không hoàn tác.", danger: true }))) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/orders/${orderId}`, {
        method: "DELETE",
        credentials: "same-origin",
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        showAdminToast(typeof data.error === "string" ? data.error : "Không xóa được đơn", "error");
        return;
      }
      showAdminToast("Đã xóa đơn hàng");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={styles.rowActions}>
      <AdminOrderOpenLink
        orderId={orderId}
        orderNumber={orderNumber}
        className="adminTableBtn adminTableBtn--iconOnly"
        title="Xem / sửa đơn"
      >
        <Pencil className="adminTableBtnIcon" strokeWidth={2.25} aria-hidden />
      </AdminOrderOpenLink>
      <button
        type="button"
        className="adminTableBtn adminTableBtnDanger adminTableBtn--iconOnly"
        disabled={busy}
        aria-label={busy ? "Đang xóa đơn" : "Xóa đơn"}
        title="Xóa đơn"
        onClick={() => void handleDelete()}
      >
        {busy ? (
          <Loader2 className="adminTableBtnIcon adminTableBtnIcon--spin" strokeWidth={2.25} aria-hidden />
        ) : (
          <Trash2 className="adminTableBtnIcon" strokeWidth={2.25} aria-hidden />
        )}
      </button>
    </div>
  );
}
