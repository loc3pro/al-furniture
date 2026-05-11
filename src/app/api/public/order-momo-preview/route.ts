import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { OrderStatus, PaymentMethod } from "@prisma/client";

/** Chỉ cho đơn MoMo đang PENDING — dùng trang thanh toán giả lập để hiển thị sản phẩm. */
export async function GET(req: Request) {
  const orderId = new URL(req.url).searchParams.get("orderId")?.trim();
  if (!orderId) {
    return NextResponse.json({ error: "Thiếu orderId" }, { status: 400 });
  }

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      items: {
        include: {
          productVariant: {
            include: {
              product: { select: { nameVi: true, slug: true } },
            },
          },
        },
      },
    },
  });

  if (!order || order.paymentMethod !== PaymentMethod.MOMO) {
    return NextResponse.json({ error: "Không tìm thấy đơn MoMo" }, { status: 404 });
  }

  if (order.status !== OrderStatus.PENDING) {
    return NextResponse.json(
      { error: "Đơn đã được xử lý", status: order.status },
      { status: 410 }
    );
  }

  const payMode = (order as { payMode?: string }).payMode ?? "FULL";
  const depositDue = (order as { depositDue?: number | null }).depositDue;
  const amountToPay =
    payMode === "DEPOSIT" && depositDue != null && depositDue > 0 ? depositDue : order.totalAmount;

  return NextResponse.json({
    orderId: order.id,
    totalAmount: order.totalAmount,
    amountToPay,
    payMode,
    depositDue: depositDue ?? null,
    balanceDue: (order as { balanceDue?: number | null }).balanceDue ?? null,
    items: order.items.map((it) => {
      const urls = it.productVariant.imageUrls as unknown;
      const thumbUrl =
        Array.isArray(urls) && typeof urls[0] === "string" ? urls[0] : null;
      return {
        productName: it.productVariant.product.nameVi,
        productSlug: it.productVariant.product.slug,
        thumbUrl,
        color: it.colorLabelSnapshot,
        size: it.sizeLabelSnapshot,
        quantity: it.quantity,
        unitPrice: it.price,
        lineTotal: it.price * it.quantity,
      };
    }),
  });
}
