-- Giảm % có trần VNĐ (vd: 20% tối đa 50k). 0 = không giới hạn trần.
ALTER TABLE "SpinWheelSegment" ADD COLUMN "discountMaxVnd" INTEGER NOT NULL DEFAULT 0;
