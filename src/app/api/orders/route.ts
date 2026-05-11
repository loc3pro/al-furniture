import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { PaymentMethod, OrderStatus } from "@prisma/client";
import { computeOrderDeposit } from "@/lib/deposit";
import { variantUnitPrice } from "@/lib/money";
import { enqueueOrderJob } from "@/lib/queue";
import { decrementVariantStockTx } from "@/lib/order-stock";
import { allocateOrderNumber } from "@/lib/order-number";
import { findValidSpinCouponForCheckout } from "@/lib/checkout-spin-coupon";

const itemSchema = z.object({
  variantId: z.string().min(1),
  quantity: z.number().int().min(1).max(99),
});

const bodySchema = z.object({
  items: z.array(itemSchema).min(1),
  shipping: z.object({
    name: z.string().min(1).max(200),
    phone: z.string().min(8).max(30),
    email: z.string().email().optional().or(z.literal("")),
    line: z.string().min(1).max(500),
    ward: z.string().min(1).max(200),
    district: z.string().min(1).max(200),
    city: z.string().min(1).max(200),
  }),
  /** Nhận tại cửa hàng — server ghi đè địa chỉ theo showroom */
  pickupStoreId: z.string().min(1).optional(),
  paymentMethod: z.enum(["COD", "MOMO", "BANK_TRANSFER"]).default("COD"),
  customerNote: z.string().max(2000).optional().or(z.literal("")),
  payMode: z.enum(["FULL", "DEPOSIT"]).default("FULL"),
  /** Cọc nhập tay (thỏa thuận) — chỉ với chuyển khoản */
  depositNegotiated: z.boolean().optional(),
  manualDepositAmount: z.number().int().min(0).optional(),
  spinCouponCode: z.string().max(40).optional(),
});

