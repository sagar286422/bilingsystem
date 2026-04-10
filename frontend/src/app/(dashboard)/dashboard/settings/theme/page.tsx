import type { Metadata } from "next";

import { DashboardPageHeader } from "@/components/layout/dashboard-page-header";
import { ThemeSettingsPanel } from "@/features/dashboard/components/theme-settings-panel";

export const metadata: Metadata = {
  title: "Appearance",
};

export default function ThemeSettingsPage() {
  return (
    <>
      <DashboardPageHeader
        title="Appearance"
        description="Choose light or dark mode and a color theme for accents across the dashboard."
      />
      <div className="px-4 py-8 sm:px-8">
        <ThemeSettingsPanel />
      </div>
    </>
  );
}
