"use client";

import Link from "next/link";
import { useLayoutEffect } from "react";
import { AdminBackLink } from "@/components/admin/AdminBackNav";
import { AdminPageLayout } from "@/components/admin/AdminPageLayout";
import { AdminStickyPageHeader } from "@/components/admin/AdminStickyPageHeader";
import { useAdminRightPanel } from "@/components/admin/AdminRightPanel";
import { useMatchMedia } from "@/hooks/useMatchMedia";
import { ProductCreatePanel } from "../ProductsCreateSplit";
import { ProductForm } from "./ProductForm";
import pageStyles from "./product-new-page.module.scss";

type Cat = { id: string; nameVi: string; nameEn: string };

export function ProductNewPageClient({ categories }: { categories: Cat[] }) {
  const desktop = useMatchMedia("(min-width: 769px)", false);
  const { openPanel, closePanel } = useAdminRightPanel();

  useLayoutEffect(() => {
    if (!desktop) return;
    openPanel({
      title: "Tạo sản phẩm",
      content: <ProductCreatePanel categories={categories} onClose={() => closePanel()} />,
    });
    return () => closePanel();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [desktop, openPanel, closePanel]);

  if (desktop) {
    return (
      <AdminPageLayout>
        <p className="muted" style={{ margin: 0, fontSize: "0.92rem" }}>
          Biểu mẫu đang mở trong <strong>panel bên phải</strong>.{" "}
          <AdminBackLink href="/admin/products">Danh sách sản phẩm</AdminBackLink>
        </p>
      </AdminPageLayout>
    );
  }

  return (
    <AdminPageLayout
      header={
        <AdminStickyPageHeader>
          <div className={`${pageStyles.head} ${pageStyles.headStack}`}>
            <AdminBackLink href="/admin/products">Tạo sản phẩm</AdminBackLink>
            <p className="muted" style={{ margin: 0, fontSize: "0.9rem" }}>
              Thêm biến thể đầy đủ màu × kích thước.{" "}
              <Link href="/admin/categories">Quản lý danh mục</Link>.
            </p>
          </div>
        </AdminStickyPageHeader>
      }
    >
      {categories.length === 0 ? (
        <p className="muted" style={{ marginBottom: "1rem", fontSize: "0.92rem" }}>
          Chưa có danh mục — dùng nút <strong>Tạo danh mục</strong> bên dưới hoặc{" "}
          <Link href="/admin/categories">quản lý danh mục</Link>.
        </p>
      ) : null}
      <ProductForm categories={categories} />
    </AdminPageLayout>
  );
}
