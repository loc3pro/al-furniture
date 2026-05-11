"use client";

import { useRouter } from "next/navigation";
import { ManualOrderForm } from "./new/ManualOrderForm";
import { useAdminRightPanel } from "@/components/admin/AdminRightPanel";
import { AdminRightPanelFooterCrud } from "@/components/admin/AdminRightPanelFooter";
const ADMIN_FORM_MANUAL_ORDER = "admin-form-manual-order";

/** Desktop: form trong panel (không dùng `<Link>` — tránh GlobalLoading thanh top kẹt). Mobile: điều hướng trang. */
export function AdminOrdersNewLink({ className }: { className?: string }) {
  const router = useRouter();
  const { openPanel, closePanel } = useAdminRightPanel();

  return (
    <button
      type="button"
      className={["btn btn--primary adminToolbarBtn", className].filter(Boolean).join(" ")}
      title="Tạo đơn thủ công (form nhập tay)"
      onClick={() => {
        if (typeof window !== "undefined" && window.matchMedia("(min-width: 769px)").matches) {
          openPanel({
            title: "Tạo đơn thủ công",
            content: (
              <ManualOrderForm
                embeddedInPanel
                panelFormId={ADMIN_FORM_MANUAL_ORDER}
                onSuccess={() => closePanel()}
              />
            ),
            footer: (
              <AdminRightPanelFooterCrud
                create={
                  <button type="submit" form={ADMIN_FORM_MANUAL_ORDER} className="btn btn--primary">
                    Tạo đơn
                  </button>
                }
                delete={
                  <button type="button" className="btn btn--ghost adminCancelGhost" onClick={() => closePanel()}>
                    Hủy
                  </button>
                }
              />
            ),
          });
        } else {
          router.push("/admin/orders/new");
        }
      }}
    >
      + Đơn
    </button>
  );
}
