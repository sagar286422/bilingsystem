import type { Metadata } from "next";

import { DashboardPageHeader } from "@/components/layout/dashboard-page-header";
import { PaymentPagesPanel } from "@/features/workspace/components/payment-pages-panel";

export const metadata: Metadata = {
  title: "Payment pages",
};

export default function PaymentPagesRoute() {
  return (
    <>
      <DashboardPageHeader
        title="Payment pages"
        description="Shareable checkout links tied to catalog prices — platform or BYOK Razorpay."
      />
      <PaymentPagesPanel />
    </>
  );
}
