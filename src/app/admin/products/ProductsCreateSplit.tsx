"use client";

import { useState } from "react";
import { ProductForm } from "./new/ProductForm";
import { useAdminRightPanel } from "@/components/admin/AdminRightPanel";
import panelStyles from "@/components/admin/AdminRightPanel.module.scss";
import { AdminRightPanelFooterCrud } from "@/components/admin/AdminRightPanelFooter";

const ADMIN_FORM_PRODUCT_CREATE = "admin-form-product-create";

export function ProductCreatePanel({
  categories,
  onClose,
}: {
  categories: { id: string; nameVi: string; nameEn: string }[];
  onClose: () => void;
}) {
  const [canSubmit, setCanSubmit] = useState(false);
  return (
    <div className={panelStyles.bodyStack}>
      <div className={panelStyles.bodyScroll}>
        <ProductForm
          categories={categories}
          embeddedInPanel
          panelFormId={ADMIN_FORM_PRODUCT_CREATE}
          onValidityChange={setCanSubmit}
        />
      </div>
      <AdminRightPanelFooterCrud
        as="div"
        className={panelStyles.panelFooterBleed}
        create={
          <button
            type="submit"
            form={ADMIN_FORM_PRODUCT_CREATE}
            className="btn btn--primary adminToolbarBtn"
            disabled={!canSubmit}
            title={canSubmit ? "Tạo sản phẩm" : "Điền đủ thông tin — nút bật khi form có thay đổi"}
          >
            Tạo
          </button>
        }
        delete={
          <button type="button" className="btn btn--ghost adminCancelGhost adminToolbarBtn" onClick={onClose}>
            Hủy
          </button>
        }
      />
    </div>
  );
}

export function ProductsCreateSplit({
  categories,
}: {
  categories: { id: string; nameVi: string; nameEn: string }[];
}) {
  const { openPanel, closePanel } = useAdminRightPanel();

  return (
    <button
      type="button"
      className="btn btn--primary adminToolbarBtn"
      title="Tạo sản phẩm mới trong catalog"
      onClick={() =>
        openPanel({
          title: "Tạo sản phẩm",
          content: <ProductCreatePanel categories={categories} onClose={() => closePanel()} />,
        })
      }
    >
      + Tạo
    </button>
  );
}
