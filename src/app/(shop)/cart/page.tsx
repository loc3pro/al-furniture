"use client";

import Link from "next/link";
import { Trash2 } from "lucide-react";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { cartLineUnitPrice, removeLine, selectCartTotal, setQuantity } from "@/features/cart/cartSlice";
import { QuantityStepper } from "@/components/ui/QuantityStepper";
import { ProductCardMediaImage } from "@/components/product/ProductCardMediaImage";
import { formatVnd } from "@/lib/money";
import { formatCartLinesAndPieces } from "@/lib/cart-summary-label";
import { showAppToast } from "@/lib/app-toast";
import styles from "./CartPage.module.scss";

export default function CartPage() {
  const lines = useAppSelector((s) => s.cart.lines);
  const dispatch = useAppDispatch();
  const total = selectCartTotal(lines);

  if (lines.length === 0) {
    return (
      <div className={`container ${styles.empty}`}>
        <h1 className={styles.emptyTitle}>Giỏ hàng</h1>
        <p className="muted">Chưa có sản phẩm.</p>
        <Link href="/products" className="btn btn--primary" style={{ marginTop: "1rem" }}>
          Xem sản phẩm
        </Link>
      </div>
    );
  }

  return (
    <div className={`container ${styles.page}`}>
      <h1 className={styles.title}>Giỏ hàng</h1>
      <p className={styles.rollup}>
        {formatCartLinesAndPieces(lines)}
        <span className={styles.rollupSep}> · </span>
        <span className={styles.rollupStrong}>{formatVnd(total)}</span>
      </p>
      <div className={styles.list}>
        {lines.map((l) => {
          const unit = cartLineUnitPrice(l);
          const variantDetail = `${l.colorLabel} · ${l.sizeLabel}`;
          return (
            <div key={l.variantId} className={styles.line}>
              <div className={styles.thumbWrap}>
                {l.imageUrl ? <ProductCardMediaImage src={l.imageUrl} sizes="80px" /> : null}
              </div>
              <div className={styles.body}>
                <Link
                  href={`/products/${l.productSlug}`}
                  className={styles.productLink}
                  title={l.productName}
                >
                  {l.productName}
                </Link>
                <span className={styles.variantPill} title={variantDetail}>
                  {l.colorLabel} · {l.sizeLabel}
                </span>
                <p className={styles.unitPrice} title={`Đơn giá: ${formatVnd(unit)}`}>
                  {formatVnd(unit)}
                </p>
              </div>
              <div className={styles.actions}>
                <button
                  type="button"
                  className={styles.removeIconBtn}
                  aria-label={`Xóa ${l.productName} khỏi giỏ`}
                  onClick={() => {
                    dispatch(removeLine(l.variantId));
                    showAppToast("Đã xóa khỏi giỏ hàng");
                  }}
                >
                  <Trash2 size={18} strokeWidth={2} aria-hidden />
                </button>
                <div className={styles.stepperOuter}>
                  <QuantityStepper
                    size="sm"
                    value={l.quantity}
                    max={l.maxStock}
                    onChange={(quantity) =>
                      dispatch(setQuantity({ variantId: l.variantId, quantity }))
                    }
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <div className={styles.footer}>
        <div>
          <div className={styles.subtotal}>
            Tổng thanh toán (ước tính): <strong>{formatVnd(total)}</strong>
          </div>
          <p className={styles.shippingNote}>Giá trên chưa bao gồm phí vận chuyển.</p>
        </div>
        <Link href="/checkout" className={`btn btn--primary ${styles.checkoutBtn}`}>
          Thanh toán
        </Link>
      </div>
    </div>
  );
}
