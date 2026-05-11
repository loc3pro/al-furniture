import type { Prisma } from "@prisma/client";

/** O + 11 chữ số (vd. O00000000001). Seq từ 1 … 999_999_999_999 */
export function formatOrderNumberFromSeq(seq: number): string {
  if (!Number.isFinite(seq) || seq < 1 || seq > 999_999_999_999) {
    throw new RangeError("order sequence out of range");
  }
  return `O${String(seq).padStart(11, "0")}`;
}

type Tx = Prisma.TransactionClient;

/** Trong transaction — tăng OrderCounter và trả chuỗi hiển thị (Postgres RETURNING). */
export async function allocateOrderNumber(tx: Tx): Promise<string> {
  const rows = await tx.$queryRaw<{ lastSeq: number }[]>`
    UPDATE "OrderCounter"
    SET "lastSeq" = "lastSeq" + 1
    WHERE id = 'global'
    RETURNING "lastSeq" AS "lastSeq"
  `;
  const seq = rows[0]?.lastSeq;
  if (seq == null || typeof seq !== "number") {
    throw new Error("ORDER_COUNTER_MISSING");
  }
  return formatOrderNumberFromSeq(seq);
}
