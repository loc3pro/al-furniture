const MAX_TAGS = 8;
const MAX_TAG_LEN = 40;

/** Chuẩn hóa mảng tag từ DB / API. */
export function normalizeProductTagList(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const out: string[] = [];
  const seen = new Set<string>();
  for (const x of raw) {
    const s = String(x).trim().replace(/\s+/g, " ");
    if (!s || s.length > MAX_TAG_LEN) continue;
    const k = s.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(s);
    if (out.length >= MAX_TAGS) break;
  }
  return out;
}

/**
 * Parse ô admin "tag1, tag2" → mảng lưu DB.
 */
export function parseProductTagsFromFormInput(raw: string): string[] {
  const parts = raw
    .split(/[,;]+/u)
    .map((s) => s.trim().replace(/\s+/g, " "))
    .filter(Boolean);
  return normalizeProductTagList(parts);
}

export function tagsToFormInput(tags: string[] | null | undefined): string {
  return normalizeProductTagList(tags ?? []).join(", ");
}
