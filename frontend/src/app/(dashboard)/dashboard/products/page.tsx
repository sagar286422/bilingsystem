import type { Metadata } from "next";

import { DashboardPageHeader } from "@/components/layout/dashboard-page-header";
import { ProductsCatalogPanel } from "@/features/workspace/components/products-catalog-panel";

export const metadata: Metadata = {
  title: "Products & prices",
};

export default function ProductsPage() {
  return (
    <>
      <DashboardPageHeader
        title="Products & prices"
        description="Create products and versioned prices (minor-unit amounts). Prices are immutable except deactivation."
      />
      <ProductsCatalogPanel />
    </>
  );
}
