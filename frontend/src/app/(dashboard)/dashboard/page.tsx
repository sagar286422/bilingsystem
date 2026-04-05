import type { Metadata } from "next";

import { DashboardPageHeader } from "@/components/layout/dashboard-page-header";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Overview",
};

export default function DashboardPage() {
  return (
    <>
      <DashboardPageHeader
        title="Overview"
        description="High-level health of your billing workspace — revenue, subscriptions, and payment activity across gateways."
      />
      <div className="space-y-6 px-4 py-8 sm:px-8">
        <div className="flex flex-wrap gap-2 text-xs">
          <span className="rounded-full border border-border/80 bg-muted/40 px-2.5 py-1 font-medium text-muted-foreground">
            Multi-entity orgs
          </span>
          <span className="rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1 font-medium text-primary">
            Stripe · Razorpay · more
          </span>
          <span className="rounded-full border border-border/80 bg-muted/40 px-2.5 py-1 font-medium text-muted-foreground">
            API-first /v1
          </span>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <Card className="border-border/80 shadow-sm">
            <CardHeader>
              <CardTitle className="text-base font-medium">MRR</CardTitle>
              <CardDescription className="text-2xl font-semibold tabular-nums text-foreground">
                —
              </CardDescription>
              <p className="text-xs text-muted-foreground">
                Connect payouts & plans to populate
              </p>
            </CardHeader>
          </Card>
          <Card className="border-border/80 shadow-sm">
            <CardHeader>
              <CardTitle className="text-base font-medium">
                Active subscriptions
              </CardTitle>
              <CardDescription className="text-2xl font-semibold tabular-nums text-foreground">
                —
              </CardDescription>
              <p className="text-xs text-muted-foreground">
                Trials and renewals roll up here
              </p>
            </CardHeader>
          </Card>
          <Card className="border-border/80 shadow-sm">
            <CardHeader>
              <CardTitle className="text-base font-medium">Invoices</CardTitle>
              <CardDescription className="text-2xl font-semibold tabular-nums text-foreground">
                —
              </CardDescription>
              <p className="text-xs text-muted-foreground">
                Open, paid, and past-due counts
              </p>
            </CardHeader>
          </Card>
        </div>
        <Card className="border-dashed border-border/80 bg-muted/15">
          <CardHeader>
            <CardTitle className="text-base">Use the sidebar to explore</CardTitle>
            <CardDescription className="text-pretty">
              Sections follow a Stripe- / Razorpay-style console: customers and
              catalog under Business, subscriptions and invoices under Billing,
              multi-gateway money movement under Payments, and API keys under
              Developers. Each area will bind to your backend as endpoints go
              live.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    </>
  );
}
