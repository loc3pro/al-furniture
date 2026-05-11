/** Tính tiền cọc đơn hàng — mọi SP phải có depositAmount > 0 mới được chọn đặt cọc */

export type DepositLineInput = {
  unitPrice: number;
  quantity: number;
  depositPerUnit: number | null;
};

export function computeOrderDeposit(lines: DepositLineInput[]) {
  const total = lines.reduce((s, l) => s + l.unitPrice * l.quantity, 0);
  const eligible = lines.every((l) => l.depositPerUnit != null && l.depositPerUnit > 0);
  if (!eligible || lines.length === 0) {
    return { total, eligible: false as const, depositDue: 0, balanceDue: total };
  }
  let depositDue = 0;
  for (const l of lines) {
    const lineTotal = l.unitPrice * l.quantity;
    const cap = Math.min((l.depositPerUnit as number) * l.quantity, lineTotal);
    depositDue += cap;
  }
  const balanceDue = Math.max(0, total - depositDue);
  return { total, eligible: true as const, depositDue, balanceDue };
}
