/**
 * JSON.stringify với key object được sắp xếp — so sánh snapshot form (dirty check).
 */
export function stableValueJson(value: unknown): string {
  return JSON.stringify(normalizeStable(value));
}

function normalizeStable(value: unknown): unknown {
  if (value === null) return null;
  if (value === undefined) return null;
  if (typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map(normalizeStable);
  const o = value as Record<string, unknown>;
  const keys = Object.keys(o).sort();
  const out: Record<string, unknown> = {};
  for (const k of keys) {
    const v = o[k];
    if (v === undefined) continue;
    out[k] = normalizeStable(v);
  }
  return out;
}
