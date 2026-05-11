"use client";

import { Loader2, Pencil, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { showAdminToast } from "@/lib/admin-toast";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import { AdminProductEditOpenLink } from "./AdminProductEditOpenLink";
import cls from "./admin-products-view.module.scss";

export function AdminProductRowActions({ productId, nameVi }: { productId: string; nameVi: string }) {
  const router = useRouter();
  const askConfirm = useConfirm();
  const [busy, setBusy] = useState(false);

  async function handleDelete() {
    const label = nameVi.trim().slice(0, 80) || "sản phẩm";
    if (
      !(await askConfirm({
        message: `Xóa sản phẩm «${label}»? Không hoàn tác nếu không còn đơn tham chiếu.`,
        danger: true,
      }))
    )
      return;
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/products/${productId}`, {
        method: "DELETE",
        credentials: "same-origin",
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        showAdminToast(typeof data.error === "string" ? data.error : "Không xóa được", "error");
        return;
      }
      showAdminToast("Đã xóa sản phẩm");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  const editLabel = nameVi.trim() ? `Sửa: ${nameVi.trim()}` : "Sửa sản phẩm";

  return (
    <div className={cls.rowActions} onClick={(e) => e.stopPropagation()}>
      <AdminProductEditOpenLink
        productId={productId}
        className="adminTableBtn adminTableBtn--iconOnly"
        title={editLabel}
      >
        <Pencil className="adminTableBtnIcon" strokeWidth={2.25} aria-hidden />
      </AdminProductEditOpenLink>
      <button
        type="button"
        className="adminTableBtn adminTableBtnDanger adminTableBtn--iconOnly"
        disabled={busy}
        aria-label={busy ? "Đang xóa sản phẩm" : "Xóa sản phẩm"}
        title="Xóa sản phẩm"
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
