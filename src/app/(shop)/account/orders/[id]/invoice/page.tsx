import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { getThemeSettings, resolveBrandText, resolveHeaderStoreName } from "@/lib/theme";
import { orderToInvoiceViewModel } from "@/lib/invoice-view-model";
import { InvoiceDocument } from "@/components/invoice/InvoiceDocument";
import { InvoicePrintToolbar } from "@/components/invoice/InvoicePrintToolbar";
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

export default async function AccountOrderInvoicePage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  const session = await getSession();
  if (!session) {
    redirect(
      `/auth/login?next=${encodeURIComponent(`/account/orders/${encodeURIComponent(id)}/invoice`)}`,
    );
  }

  const order = await prisma.order.findFirst({
    where: { id, userId: session.sub },
    include: orderInclude,
  });
  if (!order) notFound();

  const theme = await getThemeSettings();
  const storeName = resolveHeaderStoreName(theme) ?? resolveBrandText(theme);
  const vm = orderToInvoiceViewModel(order, storeName, "customer");

  return (
    <InvoiceDocument
      vm={vm}
      toolbar={<InvoicePrintToolbar backHref={`/account/orders/${id}`} backLabel="Chi tiết đơn" />}
    />
  );
}
