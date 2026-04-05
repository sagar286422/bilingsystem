import type { Metadata } from "next";

import { DashboardPageHeader } from "@/components/layout/dashboard-page-header";
import { GatewaysPanel } from "@/features/workspace/components/gateways-panel";

export const metadata: Metadata = {
  title: "Payment gateways",
};

export default function GatewaysPage() {
  return (
    <>
      <DashboardPageHeader
        title="Payment gateways"
        description="Platform Razorpay (.env) vs bring-your-own keys (encrypted). Platform fee % is recorded per transaction for your ledger."
      />
      <GatewaysPanel />
    </>
  );
}

