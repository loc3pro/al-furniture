import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/require-session";

/** Đơn hàng của user đang đăng nhập */
export async function GET() {
  const gate = await requireSession();
  if (!gate.ok) return gate.response;

  const rows = await prisma.order.findMany({
    where: { userId: gate.session.sub },
    orderBy: { createdAt: "desc" },
    take: 100,
    select: {
      id: true,
      totalAmount: true,
      status: true,
      createdAt: true,
      items: {
        select: {
          quantity: true,
          productVariant: {
            select: {
              product: { select: { nameVi: true, slug: true } },
            },
          },
        },
      },
    },
  });

  const orders = rows.map((o) => ({
    id: o.id,
    totalAmount: o.totalAmount,
    status: o.status,
    createdAt: o.createdAt.toISOString(),
    items: o.items.map((it) => ({
      quantity: it.quantity,
      productName: it.productVariant.product.nameVi,
      productSlug: it.productVariant.product.slug,
    })),
  }));

  return NextResponse.json({ orders });
}
