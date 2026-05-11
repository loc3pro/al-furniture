-- Đảm bảo bảng tồn tại (shadow DB / DB chưa chạy migration baseline spin).
CREATE TABLE IF NOT EXISTS "SpinWheelConfig" (
    "id" TEXT NOT NULL,
    "eventActive" BOOLEAN NOT NULL DEFAULT false,
    "bannerTitle" TEXT NOT NULL DEFAULT 'Vòng quay may mắn',
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "maxSpinsPerUserDay" INTEGER NOT NULL DEFAULT 5,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SpinWheelConfig_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "SpinWheelSegment" (
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

INSERT INTO "SpinWheelConfig" ("id", "eventActive", "bannerTitle", "maxSpinsPerUserDay", "updatedAt")
VALUES ('default', false, 'Vòng quay may mắn', 5, CURRENT_TIMESTAMP)
ON CONFLICT ("id") DO NOTHING;

-- Chuẩn hoá trọng số ô vòng quay về thang 1–100 (giữ tỷ lệ tương đối giữa các ô có weight > 0).
-- weight = 0 giữ nguyên (ô không tham gia quay).

UPDATE "SpinWheelSegment" SET "weight" = 0 WHERE "weight" < 0;

WITH sums AS (
  SELECT COALESCE(SUM("weight") FILTER (WHERE "weight" > 0), 0)::double precision AS total
  FROM "SpinWheelSegment"
),
scaled AS (
  SELECT s.id,
    CASE
      WHEN s."weight" <= 0 THEN 0::double precision
      WHEN sums.total <= 0 THEN 1::double precision
      ELSE GREATEST(
        1::double precision,
        LEAST(
          100::double precision,
          ROUND((100.0 * s."weight" / sums.total)::numeric, 0)::double precision
        )
      )
    END AS new_w
  FROM "SpinWheelSegment" s
  CROSS JOIN sums
)
UPDATE "SpinWheelSegment" seg
SET "weight" = scaled.new_w
FROM scaled
WHERE seg.id = scaled.id;
