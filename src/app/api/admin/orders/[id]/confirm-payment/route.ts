import { NextResponse } from "next/server";
import { OrderStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-auth";
import { resolvePaymentChannel } from "@/lib/order-payment-display";
import { enqueueOrderJob } from "@/lib/queue";
import { decrementVariantStockTx } from "@/lib/order-stock";

type Ctx = { params: Promise<{ id: string }> };

/**
 * Admin xác nhận đã nhận tiền (MoMo sandbox hoặc chuyển khoản).
 * Trừ tồn kho + PROCESSING + SUCCESS trên PaymentTransaction — idempotent (một request trừ kho).
 */
export async function POST(_req: Request, ctx: Ctx) {
  const gate = await requireAdmin();
  if (!gate.ok) return gate.response;

  const { id } = await ctx.params;

  try {
    const result = await prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({
        where: { id },
        include: { items: true, paymentTxs: true },
      });
      if (!order) {
        throw new Error("NOT_FOUND");
      }

      const channel = resolvePaymentChannel(order);
      if (channel !== "MOMO" && channel !== "BANK_TRANSFER") {
        throw new Error("NOT_ONLINE");
      }

      const alreadyPaid = order.paymentTxs.some(
        (t) =>
          (t.provider === "MOMO" || t.provider === "BANK_TRANSFER") &&
          ["SUCCESS", "SUCCEEDED", "PAID", "COMPLETED"].includes(t.status),
      );
      if (alreadyPaid) {
        return { already: true as const };
      }

      const claimed = await tx.order.updateMany({
        where: { id, status: OrderStatus.PENDING },
        data: { status: OrderStatus.PROCESSING },
      });

      if (claimed.count === 0) {
        const o2 = await tx.order.findUnique({
          where: { id },
          include: { paymentTxs: true },
        });
        if (!o2) throw new Error("NOT_FOUND");
        const paidNow = o2.paymentTxs.some(
          (t) =>
            (t.provider === "MOMO" || t.provider === "BANK_TRANSFER") &&
            ["SUCCESS", "SUCCEEDED", "PAID", "COMPLETED"].includes(t.status),
        );
        if (paidNow || o2.status !== OrderStatus.PENDING) {
          return { already: true as const };
        }
        throw new Error("BAD_STATE");
      }

      for (const it of order.items) {
        await decrementVariantStockTx(
          tx,
          it.productVariantId,
          it.quantity,
          `Admin confirm payment ${order.id}`,
        );
      }

      const pendingTx = order.paymentTxs.find(
        (t) =>
          (t.provider === "MOMO" || t.provider === "BANK_TRANSFER") && t.status === "PENDING",
      );
      if (pendingTx) {
        await tx.paymentTransaction.update({
          where: { id: pendingTx.id },
          data: {
            status: "SUCCESS",
            rawData: { adminConfirmed: true, at: new Date().toISOString() },
          },
        });
      }

      return { already: false as const };
    });

    if (!result.already) {
      void enqueueOrderJob(id, "paid");
    }

    return NextResponse.json({ ok: true, already: result.already });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg === "NOT_FOUND") {
      return NextResponse.json({ error: "Không tìm thấy đơn" }, { status: 404 });
    }
    if (msg === "NOT_ONLINE") {
      return NextResponse.json({ error: "Đơn không phải MoMo/chuyển khoản." }, { status: 400 });
    }
    if (msg === "BAD_STATE") {
      return NextResponse.json(
        { error: "Trạng thái đơn không cho phép xác nhận (chỉ đơn đang chờ thanh toán)." },
        { status: 400 },
      );
    }
    if (msg === "OUT_OF_STOCK") {
      return NextResponse.json({ error: "Không đủ tồn kho" }, { status: 409 });
    }
    console.error(e);
    return NextResponse.json({ error: "Không xác nhận được" }, { status: 500 });
  }
}