export async function POST(req: Request) {
  const json = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Dữ liệu đơn hàng không hợp lệ" }, { status: 400 });
  }

  const session = await getSession();
  let { shipping } = parsed.data;
  const {
    items,
    paymentMethod,
    customerNote,
    payMode,
    depositNegotiated,
    manualDepositAmount,
    pickupStoreId,
    spinCouponCode,
  } = parsed.data;

  if (pickupStoreId) {
    const store = await prisma.retailStore.findFirst({
      where: { id: pickupStoreId, active: true },
      select: { id: true, name: true, address: true },
    });
    if (!store) {
      return NextResponse.json({ error: "Cửa hàng không hợp lệ hoặc đã đóng." }, { status: 400 });
    }
    const districtShort = store.name.length > 200 ? store.name.slice(0, 200) : store.name;
    shipping = {
      ...shipping,
      line: `[Nhận tại cửa hàng] ${store.name} — ${store.address}`,
      ward: "Nhận tại cửa hàng",
      district: districtShort,
      city: "Việt Nam",
    };
  }

  const pickupMeta = pickupStoreId ? { pickupStoreId, pickupMode: "STORE" as const } : {};

  const isMomo = paymentMethod === "MOMO";
  const isBank = paymentMethod === "BANK_TRANSFER";
  const isUpfrontOnline = isMomo || isBank;

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

      const depositLines = items.map((it) => {
        const v = variants.find((x) => x.id === it.variantId)!;
        const unit = variantUnitPrice(
          {
            basePrice: v.product.basePrice,
            salePrice: v.product.salePrice,
            discountPercent: v.product.discountPercent,
          },
          v.priceAdjustment,
        );
        return {
          unitPrice: unit,
          quantity: it.quantity,
          depositPerUnit: v.product.depositAmount,
        };
      });
      const dep = computeOrderDeposit(depositLines);

      const subtotal = total;
      let couponDiscount = 0;
      let spinCouponId: string | null = null;
      let spinNormCode: string | null = null;
      const spinRaw = spinCouponCode?.trim();
      if (spinRaw) {
        if (!session?.sub) {
          throw new Error("COUPON_AUTH");
        }
        const cv = await findValidSpinCouponForCheckout(tx, spinRaw, session.sub, subtotal);
        if ("error" in cv) {
          throw new Error("COUPON_INVALID");
        }
        couponDiscount = cv.discount;
        spinCouponId = cv.coupon.id;
        spinNormCode = cv.coupon.code;
      }

      const grandTotal = Math.max(0, subtotal - couponDiscount);
      const ratio = subtotal > 0 ? grandTotal / subtotal : 1;

      let depositDueVal: number | null = null;
      let balanceDueVal: number | null = null;
      const useManualDeposit = Boolean(depositNegotiated) && payMode === "DEPOSIT";

      if (payMode === "DEPOSIT") {
        if (!isUpfrontOnline) {
          throw new Error("DEPOSIT_REQUIRES_ONLINE");
        }
        if (useManualDeposit) {
          if (!isBank) {
            throw new Error("MANUAL_DEPOSIT_BANK_ONLY");
          }
          if (manualDepositAmount == null || manualDepositAmount < 1) {
            throw new Error("MANUAL_DEPOSIT_REQUIRED");
          }
          const amt = Math.round(manualDepositAmount);
          if (amt > grandTotal) {
            throw new Error("MANUAL_DEPOSIT_RANGE");
          }
          depositDueVal = amt;
          balanceDueVal = Math.max(0, grandTotal - amt);
        } else {
          if (!dep.eligible) {
            throw new Error("DEPOSIT_NOT_ELIGIBLE");
          }
          if (dep.depositDue <= 0) {
            throw new Error("DEPOSIT_NOT_ELIGIBLE");
          }
          depositDueVal = Math.max(0, Math.round(dep.depositDue * ratio));
          balanceDueVal = Math.max(0, grandTotal - depositDueVal);
        }
      }

      // Bank: cần enum BANK_TRANSFER (migrate + prisma generate). Client/DB cũ: tạm lưu MOMO + payChannel để tránh lỗi validate & không trừ kho (giống MoMo).
      const PM = PaymentMethod as unknown as Record<string, string>;
      const hasBankEnum = PM.BANK_TRANSFER === "BANK_TRANSFER";
      let paymentMethodValue: PaymentMethod;
      const bankChannelExtra: { payChannel?: "BANK_TRANSFER" } = {};
      if (isMomo) {
        paymentMethodValue = PaymentMethod.MOMO;
      } else if (isBank) {
        if (hasBankEnum) {
          paymentMethodValue = PM.BANK_TRANSFER as PaymentMethod;
        } else {
          paymentMethodValue = PaymentMethod.MOMO;
          bankChannelExtra.payChannel = "BANK_TRANSFER";
        }
      } else {
        paymentMethodValue = PaymentMethod.COD;
      }

      const orderNumber = await allocateOrderNumber(tx);

      const created = await tx.order.create({
        data: {
          orderNumber,
          userId: session?.sub ?? null,
          totalAmount: grandTotal,
          payMode,
          depositDue: payMode === "DEPOSIT" ? depositDueVal : null,
          balanceDue: payMode === "DEPOSIT" ? balanceDueVal : null,
          paymentMethod: paymentMethodValue,
          status: OrderStatus.PENDING,
          couponId: spinCouponId,
          shippingAddress: {
            ...shipping,
            email: shipping.email || undefined,
            ...(customerNote?.trim() ? { note: customerNote.trim() } : {}),
            ...(useManualDeposit ? { depositNegotiated: true } : {}),
            ...bankChannelExtra,
            ...pickupMeta,
            ...(couponDiscount > 0 && spinNormCode
              ? {
                  spinCoupon: {
                    code: spinNormCode,
                    discountVnd: couponDiscount,
                    subtotalBeforeCoupon: subtotal,
                  },
                }
              : {}),
          },
          items: { create: lines },
        },
      });

      if (spinCouponId) {
        await tx.issuedSpinCoupon.update({
          where: { id: spinCouponId },
          data: {
            usedAt: new Date(),
            orderId: created.id,
          },
        });
      }

      if (isMomo) {
        await tx.paymentTransaction.create({
          data: {
            orderId: created.id,
            provider: "MOMO",
            status: "PENDING",
            rawData: { mock: true },
            idempotencyKey: `momo_create_${created.id}`,
          },
        });
      } else if (isBank) {
        await tx.paymentTransaction.create({
          data: {
            orderId: created.id,
            provider: "BANK_TRANSFER",
            status: "PENDING",
            rawData: { note: "Chờ xác nhận chuyển khoản" },
            idempotencyKey: `bank_create_${created.id}`,
          },
        });
      } else {
        for (const it of items) {
          await decrementVariantStockTx(tx, it.variantId, it.quantity, `Order ${created.id}`);
        }
        await tx.order.update({
          where: { id: created.id },
          data: { status: OrderStatus.PROCESSING },
        });
      }

      return created;
    });

    void enqueueOrderJob(order.id, "created");

    return NextResponse.json({
      orderId: order.id,
      orderNumber: order.orderNumber,
      requiresMomoPayment: isMomo,
      requiresBankTransfer: isBank,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg === "OUT_OF_STOCK") {
      return NextResponse.json({ error: "Không đủ tồn kho" }, { status: 409 });
    }
    if (msg === "VARIANT_NOT_FOUND") {
      return NextResponse.json({ error: "Sản phẩm không hợp lệ" }, { status: 400 });
    }
    if (msg === "DEPOSIT_NOT_ELIGIBLE") {
      return NextResponse.json(
        { error: "Không thể đặt cọc: mỗi sản phẩm cần có tiền cọc cấu hình trong admin." },
        { status: 400 },
      );
    }
    if (msg === "DEPOSIT_REQUIRES_ONLINE") {
      return NextResponse.json(
        { error: "Đặt cọc cần thanh toán trước qua MoMo hoặc chuyển khoản." },
        { status: 400 },
      );
    }
    if (msg === "MANUAL_DEPOSIT_BANK_ONLY") {
      return NextResponse.json(
        { error: "Cọc thỏa thuận chỉ áp dụng khi chuyển khoản ngân hàng." },
        { status: 400 },
      );
    }
    if (msg === "MANUAL_DEPOSIT_RANGE") {
      return NextResponse.json(
        { error: "Số tiền cọc không được vượt quá tổng giá trị đơn." },
        { status: 400 },
      );
    }
    if (msg === "MANUAL_DEPOSIT_REQUIRED") {
      return NextResponse.json({ error: "Nhập số tiền cọc (VNĐ)." }, { status: 400 });
    }
    if (msg === "COUPON_AUTH") {
      return NextResponse.json({ error: "Đăng nhập để dùng mã vòng quay." }, { status: 401 });
    }
    if (msg === "COUPON_INVALID") {
      return NextResponse.json({ error: "Mã giảm giá không hợp lệ hoặc đã hết hạn." }, { status: 400 });
    }
    console.error(e);
    return NextResponse.json({ error: "Không tạo được đơn" }, { status: 500 });
  }
}
