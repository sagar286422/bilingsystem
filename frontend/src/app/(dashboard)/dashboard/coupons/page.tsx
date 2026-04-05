import type { Metadata } from "next";

import { DashboardPageHeader } from "@/components/layout/dashboard-page-header";
import { ConsoleSectionPlaceholder } from "@/features/dashboard/components/console-section-placeholder";

export const metadata: Metadata = {
  title: "Coupons",
};

export default function CouponsPage() {
  return (
    <>
      <DashboardPageHeader
        title="Coupons"
        description="Promotional codes, fixed or percentage discounts, duration, and redemption limits."
      />
      <ConsoleSectionPlaceholder
        title="Discount engine"
        description="Soon: stack rules, first-time-only, product- or plan-scoped coupons, and audit trail per redemption."
        footnote="Keeps parity with how Stripe Promotion Codes map to subscriptions and invoices."
      />
    </>
  );
}
