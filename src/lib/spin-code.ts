import { randomBytes } from "crypto";

/** Mã coupon hiển thị cho khách — FW + 8 ký tự hex */
export function generateSpinCouponCode(): string {
  return `FW-${randomBytes(4).toString("hex").toUpperCase()}`;
}
