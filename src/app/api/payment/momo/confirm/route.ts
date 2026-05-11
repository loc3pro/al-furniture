import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { OrderStatus, PaymentMethod } from "@prisma/client";
import { enqueueOrderJob } from "@/lib/queue";
import { decrementVariantStockTx } from "@/lib/order-stock";

const bodySchema = z.object({
  orderId: z.string().min(1),
});

/** Xác nhận thanh toán MoMo (mock / sandbox). Idempotent — chỉ một request được trừ kho. */
export async function POST(req: Request) {
  const json = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Thiếu orderId" }, { status: 400 });
  }

  const { orderId } = parsed.data;

  try {
    const result = await prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({
        where: { id: orderId },
        include: { items: true, paymentTxs: true },
      });
      if (!order) {
        throw new Error("NOT_FOUND");
      }
      if (order.paymentMethod !== PaymentMethod.MOMO) {
        throw new Error("NOT_MOMO");
      }

      const claimed = await tx.order.updateMany({
        where: { id: orderId, status: OrderStatus.PENDING },
        data: { status: OrderStatus.PROCESSING },
      });

      if (claimed.count === 0) {
        const latest = await tx.order.findUnique({
          where: { id: orderId },
          select: { status: true },
        });
        if (!latest) throw new Error("NOT_FOUND");
        return { already: true as const };
      }

      for (const it of order.items) {
        await decrementVariantStockTx(
          tx,
          it.productVariantId,
          it.quantity,
          `MoMo paid ${order.id}`,
        );
      }

      const pendingTx = await tx.paymentTransaction.findFirst({
        where: { orderId, provider: "MOMO", status: "PENDING" },
      });
      if (pendingTx) {
        await tx.paymentTransaction.update({
          where: { id: pendingTx.id },
          data: {
            status: "SUCCESS",
            rawData: { mockConfirmed: true, at: new Date().toISOString() },
          },
        });
      }

      return { already: false as const };
    });

    if (result && !result.already) {
      void enqueueOrderJob(orderId, "paid");
    }

    return NextResponse.json({ ok: true, orderId });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg === "NOT_FOUND") {
      return NextResponse.json({ error: "Không tìm thấy đơn" }, { status: 404 });
    }
    if (msg === "NOT_MOMO") {
      return NextResponse.json({ error: "Đơn không phải MoMo" }, { status: 400 });
    }
    if (msg === "OUT_OF_STOCK") {
      return NextResponse.json({ error: "Không đủ tồn kho khi thanh toán" }, { status: 409 });
    }
    console.error(e);
    return NextResponse.json({ error: "Không xác nhận được" }, { status: 500 });
  }
}
