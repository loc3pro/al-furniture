import type { Prisma } from "@prisma/client";

/** SP- + 11 chữ số (vd. SP-00000000001). Seq từ 1 … 999_999_999_999 */
export function formatProductCodeFromSeq(seq: number): string {
  if (!Number.isFinite(seq) || seq < 1 || seq > 999_999_999_999) {
    throw new RangeError("product sequence out of range");
  }
  return `SP-${String(seq).padStart(11, "0")}`;
}

type Tx = Prisma.TransactionClient;

/** Trong transaction — tăng ProductCounter và trả mã hiển thị. */
export async function allocateProductCode(tx: Tx): Promise<string> {
  const rows = await tx.$queryRaw<{ lastSeq: number }[]>`
    UPDATE "ProductCounter"
    SET "lastSeq" = "lastSeq" + 1
    WHERE id = 'global'
    RETURNING "lastSeq" AS "lastSeq"
  `;
  const seq = rows[0]?.lastSeq;
  if (seq == null || typeof seq !== "number") {
    throw new Error("PRODUCT_COUNTER_MISSING");
  }
  return formatProductCodeFromSeq(seq);
}
