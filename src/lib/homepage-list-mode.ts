/**
 * Chế độ danh sách section (AUTO / CUSTOM).
 * `stored` null: bản ghi trước khi có cột mode — có ID thì coi như CUSTOM.
 */
export function resolveListMode(stored: string | null | undefined, idsNonEmpty: boolean): "AUTO" | "CUSTOM" {
  if (stored === "CUSTOM") return "CUSTOM";
  if (stored === "AUTO") return "AUTO";
  return idsNonEmpty ? "CUSTOM" : "AUTO";
}
