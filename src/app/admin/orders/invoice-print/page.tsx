import Link from "next/link";
import { redirect } from "next/navigation";
import { AdminBackLink } from "@/components/admin/AdminBackNav";
import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { getThemeSettings, resolveBrandText, resolveHeaderStoreName } from "@/lib/theme";
import { orderToInvoiceViewModel } from "@/lib/invoice-view-model";
import { InvoicePaper } from "@/components/invoice/InvoicePaper";
import { InvoicePrintToolbar } from "@/components/invoice/InvoicePrintToolbar";
import { AdminPageLayout } from "@/components/admin/AdminPageLayout";
import { AdminStickyPageHeader } from "@/components/admin/AdminStickyPageHeader";
import invoiceStyles from "@/components/invoice/invoice-document.module.scss";
import batchStyles from "@/components/invoice/invoice-batch.module.scss";
import { ORDER_PRINT_IDS_MAX, parseOrderIdsParam } from "../order-list-filters";

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

type PageProps = { searchParams: Promise<{ ids?: string }> };

export default async function AdminInvoiceBatchPrintPage({ searchParams }: PageProps) {
  const session = await getSession();
  if (!session || session.role !== Role.ADMIN) {
    redirect("/auth/login?next=%2Fadmin%2Forders%2Finvoice-print");
  }

  const sp = await searchParams;
  const ids = parseOrderIdsParam(sp.ids ?? undefined)?.slice(0, ORDER_PRINT_IDS_MAX) ?? [];

  if (ids.length === 0) {
    return (
      <AdminPageLayout
        header={
          <AdminStickyPageHeader variant="muted">
            <p style={{ margin: 0 }}>
              <AdminBackLink href="/admin/orders">In hóa đơn</AdminBackLink>
            </p>
          </AdminStickyPageHeader>
        }
      >
        <p style={{ maxWidth: 520 }}>
          Chưa có đơn để in. Trong danh sách đơn, chọn một hoặc nhiều đơn rồi bấm <strong>Print hóa đơn</strong>, hoặc mở{" "}
          <Link href="/admin/orders">Đơn hàng</Link> → chi tiết đơn → In hóa đơn.
        </p>
      </AdminPageLayout>
    );
  }

  const orders = await prisma.order.findMany({
    where: { id: { in: ids } },
    orderBy: { createdAt: "desc" },
    include: orderInclude,
  });

  const theme = await getThemeSettings();
  const storeName = resolveHeaderStoreName(theme) ?? resolveBrandText(theme);
  const vms = orders.map((o) => orderToInvoiceViewModel(o, storeName, "admin"));

  return (
    <AdminPageLayout
      header={
        <AdminStickyPageHeader variant="muted">
            <p style={{ margin: 0 }}>
              <AdminBackLink href="/admin/orders">In hóa đơn · {vms.length} đơn</AdminBackLink>
            </p>
        </AdminStickyPageHeader>
      }
    >
      <div className={batchStyles.root}>
        <div className={invoiceStyles.toolbar}>
          <InvoicePrintToolbar backHref="/admin/orders" />
        </div>
        <div className={invoiceStyles.printIsolation}>
          {vms.map((vm) => (
            <div key={vm.orderId} className={batchStyles.sheet}>
              <InvoicePaper vm={vm} />
            </div>
          ))}
        </div>
      </div>
    </AdminPageLayout>
  );
}
