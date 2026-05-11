import { NextResponse } from "next/server";
import { z } from "zod";
import { computeOrderDeposit } from "@/lib/deposit";
import { findValidSpinCouponForCheckout } from "@/lib/checkout-spin-coupon";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { variantUnitPrice } from "@/lib/money";

const bodySchema = z.object({
  items: z
    .array(
      z.object({
        variantId: z.string().min(1),
        quantity: z.number().int().min(1).max(99),
      }),
    )
    .min(1),
  spinCouponCode: z.string().max(40).optional(),
});

/** Tính tổng + điều kiện đặt cọc (theo cấu hình sản phẩm) */
export async function POST(req: Request) {
  const json = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Payload không hợp lệ" }, { status: 400 });
  }

  const { items } = parsed.data;
  // Dùng `include: { product: true }` thay vì `select: { depositAmount: true }`:
  // nếu `npx prisma generate` lỗi EPERM, client cũ không biết field `depositAmount` → Prisma ném
  // "Unknown field ... Available options are marked with ?". Lấy full product an toàn hơn.
  const variants = await prisma.productVariant.findMany({
    where: { id: { in: items.map((i) => i.variantId) } },
    include: { product: true },
  });
  if (variants.length !== items.length) {
    return NextResponse.json({ error: "Sản phẩm không hợp lệ" }, { status: 400 });
  }

  const lines: { unitPrice: number; quantity: number; depositPerUnit: number | null }[] = [];
  let total = 0;
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
      unitPrice: unit,
      quantity: it.quantity,
      depositPerUnit: v.product.depositAmount ?? null,
    });
  }

  const dep = computeOrderDeposit(lines);

  let couponDiscount = 0;
  let spinCouponCodeNormalized: string | null = null;
  const spinRaw = parsed.data.spinCouponCode?.trim();
  if (spinRaw) {
    const session = await getSession();
    if (!session?.sub) {
      return NextResponse.json({ error: "Đăng nhập để áp dụng mã vòng quay." }, { status: 401 });
    }
    const cv = await findValidSpinCouponForCheckout(prisma, spinRaw, session.sub, total);
    if ("error" in cv) {
      return NextResponse.json({ error: cv.error }, { status: 400 });
    }
    couponDiscount = cv.discount;
    spinCouponCodeNormalized = cv.coupon.code;
  }

  const grandTotal = Math.max(0, total - couponDiscount);
  const ratio = total > 0 ? grandTotal / total : 1;

  const depositDueScaled =
    dep.eligible && dep.depositDue > 0 ? Math.max(0, Math.round(dep.depositDue * ratio)) : dep.depositDue;
  const balanceDueScaled =
    dep.eligible && dep.balanceDue >= 0 ? Math.max(0, grandTotal - depositDueScaled) : Math.max(0, grandTotal);

  return NextResponse.json({
    total: grandTotal,
    subtotalBeforeCoupon: total,
    couponDiscount,
    spinCouponApplied: spinCouponCodeNormalized,
    depositEligible: dep.eligible,
    depositDue: depositDueScaled,
    balanceDue: balanceDueScaled,
  });
}
