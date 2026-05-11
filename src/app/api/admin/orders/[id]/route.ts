import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-auth";
import { recordAdminAudit } from "@/lib/admin-audit";
import { OrderStatus } from "@prisma/client";
import { isOnlinePaymentPending, statusRequiresPaymentFirst } from "@/lib/order-payment-display";
import { orderHadStockDeducted } from "@/lib/order-inventory-status";

const getInclude = {
  items: {
    include: {
      productVariant: {
        select: {
          id: true,
          sku: true,
          imageUrls: true,
          product: { select: { nameVi: true, slug: true } },
        },
      },
    },
  },
  user: { select: { email: true, phone: true, name: true } },
  placedBy: { select: { name: true, email: true } },
  paymentTxs: { orderBy: { createdAt: "desc" as const }, take: 10 },
} satisfies Prisma.OrderInclude;

export type AdminOrderDetailJson = Prisma.OrderGetPayload<{ include: typeof getInclude }>;

const patchBody = z.object({
  status: z.enum([
    "PENDING",
    "FAILED",
    "PAID",
    "PROCESSING",
    "SHIPPING",
    "COMPLETED",
    "CANCELLED",
    "RETURNED",
    "REFUNDED",
  ]),
});

type Ctx = { params: Promise<{ id: string }> };

/** GET — JSON chi tiết đơn (panel phải admin / tích hợp khác). */
export async function GET(_req: Request, ctx: Ctx) {
  const gate = await requireAdmin();
  if (!gate.ok) return gate.response;

  const { id } = await ctx.params;
  try {
    const order = await prisma.order.findUnique({
      where: { id },
      include: getInclude,
    });
    if (!order) {
      return NextResponse.json({ error: "Không tìm thấy đơn" }, { status: 404 });
    }
    return NextResponse.json({ order });
  } catch {
    return NextResponse.json({ error: "Không tải được đơn" }, { status: 500 });
  }
}

export async function PATCH(req: Request, ctx: Ctx) {
  const gate = await requireAdmin();
  if (!gate.ok) return gate.response;

  const { id } = await ctx.params;
  const json = await req.json().catch(() => null);
  const parsed = patchBody.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Trạng thái không hợp lệ" }, { status: 400 });
  }

  const nextStatus = parsed.data.status as OrderStatus;

  const order = await prisma.order.findUnique({
    where: { id },
    include: { paymentTxs: true },
  });
  if (!order) {
    return NextResponse.json({ error: "Không tìm thấy đơn" }, { status: 404 });
  }

  if (
    statusRequiresPaymentFirst(String(nextStatus)) &&
    isOnlinePaymentPending(order)
  ) {
    return NextResponse.json(
      {
        error:
          "Chưa xác nhận thanh toán (MoMo / chuyển khoản). Dùng nút «Xác nhận đã nhận tiền» trước khi chuyển trạng thái xử lý.",
      },
      { status: 400 },
    );
  }

  await prisma.order.update({
    where: { id },
    data: { status: nextStatus },
  });

  await recordAdminAudit({
    actorUserId: gate.session.sub,
    action: "order.status_change",
    entityType: "Order",
    entityId: id,
    summary: `Trạng thái: ${order.status} → ${nextStatus}`,
    metadata: { from: order.status, to: nextStatus },
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, ctx: Ctx) {
  const gate = await requireAdmin();
  if (!gate.ok) return gate.response;

  const { id } = await ctx.params;

  try {
    await prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({
        where: { id },
        include: { items: true },
      });
      if (!order) throw new Error("NOT_FOUND");

      if (orderHadStockDeducted(order.status)) {
        for (const it of order.items) {
          await tx.productVariant.update({
            where: { id: it.productVariantId },
            data: { stockQuantity: { increment: it.quantity } },
          });
          await tx.inventoryLog.create({
            data: {
              productVariantId: it.productVariantId,
              change: it.quantity,
              reason: `Admin delete order ${id}`,
            },
          });
        }
      }

      await tx.order.delete({ where: { id } });
    });
    await recordAdminAudit({
      actorUserId: gate.session.sub,
      action: "order.delete",
      entityType: "Order",
      entityId: id,
      summary: "Xóa đơn hàng (admin)",
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof Error && e.message === "NOT_FOUND") {
      return NextResponse.json({ error: "Không tìm thấy đơn" }, { status: 404 });
    }
    return NextResponse.json({ error: "Không xóa được đơn" }, { status: 400 });
  }
}
