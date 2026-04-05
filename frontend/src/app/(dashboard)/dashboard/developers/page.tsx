import type { Metadata } from "next";

import { DashboardPageHeader } from "@/components/layout/dashboard-page-header";
import { DevelopersApiKeysPanel } from "@/features/workspace/components/developers-api-keys-panel";

export const metadata: Metadata = {
  title: "Developers",
};

export default function DevelopersPage() {
  return (
    <>
      <DashboardPageHeader
        title="API & developers"
        description="Org-scoped API keys for /api/v1 — separate from Razorpay merchant keys (used when creating payments)."
      />
      <DevelopersApiKeysPanel />
    </>
  );
}
