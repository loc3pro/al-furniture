import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdminOrSeller } from "@/lib/admin-auth";
import { recordAdminAudit } from "@/lib/admin-audit";
import { PaymentMethod, OrderStatus } from "@prisma/client";
import { variantUnitPrice } from "@/lib/money";
import { enqueueOrderJob } from "@/lib/queue";
import { decrementVariantStockTx } from "@/lib/order-stock";
import { allocateOrderNumber } from "@/lib/order-number";

const itemSchema = z.object({
  variantId: z.string().trim().min(1),
  quantity: z.number().int().min(1).max(99),
});

const bodySchema = z.object({
  userId: z.union([z.string(), z.null()]).optional(),
  items: z.array(itemSchema).min(1),
  shipping: z.object({
    name: z.string().trim().min(1).max(200),
    phone: z.string().trim().min(8).max(30),
    email: z.union([z.string().trim().email(), z.literal("")]).optional(),
    line: z.string().trim().min(1).max(500),
    ward: z.string().trim().min(1).max(200),
    district: z.string().trim().min(1).max(200),
    city: z.string().trim().min(1).max(200),
  }),
  paymentMethod: z.enum(["COD"]).default("COD"),
});

/** Gộp trùng variant trong payload (cùng biến thể → cộng SL). */
function mergeItems(items: { variantId: string; quantity: number }[]) {
  const m = new Map<string, number>();
  for (const it of items) {
    const q = Math.min(99, Math.max(1, it.quantity));
    m.set(it.variantId, (m.get(it.variantId) ?? 0) + q);
  }
  return [...m.entries()].map(([variantId, quantity]) => ({ variantId, quantity }));
}

/** Tạo đơn thủ công (admin): COD, trừ tồn, trạng thái Đang xử lý */
export async function POST(req: Request) {
  const gate = await requireAdminOrSeller();
  if (!gate.ok) return gate.response;

  const json = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Dữ liệu đơn hàng không hợp lệ (kiểm tra địa chỉ, SĐT, dòng sản phẩm)." }, { status: 400 });
  }

  const uidRaw = parsed.data.userId;
  const uidTrim =
    uidRaw === null || uidRaw === undefined ? "" : typeof uidRaw === "string" ? uidRaw.trim() : "";
  const userId =
    uidTrim.length === 0
      ? null
      : /^c[a-z0-9]{20,40}$/i.test(uidTrim)
        ? uidTrim
        : null;
  if (uidTrim.length > 0 && userId === null) {
    return NextResponse.json({ error: "User ID không phải CUID hợp lệ." }, { status: 400 });
  }

  const items = mergeItems(parsed.data.items);
  const shipping = parsed.data.shipping;

  try {
    const order = await prisma.$transaction(async (tx) => {
      const variants = await tx.productVariant.findMany({
        where: { id: { in: items.map((i) => i.variantId) } },
        include: { product: true },
      });
      if (variants.length !== items.length) {
        throw new Error("VARIANT_NOT_FOUND");
      }

      let total = 0;
      const lines: {
        productVariantId: string;
        quantity: number;
        price: number;
        colorLabelSnapshot: string;
        sizeLabelSnapshot: string;
      }[] = [];

      for (const it of items) {
        const v = variants.find((x) => x.id === it.variantId)!;
        const unit = variantUnitPrice(
          {
            basePrice: v.product.basePrice,
            salePrice: v.product.salePrice,
            discountPercent: v.product.discountPercent,
          },
          v.priceAdjustment,
        );
        total += unit * it.quantity;
        lines.push({
          productVariantId: v.id,
          quantity: it.quantity,
          price: unit,
          colorLabelSnapshot: v.colorLabelVi,
          sizeLabelSnapshot: v.sizeLabelVi,
        });
      }

      const orderNumber = await allocateOrderNumber(tx);
      const created = await tx.order.create({
        data: {
          orderNumber,
          userId,
          placedByUserId: gate.session.sub,
          totalAmount: total,
          paymentMethod: PaymentMethod.COD,
          status: OrderStatus.PROCESSING,
          shippingAddress: {
            ...shipping,
            email: shipping.email || undefined,
          },
          items: { create: lines },
        },
      });

      for (const it of items) {
        await decrementVariantStockTx(tx, it.variantId, it.quantity, `Admin order ${created.id}`);
      }

      return created;
    });

    void enqueueOrderJob(order.id, "created");

    await recordAdminAudit({
      actorUserId: gate.session.sub,
      action: "order.manual_create",
      entityType: "Order",
      entityId: order.id,
      summary: `Đơn thủ công · ${order.totalAmount.toLocaleString("vi-VN")} ₫`,
      metadata: { itemCount: items.length },
    });

    return NextResponse.json({ orderId: order.id, orderNumber: order.orderNumber });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg === "OUT_OF_STOCK") {
      return NextResponse.json({ error: "Không đủ tồn kho" }, { status: 409 });
    }
    if (msg === "VARIANT_NOT_FOUND") {
      return NextResponse.json({ error: "Biến thể không hợp lệ" }, { status: 400 });
    }
    console.error(e);
    return NextResponse.json({ error: "Không tạo được đơn" }, { status: 500 });
  }
}
