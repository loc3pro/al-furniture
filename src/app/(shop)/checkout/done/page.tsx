import { Suspense } from "react";
import { SectionLoading } from "@/components/ui/SectionLoading";
import { CheckoutDoneBody } from "./CheckoutDoneBody";

export default function CheckoutDonePage() {
  return (
    <Suspense
      fallback={
        <div className="container" style={{ padding: "3rem 0", maxWidth: 560 }}>
          <SectionLoading fill label="Đang tải" />
        </div>
      }
    >
      <CheckoutDoneBody />
    </Suspense>
  );
}
