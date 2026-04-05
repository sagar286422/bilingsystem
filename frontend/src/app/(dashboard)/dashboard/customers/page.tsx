import type { Metadata } from "next";

import { DashboardPageHeader } from "@/components/layout/dashboard-page-header";
import { CustomersPanel } from "@/features/workspace/components/customers-panel";

export const metadata: Metadata = {
  title: "Customers",
};

export default function CustomersPage() {
  return (
    <>
      <DashboardPageHeader
        title="Customers"
        description="Buyers from payment pages and manual records — per company, with product and checkout context on each payment."
      />
      <CustomersPanel />
    </>
  );
}
