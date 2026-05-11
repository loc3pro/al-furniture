import { formatVnd } from "@/lib/money";

/** Hiển thị ngắn quy tắc giảm của ô vòng quay (shop + admin). */
export function spinDiscountLabelVi(params: {
  discountType: string;
  discountValue: number;
  discountMaxVnd?: number | null;
}): string {
  if (params.discountType === "FIXED") {
    return formatVnd(params.discountValue);
  }
  const cap =
    params.discountMaxVnd != null && params.discountMaxVnd > 0
      ? Math.floor(Number(params.discountMaxVnd))
      : null;
  const pct = params.discountValue;
  if (cap != null) {
    return `${pct}% · tối đa ${formatVnd(cap)}`;
  }
  return `${pct}%`;
}
