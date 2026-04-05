import type { Metadata } from "next";

import { DashboardPageHeader } from "@/components/layout/dashboard-page-header";
import { SubscriptionsPanel } from "@/features/workspace/components/subscriptions-panel";

export const metadata: Metadata = {
  title: "Subscriptions",
};

export default function SubscriptionsPage() {
  return (
    <>
      <DashboardPageHeader
        title="Subscriptions"
        description="Create subscriptions for a customer with a recurring price — opens the billing period, invoice, and test transaction."
      />
      <SubscriptionsPanel />
    </>
  );
}
