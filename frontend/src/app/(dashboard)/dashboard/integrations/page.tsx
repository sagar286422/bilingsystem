import type { Metadata } from "next";

import { DashboardPageHeader } from "@/components/layout/dashboard-page-header";
import { ConsoleSectionPlaceholder } from "@/features/dashboard/components/console-section-placeholder";

export const metadata: Metadata = {
  title: "Integrations",
};

export default function IntegrationsPage() {
  return (
    <>
      <DashboardPageHeader
        title="Integrations"
        description="Automation and glue — Pabbly-style connectors, Slack, CRMs, and internal workflow hooks."
      />
      <ConsoleSectionPlaceholder
        title="Integration directory"
        description="Soon: install apps, map events to outbound webhooks, retry policies, and signed delivery logs."
        footnote="Complements native /v1 APIs for teams that want no-code paths first."
      />
    </>
  );
}
