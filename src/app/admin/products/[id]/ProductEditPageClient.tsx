"use client";

import Link from "next/link";
import { useLayoutEffect, useRef } from "react";
import { AdminBackLink } from "@/components/admin/AdminBackNav";
import { AdminPageLayout } from "@/components/admin/AdminPageLayout";
import { AdminStickyPageHeader } from "@/components/admin/AdminStickyPageHeader";
import { useAdminRightPanel } from "@/components/admin/AdminRightPanel";
import { AdminRightPanelFooterCrud } from "@/components/admin/AdminRightPanelFooter";
import { useMatchMedia } from "@/hooks/useMatchMedia";
import {
  ProductEditForm,
  type ProductEditFormPanelHandle,
  type ProductPayload,
  type VariantPayload,
} from "./ProductEditForm";
import pageStyles from "../new/product-new-page.module.scss";

export function ProductEditPageClient({
  product,
  categories,
  variants,
}: {
  product: ProductPayload;
  categories: { id: string; nameVi: string; nameEn: string }[];
  variants: VariantPayload[];
}) {
  const desktop = useMatchMedia("(min-width: 769px)", false);
  const { openPanel } = useAdminRightPanel();
  const panelDeleteRef = useRef<ProductEditFormPanelHandle | null>(null);

  useLayoutEffect(() => {
    if (!desktop) return;
    const formId = `admin-form-product-edit-${product.id}`;
    openPanel({
      title: "Chỉnh sửa sản phẩm",
      content: (
        <ProductEditForm
          ref={panelDeleteRef}
          product={product}
          categories={categories}
          variants={variants}
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
    /** Tránh `router.replace` — Next sẽ render `admin/loading` và kẹt spinner. */
    if (typeof window !== "undefined") {
      window.history.replaceState(window.history.state, "", "/admin/products");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- một lần khi mở desktop / đổi sản phẩm
  }, [desktop, openPanel, product.id]);

  if (desktop) {
    return null;
  }

  return (
    <AdminPageLayout
      header={
        <AdminStickyPageHeader>
          <div className={pageStyles.head}>
            <AdminBackLink href="/admin/products">Chỉnh sửa sản phẩm</AdminBackLink>
          </div>
        </AdminStickyPageHeader>
      }
    >
      {categories.length === 0 ? (
        <p className="muted" style={{ marginBottom: "1rem", fontSize: "0.92rem" }}>
          Chưa có danh mục — dùng <strong>Tạo danh mục</strong> trong form hoặc{" "}
          <Link href="/admin/categories">quản lý danh mục</Link>.
        </p>
      ) : null}
      <ProductEditForm product={product} categories={categories} variants={variants} />
    </AdminPageLayout>
  );
}
