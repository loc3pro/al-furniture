/** Màu các ô vòng quay — đồng bộ public `/lucky-wheel` và admin xem trước. */
export const SPIN_WHEEL_SEGMENT_PALETTE = [
  "#ef4444",
  "#f97316",
  "#eab308",
  "#22c55e",
  "#14b8a6",
  "#3b82f6",
  "#8b5cf6",
  "#d946ef",
  "#64748b",
  "#f43f5e",
  "#06b6d4",
  "#84cc16",
] as const;

/** `background` CSS cho vòng N ô (góc giống trang khách). */
export function spinWheelConicGradient(segmentCount: number): string {
  if (segmentCount <= 0) return "conic-gradient(from 0deg, #e2e8f0 0% 100%)";
  const parts: string[] = [];
  const n = segmentCount;
  const palette = SPIN_WHEEL_SEGMENT_PALETTE;
  for (let i = 0; i < n; i++) {
    const color = palette[i % palette.length]!;
    parts.push(`${color} ${(i / n) * 100}% ${((i + 1) / n) * 100}%`);
  }
  return `conic-gradient(from 0deg at 50% 50%, ${parts.join(", ")})`;
}
