import { notFound, redirect } from "next/navigation";
import { AdminBackLink } from "@/components/admin/AdminBackNav";
import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { getThemeSettings, resolveBrandText, resolveHeaderStoreName } from "@/lib/theme";
import { orderToInvoiceViewModel } from "@/lib/invoice-view-model";
import { InvoiceDocument } from "@/components/invoice/InvoiceDocument";
import { InvoicePrintToolbar } from "@/components/invoice/InvoicePrintToolbar";
import { AdminPageLayout } from "@/components/admin/AdminPageLayout";
import { AdminStickyPageHeader } from "@/components/admin/AdminStickyPageHeader";
import adminOrderStyles from "../admin-order-detail.module.scss";

const orderInclude = {
  items: {
    include: {
      productVariant: {
        select: {
          sku: true,
          product: { select: { nameVi: true } },
        },
      },
    },
  },
  paymentTxs: { orderBy: { createdAt: "desc" as const }, take: 20 },
  user: { select: { name: true, email: true, phone: true } },
} as const;

export default async function AdminOrderInvoicePage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  const session = await getSession();
  if (!session || session.role !== Role.ADMIN) {
    redirect("/auth/login?next=%2Fadmin");
  }

  const order = await prisma.order.findUnique({
    where: { id },
    include: orderInclude,
  });
  if (!order) notFound();

  const theme = await getThemeSettings();
  const storeName = resolveHeaderStoreName(theme) ?? resolveBrandText(theme);
  const vm = orderToInvoiceViewModel(order, storeName, "admin");

  return (
    <AdminPageLayout
      header={
        <AdminStickyPageHeader variant="muted">
          <p className={adminOrderStyles.back}>
            <AdminBackLink href={`/admin/orders/${encodeURIComponent(id)}`}>
              In hóa đơn · {order.orderNumber}
            </AdminBackLink>
          </p>
        </AdminStickyPageHeader>
      }
    >
      <InvoiceDocument
        vm={vm}
        toolbar={
          <InvoicePrintToolbar backHref={`/admin/orders/${id}`} backLabel="Chi tiết đơn" />
        }
      />
    </AdminPageLayout>
  );
}
