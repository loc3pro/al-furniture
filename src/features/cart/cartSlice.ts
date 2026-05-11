import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import { variantUnitPrice } from "@/lib/money";

export type CartLine = {
  variantId: string;
  productId: string;
  productSlug: string;
  productName: string;
  colorLabel: string;
  sizeLabel: string;
  /** Giá gốc SP (niêm yết, trước giảm) — với dòng cũ không có discountPercent thì đây là giá sau giảm của SP gốc (xem cartLineUnitPrice). */
  basePrice: number;
  /** Thiếu = giỏ lưu cũ: basePrice được coi là giá sau giảm của SP, không có % trên biến thể. */
  discountPercent?: number;
  salePrice?: number | null;
  priceAdjustment: number;
  quantity: number;
  imageUrl: string | null;
  maxStock: number;
  sku: string;
};

/** Lọc / chuẩn hoá dòng từ localStorage — tránh NaN hoặc thiếu field làm vỡ checkout. */
function sanitizeCartLinesFromStorage(raw: unknown): CartLine[] {
  if (!Array.isArray(raw)) return [];
  const out: CartLine[] = [];
  for (const row of raw) {
    if (!row || typeof row !== "object") continue;
    const l = row as Partial<CartLine>;
    if (typeof l.variantId !== "string" || !l.variantId.trim()) continue;
    if (typeof l.productId !== "string" || !l.productId.trim()) continue;
    if (typeof l.productSlug !== "string") continue;
    if (typeof l.productName !== "string") continue;
    if (typeof l.colorLabel !== "string") continue;
    if (typeof l.sizeLabel !== "string") continue;
    const basePrice = Number(l.basePrice);
    const priceAdjustment = Number(l.priceAdjustment);
    const quantity = Math.floor(Number(l.quantity));
    const maxStock = Math.max(1, Math.floor(Number(l.maxStock)) || 1);
    if (!Number.isFinite(basePrice) || basePrice < 0) continue;
    if (!Number.isFinite(priceAdjustment)) continue;
    if (!Number.isFinite(quantity) || quantity < 1) continue;
    const sku = typeof l.sku === "string" ? l.sku : "";
    const rawImg = typeof l.imageUrl === "string" ? l.imageUrl.trim() : "";
    const imageUrl =
      rawImg &&
      (rawImg.startsWith("https://") || rawImg.startsWith("http://") || rawImg.startsWith("/"))
        ? rawImg
        : null;
    const salePrice =
      l.salePrice == null
        ? null
        : typeof l.salePrice === "number" && Number.isFinite(l.salePrice)
          ? l.salePrice
          : null;
    const discountPercent =
      l.discountPercent !== undefined && typeof l.discountPercent === "number" && Number.isFinite(l.discountPercent)
        ? l.discountPercent
        : undefined;
    out.push({
      variantId: l.variantId.trim(),
      productId: l.productId.trim(),
      productSlug: l.productSlug,
      productName: l.productName,
      colorLabel: l.colorLabel,
      sizeLabel: l.sizeLabel,
      basePrice,
      discountPercent,
      salePrice,
      priceAdjustment,
      quantity: Math.min(quantity, maxStock),
      imageUrl,
      maxStock,
      sku,
    });
  }
  return out;
}

function loadFromStorage(): CartLine[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem("furniture_cart");
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return sanitizeCartLinesFromStorage(parsed);
  } catch {
    return [];
  }
}

const initialState: { lines: CartLine[] } = {
  lines: [],
};

const cartSlice = createSlice({
  name: "cart",
  initialState,
  reducers: {
    hydrate(state) {
      state.lines = loadFromStorage();
    },
    addLine(
      state,
      action: PayloadAction<{
        variantId: string;
        productId: string;
        productSlug: string;
        productName: string;
        colorLabel: string;
        sizeLabel: string;
        basePrice: number;
        discountPercent: number;
        salePrice?: number | null;
        priceAdjustment: number;
        quantity: number;
        imageUrl: string | null;
        maxStock: number;
        sku: string;
      }>
    ) {
      const p = action.payload;
      const existing = state.lines.find((l) => l.variantId === p.variantId);
      const nextQty = Math.min(
        p.maxStock,
        (existing?.quantity ?? 0) + p.quantity
      );
      if (nextQty <= 0) return;
      if (existing) {
        existing.quantity = nextQty;
        existing.basePrice = p.basePrice;
        existing.discountPercent = p.discountPercent;
        existing.salePrice = p.salePrice ?? null;
        existing.priceAdjustment = p.priceAdjustment;
      } else {
        state.lines.push({
          variantId: p.variantId,
          productId: p.productId,
          productSlug: p.productSlug,
          productName: p.productName,
          colorLabel: p.colorLabel,
          sizeLabel: p.sizeLabel,
          basePrice: p.basePrice,
          discountPercent: p.discountPercent,
          salePrice: p.salePrice ?? null,
          priceAdjustment: p.priceAdjustment,
          quantity: nextQty,
          imageUrl: p.imageUrl,
          maxStock: p.maxStock,
          sku: p.sku,
        });
      }
      if (typeof window !== "undefined") {
        localStorage.setItem("furniture_cart", JSON.stringify(state.lines));
      }
    },
    setQuantity(state, action: PayloadAction<{ variantId: string; quantity: number }>) {
      const { variantId, quantity } = action.payload;
      const line = state.lines.find((l) => l.variantId === variantId);
      if (!line) return;
      if (quantity <= 0) {
        state.lines = state.lines.filter((l) => l.variantId !== variantId);
      } else {
        line.quantity = Math.min(quantity, line.maxStock);
      }
      if (typeof window !== "undefined") {
        localStorage.setItem("furniture_cart", JSON.stringify(state.lines));
      }
    },
    removeLine(state, action: PayloadAction<string>) {
      state.lines = state.lines.filter((l) => l.variantId !== action.payload);
      if (typeof window !== "undefined") {
        localStorage.setItem("furniture_cart", JSON.stringify(state.lines));
      }
    },
    clear(state) {
      state.lines = [];
      if (typeof window !== "undefined") {
        localStorage.removeItem("furniture_cart");
      }
    },
  },
});

export const { hydrate, addLine, setQuantity, removeLine, clear } = cartSlice.actions;
export default cartSlice.reducer;

/**
 * Đơn giá một dòng giỏ.
 * - Có `discountPercent`: giá = (giá gốc biến thể hoặc giá gốc SP) sau % giảm.
 * - Không có (giỏ cũ): cộng dồn kiểu cũ `basePrice + priceAdjustment`.
 */
export function cartLineUnitPrice(line: CartLine): number {
  if (line.discountPercent !== undefined) {
    return variantUnitPrice(
      {
        basePrice: line.basePrice,
        salePrice: line.salePrice ?? null,
        discountPercent: line.discountPercent,
      },
      line.priceAdjustment,
    );
  }
  return line.basePrice + line.priceAdjustment;
}

export function selectCartTotal(lines: CartLine[]) {
  return lines.reduce((sum, l) => sum + cartLineUnitPrice(l) * l.quantity, 0);
}

export function selectCartCount(lines: CartLine[]) {
  return lines.reduce((n, l) => n + l.quantity, 0);
}
