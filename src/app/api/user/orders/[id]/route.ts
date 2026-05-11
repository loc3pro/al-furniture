import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/require-session";

/** Chi tiết một đơn — chỉ khi đơn thuộc user đang đăng nhập */
export async function GET(_req: Request, context: { params: Promise<{ id: string }> }) {
  const gate = await requireSession();
  if (!gate.ok) return gate.response;

  const { id } = await context.params;

  const order = await prisma.order.findFirst({
    where: { id, userId: gate.session.sub },
    include: {
      items: {
        include: {
          productVariant: {
            select: {
              product: { select: { nameVi: true, slug: true } },
            },
          },
        },
      },
      paymentTxs: { orderBy: { createdAt: "desc" }, take: 20 },
    },
  });

  if (!order) {
    return NextResponse.json({ error: "Không tìm thấy đơn hàng." }, { status: 404 });
  }

  return NextResponse.json({
    order: {
      id: order.id,
      orderNumber: order.orderNumber,
      totalAmount: order.totalAmount,
      status: order.status,
      payMode: order.payMode,
      depositDue: order.depositDue,
      balanceDue: order.balanceDue,
      paymentMethod: order.paymentMethod,
      shippingAddress: order.shippingAddress,
      createdAt: order.createdAt.toISOString(),
      updatedAt: order.updatedAt.toISOString(),
      items: order.items.map((it) => ({
        id: it.id,
        quantity: it.quantity,
        price: it.price,
        discountSnapshot: it.discountSnapshot,
        colorLabelSnapshot: it.colorLabelSnapshot,
        sizeLabelSnapshot: it.sizeLabelSnapshot,
        productName: it.productVariant.product.nameVi,
        productSlug: it.productVariant.product.slug,
      })),
      paymentTxs: order.paymentTxs.map((t) => ({
        id: t.id,
        provider: t.provider,
        status: t.status,
        createdAt: t.createdAt.toISOString(),
      })),
    },
  });
}
