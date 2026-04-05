import type { Metadata } from "next";

import { DashboardPageHeader } from "@/components/layout/dashboard-page-header";
import { OrganizationSettingsPanel } from "@/features/workspace/components/organization-settings-panel";

export const metadata: Metadata = {
  title: "Organization",
};

export default function OrganizationSettingsPage() {
  return (
    <>
      <DashboardPageHeader
        title="Organization"
        description="The workspace container for companies, teams, and billing data — one org can own many legal entities."
      />
      <OrganizationSettingsPanel />
    </>
  );
}
