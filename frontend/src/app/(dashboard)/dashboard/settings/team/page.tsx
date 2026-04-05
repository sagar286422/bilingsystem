import type { Metadata } from "next";

import { DashboardPageHeader } from "@/components/layout/dashboard-page-header";
import { TeamSettingsPanel } from "@/features/workspace/components/team-settings-panel";

export const metadata: Metadata = {
  title: "Team & permissions",
};

export default function TeamPermissionsPage() {
  return (
    <>
      <DashboardPageHeader
        title="Team & permissions"
        description="Create teams, invite members, and set per-team roles (viewer, member, team admin)."
      />
      <TeamSettingsPanel />
    </>
  );
}
