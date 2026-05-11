-- Bảng vòng quay (chạy ngay sau init): các migration 2026050212* UPDATE/ALTER "SpinWheelSegment"
-- cần bảng đã tồn tại. Đặt tên 20250430000001 để luôn áp dụng trước mọi migration tháng 5/6.

CREATE TABLE "SpinWheelConfig" (
    "id" TEXT NOT NULL,
    "eventActive" BOOLEAN NOT NULL DEFAULT false,
    "bannerTitle" TEXT NOT NULL DEFAULT 'Vòng quay may mắn',
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "maxSpinsPerUserDay" INTEGER NOT NULL DEFAULT 5,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SpinWheelConfig_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SpinWheelSegment" (
    "id" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "label" TEXT NOT NULL,
    "weight" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "quantityCap" INTEGER NOT NULL DEFAULT 100,
    "quantityWon" INTEGER NOT NULL DEFAULT 0,
    "discountType" TEXT NOT NULL DEFAULT 'PERCENT',
    "discountValue" INTEGER NOT NULL,
    "validityDays" INTEGER NOT NULL DEFAULT 14,
    "minOrderAmount" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SpinWheelSegment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "IssuedSpinCoupon" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "segmentId" TEXT NOT NULL,
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "orderId" TEXT,

    CONSTRAINT "IssuedSpinCoupon_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SpinWheelSpinLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "segmentId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SpinWheelSpinLog_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "IssuedSpinCoupon_code_key" ON "IssuedSpinCoupon"("code");

CREATE UNIQUE INDEX "IssuedSpinCoupon_orderId_key" ON "IssuedSpinCoupon"("orderId");

CREATE INDEX "IssuedSpinCoupon_userId_idx" ON "IssuedSpinCoupon"("userId");

CREATE INDEX "IssuedSpinCoupon_code_idx" ON "IssuedSpinCoupon"("code");

CREATE INDEX "SpinWheelSpinLog_userId_createdAt_idx" ON "SpinWheelSpinLog"("userId", "createdAt");

ALTER TABLE "IssuedSpinCoupon" ADD CONSTRAINT "IssuedSpinCoupon_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "IssuedSpinCoupon" ADD CONSTRAINT "IssuedSpinCoupon_segmentId_fkey" FOREIGN KEY ("segmentId") REFERENCES "SpinWheelSegment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "IssuedSpinCoupon" ADD CONSTRAINT "IssuedSpinCoupon_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "SpinWheelSpinLog" ADD CONSTRAINT "SpinWheelSpinLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "SpinWheelConfig" ("id", "eventActive", "bannerTitle", "maxSpinsPerUserDay", "updatedAt")
VALUES ('default', false, 'Vòng quay may mắn', 5, CURRENT_TIMESTAMP)
ON CONFLICT ("id") DO NOTHING;
