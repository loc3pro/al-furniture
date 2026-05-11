"use client";

import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { useRef, useState } from "react";
import { useAdminRightPanel } from "@/components/admin/AdminRightPanel";
import { AdminRightPanelFooterCrud } from "@/components/admin/AdminRightPanelFooter";
import { ProductEditForm, type ProductEditFormPanelHandle } from "./[id]/ProductEditForm";
import { showAdminToast } from "@/lib/admin-toast";
import type { AdminProductEditBundle } from "@/lib/admin-product-edit-payload";

/** Desktop: mở form sửa trong panel (button — không kẹt GlobalLoading). Mobile: `/admin/products/[id]`. */
export function AdminProductEditOpenLink({
  productId,
  className,
  title,
  children,
}: {
  productId: string;
  className?: string;
  /** Tooltip (vd. tên SP đầy đủ khi label bị …). */
  title?: string;
  children: ReactNode;
}) {
  const router = useRouter();
  const { openPanel } = useAdminRightPanel();
  const [busy, setBusy] = useState(false);
  const panelDeleteRef = useRef<ProductEditFormPanelHandle | null>(null);

  return (
    <button
      type="button"
      className={className}
      title={title}
      aria-label={title?.trim() || "Sửa sản phẩm"}
      aria-busy={busy || undefined}
      disabled={busy}
      onClick={() => {
        if (typeof window === "undefined") return;
        if (!window.matchMedia("(min-width: 769px)").matches) {
          router.push(`/admin/products/${productId}`);
          return;
        }
        void (async () => {
          setBusy(true);
          try {
            const res = await fetch(`/api/admin/products/${productId}`, { credentials: "same-origin" });
            const data = (await res.json()) as Partial<AdminProductEditBundle> & { error?: string };
            if (!res.ok) {
              showAdminToast(data.error ?? "Không tải được sản phẩm", "error");
              return;
            }
            if (!data.product || !data.categories || !data.variants) {
              showAdminToast("Phản hồi không hợp lệ", "error");
              return;
            }
            const formId = `admin-form-product-edit-${productId}`;
            openPanel({
              title: "Chỉnh sửa sản phẩm",
              content: (
                <ProductEditForm
                  ref={panelDeleteRef}
                  product={data.product}
                  categories={data.categories}
                  variants={data.variants}
                  embeddedInPanel
                  panelFormId={formId}
                />
              ),
              footer: (
                <AdminRightPanelFooterCrud
                  create={null}
                  update={
                    <button type="submit" form={formId} className="btn btn--primary">
                      Lưu
                    </button>
                  }
                  delete={
                    <button
                      type="button"
                      className="btn btn--ghost adminPanelGhostDanger"
                      onClick={() => void panelDeleteRef.current?.requestDelete()}
                    >
                      Xóa
                    </button>
                  }
                />
              ),
            });
          } catch {
            showAdminToast("Không tải được sản phẩm", "error");
          } finally {
            setBusy(false);
          }
        })();
      }}
    >
      {children}
    </button>
  );
}
