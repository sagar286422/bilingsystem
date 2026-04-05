import Link from "next/link";
import {
  ArrowRight,
  Building2,
  Globe2,
  Package,
} from "lucide-react";

import { MarketingHomeGate } from "@/components/auth/marketing-home-gate";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const highlights = [
  {
    title: "Organizations, companies, teams",
    description:
      "Top-level orgs own everything. Companies are legal billing entities with currency, tax IDs, and gateway defaults. Teams operationalize geo, product, or custom scopes—with RBAC at each layer.",
    icon: Building2,
  },
  {
    title: "Products, prices, core billing",
    description:
      "Stripe-style products and versioned prices (the price_id abstraction), customers, subscriptions, invoices, transactions, and promo codes—structured for audit-friendly growth.",
    icon: Package,
  },
  {
    title: "Multi-gateway, API-first",
    description:
      "Payment abstraction for Stripe, Razorpay, and more—route by country and currency, BYOK when you need it. Versioned /v1 APIs and org-scoped keys for developers.",
    icon: Globe2,
  },
] as const;

export default function HomePage() {
  return (
    <MarketingHomeGate>
    <div className="relative overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,oklch(0.52_0.12_175/0.18),transparent)]"
      />
      <section className="relative mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-28">
        <p className="mb-4 text-sm font-medium text-primary">
          Phase 0 → 1: foundation, then core billing
        </p>
        <h1 className="max-w-2xl text-4xl font-semibold tracking-tight text-foreground sm:text-5xl sm:leading-tight">
          Developer-first billing for complex, multi-entity businesses.
        </h1>
        <p className="mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground">
          One system for organizations that need more than a single legal
          entity: isolate data per org, bill under the right company and
          invoice branding, and give teams scoped access—then layer customers,
          subscriptions, usage events, ledgers, and webhooks as you scale.
        </p>
        <div className="mt-10 flex flex-wrap gap-3">
          <Button size="lg" asChild>
            <Link href="/register">
              Get started
              <ArrowRight className="size-4" />
            </Link>
          </Button>
          <Button size="lg" variant="outline" asChild>
            <Link href="/dashboard">Open dashboard</Link>
          </Button>
        </div>
      </section>
      <section className="relative mx-auto grid max-w-6xl grid-cols-1 gap-4 px-4 pb-24 sm:grid-cols-3 sm:px-6">
        {highlights.map(({ title, description, icon: Icon }) => (
          <Card
            key={title}
            className="border-border/80 bg-card/60 shadow-sm backdrop-blur-sm transition-shadow hover:shadow-md"
          >
            <CardHeader>
              <Icon className="mb-2 size-9 text-primary" aria-hidden />
              <CardTitle className="text-lg">{title}</CardTitle>
              <CardDescription className="text-pretty">
                {description}
              </CardDescription>
            </CardHeader>
          </Card>
        ))}
      </section>
    </div>
    </MarketingHomeGate>
  );
}
