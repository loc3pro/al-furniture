/** Chuỗi hiển thị / snapshot đơn hàng — kích thước (cm). */
export function formatSizeLabelCm(heightCm: number, lengthCm: number, widthCm: number): string {
  return `Cao ${heightCm} × Dài ${lengthCm} × Rộng ${widthCm} cm`;
}

/** Parse nhãn do `formatSizeLabelCm` tạo — không khớp thì null. */
export function parseSizeLabelCm(label: string): { heightCm: number; lengthCm: number; widthCm: number } | null {
  const m = /^Cao\s+(\d+)\s*[×x]\s*Dài\s+(\d+)\s*[×x]\s*Rộng\s+(\d+)\s*cm$/i.exec(label.trim());
  if (!m) return null;
  const heightCm = Number(m[1]);
  const lengthCm = Number(m[2]);
  const widthCm = Number(m[3]);
  if (![heightCm, lengthCm, widthCm].every((n) => Number.isFinite(n) && n >= 1)) return null;
  return { heightCm, lengthCm, widthCm };
}
