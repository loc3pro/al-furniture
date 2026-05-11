"use client";

import { Printer } from "lucide-react";
import { AdminBackLink } from "@/components/admin/AdminBackNav";
import styles from "./invoice-document.module.scss";

export function InvoicePrintToolbar({ backHref, backLabel }: { backHref: string; backLabel?: string }) {
  return (
    <>
      <AdminBackLink href={backHref}>{backLabel ?? "Quay lại"}</AdminBackLink>
      <button type="button" className={`btn btn--primary ${styles.printBtn}`} onClick={() => window.print()}>
        <Printer size={18} strokeWidth={2.25} aria-hidden />
        In hoặc lưu PDF
      </button>
    </>
  );
}
