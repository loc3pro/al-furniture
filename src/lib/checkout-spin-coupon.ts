import { computeSpinCouponDiscount } from "@/lib/spin-coupon-discount";
import type { PrismaClient } from "@prisma/client";

/** Prisma client hoặc client trong `$transaction` */
type DbClient = Pick<PrismaClient, "issuedSpinCoupon">;

type SegmentSnap = {
  discountType: string;
  discountValue: number;
  discountMaxVnd: number;
  minOrderAmount: number;
};

export type IssuedWithSegment = {
  id: string;
  code: string;
  userId: string;
  usedAt: Date | null;
  expiresAt: Date;
  segment: SegmentSnap;
};

export async function findValidSpinCouponForCheckout(
  tx: DbClient,
  codeRaw: string,
  userId: string,
  subtotal: number,
): Promise<{ coupon: IssuedWithSegment; discount: number } | { error: string }> {
  const code = codeRaw.trim().toUpperCase();
  if (!code) return { error: "Thiếu mã coupon." };

  const row = await tx.issuedSpinCoupon.findUnique({
    where: { code },
    include: {
      segment: {
        select: {
          discountType: true,
          discountValue: true,
          discountMaxVnd: true,
          minOrderAmount: true,
        },
      },
    },
  });

  if (!row) return { error: "Mã không tồn tại." };
  if (row.userId !== userId) return { error: "Mã không thuộc tài khoản này." };
  if (row.usedAt) return { error: "Mã đã được sử dụng." };
  const now = new Date();
  if (row.expiresAt <= now) return { error: "Mã đã hết hạn." };

  const minAmt = row.segment.minOrderAmount ?? 0;
  if (subtotal < minAmt) {
    return { error: `Đơn tối thiểu ${minAmt.toLocaleString("vi-VN")} ₫ để dùng mã này.` };
  }

  const discount = computeSpinCouponDiscount(
    subtotal,
    row.segment.discountType,
    row.segment.discountValue,
    row.segment.discountMaxVnd,
  );
  if (discount <= 0) return { error: "Mã không áp dụng được cho giỏ hiện tại." };

  return {
    coupon: {
      id: row.id,
      code: row.code,
      userId: row.userId,
      usedAt: row.usedAt,
      expiresAt: row.expiresAt,
      segment: row.segment,
    },
    discount,
  };
}
