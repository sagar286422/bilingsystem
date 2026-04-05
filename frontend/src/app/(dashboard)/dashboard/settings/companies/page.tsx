import type { Metadata } from "next";

import { DashboardPageHeader } from "@/components/layout/dashboard-page-header";
import { CompaniesSettingsPanel } from "@/features/workspace/components/companies-settings-panel";

export const metadata: Metadata = {
  title: "Companies",
};

export default function CompaniesSettingsPage() {
  return (
    <>
      <DashboardPageHeader
        title="Companies"
        description="Legal billing entities — invoices and tax attach here. Requires organization owner or admin to create."
      />
      <CompaniesSettingsPanel />
    </>
  );
}
