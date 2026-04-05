import type { Metadata } from "next";

import { DashboardPageHeader } from "@/components/layout/dashboard-page-header";
import { SettingsHubCards } from "@/features/dashboard/components/settings-hub-cards";

export const metadata: Metadata = {
  title: "Workspace settings",
};

export default function SettingsHubPage() {
  return (
    <>
      <DashboardPageHeader
        title="Workspace settings"
        description="Profile, organization, companies, team permissions, and preferences — the control center for your billing workspace."
      />
      <div className="space-y-6 px-4 py-8 sm:px-8">
        <p className="max-w-2xl text-sm text-muted-foreground">
          Notifications, locale, and billing defaults will live on this page in a
          later iteration — use the cards below for profile and workspace
          structure.
        </p>
        <SettingsHubCards />
      </div>
    </>
  );
}
