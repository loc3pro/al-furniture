/** Chuẩn hoá địa chỉ giao (JSON `shippingAddress`) thành khối text nhiều dòng cho hiển thị / in hóa đơn. */
export function formatShippingAddressBlock(addr: unknown): string {
  const a = (addr ?? {}) as Record<string, unknown>;
  const lines: string[] = [];
  const name = typeof a.name === "string" ? a.name : "";
  const phone = typeof a.phone === "string" ? a.phone : "";
  if (name || phone) lines.push([name, phone].filter(Boolean).join(" · "));
  const line = typeof a.line === "string" ? a.line : "";
  const ward = typeof a.ward === "string" ? a.ward : "";
  const district = typeof a.district === "string" ? a.district : "";
  const city = typeof a.city === "string" ? a.city : "";
  const addrLine = [line, ward, district, city].filter(Boolean).join(", ");
  if (addrLine) lines.push(addrLine);
  const note = typeof a.note === "string" ? a.note.trim() : "";
  if (note) lines.push(`Ghi chú: ${note}`);
  return lines.join("\n") || "—";
}
