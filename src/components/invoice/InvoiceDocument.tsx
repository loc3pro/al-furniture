import type { ReactNode } from "react";
import type { InvoiceViewModel } from "@/lib/invoice-view-model";
import { InvoicePaper } from "./InvoicePaper";
import styles from "./invoice-document.module.scss";

export function InvoiceDocument({ vm, toolbar }: { vm: InvoiceViewModel; toolbar: ReactNode }) {
  return (
    <>
      <div className={styles.toolbar}>{toolbar}</div>

      <div className={styles.printIsolation}>
        <InvoicePaper vm={vm} />
      </div>
    </>
  );
}
