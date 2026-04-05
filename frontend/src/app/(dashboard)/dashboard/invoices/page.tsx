import type { Metadata } from "next";

import { DashboardPageHeader } from "@/components/layout/dashboard-page-header";
import { InvoicesPanel } from "@/features/workspace/components/invoices-panel";

export const metadata: Metadata = {
  title: "Invoices",
};

export default function InvoicesPage() {
  return (
    <>
      <DashboardPageHeader
        title="Invoices"
        description="Per-company invoices with totals in minor units — create drafts, then update status. Subscription renewals also create invoice rows."
      />
      <InvoicesPanel />
    </>
  );
}
