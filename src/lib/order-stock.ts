import type { Prisma } from "@prisma/client";

type Tx = Omit<
  Prisma.TransactionClient,
  "$connect" | "$disconnect" | "$on" | "$transaction" | "$extends" | "transaction"
>;

/**
 * Trừ tồn theo từng dòng: UPDATE ... WHERE "stockQuantity" >= qty.
 * Tránh race khi 2 request cùng đọc tồn cũ (so với findMany + if + update).
 */
export async function decrementVariantStockTx(
  tx: Tx,
  variantId: string,
  quantity: number,
  logReason: string,
): Promise<void> {
  const r = await tx.productVariant.updateMany({
    where: {
      id: variantId,
      stockQuantity: { gte: quantity },
    },
    data: {
      stockQuantity: { decrement: quantity },
    },
  });
  if (r.count !== 1) {
    throw new Error("OUT_OF_STOCK");
  }
  await tx.inventoryLog.create({
    data: {
      productVariantId: variantId,
      change: -quantity,
      reason: logReason,
    },
  });
}
