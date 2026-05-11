"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import styles from "./AdminBackNav.module.scss";

const BACK_LABEL = "Quay Lại";

/** Một dòng `←` + nhãn — `Link` điều hướng. */
export function AdminBackLink({ href, children }: { href: string; children?: ReactNode }) {
  return (
    <Link href={href} className={styles.root}>
      <span className={styles.icon} aria-hidden>
        ←
      </span>
      <span className={styles.text}>{children ?? BACK_LABEL}</span>
    </Link>
  );
}

/** Cùng giao diện với {@link AdminBackLink} — `button` (đóng panel / state nội bộ). */
export function AdminBackButton({ onClick, children }: { onClick: () => void; children?: ReactNode }) {
  return (
    <button type="button" className={styles.root} onClick={onClick}>
      <span className={styles.icon} aria-hidden>
        ←
      </span>
      <span className={styles.text}>{children ?? BACK_LABEL}</span>
    </button>
  );
}
