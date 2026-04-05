import type { Metadata } from "next";

import { DashboardPageHeader } from "@/components/layout/dashboard-page-header";
import { ConsoleSectionPlaceholder } from "@/features/dashboard/components/console-section-placeholder";

export const metadata: Metadata = {
  title: "Transactions",
};

export default function PaymentsPage() {
  return (
    <>
      <DashboardPageHeader
        title="Transactions"
        description="Unified payment timeline across gateways — charges, refunds, failures, and payout-ready exports."
      />
      <ConsoleSectionPlaceholder
        title="Payments ledger"
        description="Soon: filter by gateway (Stripe, Razorpay, others), settlement batches, reconciliation to invoices, and dispute states."
        footnote="Gateway-agnostic IDs in the API; each row still links to the underlying processor reference."
      />
    </>
  );
}
