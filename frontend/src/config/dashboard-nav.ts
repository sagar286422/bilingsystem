import type { LucideIcon } from "lucide-react";
import {
  Building2,
  Code2,
  CreditCard,
  FileText,
  Landmark,
  LayoutDashboard,
  Link as LinkIcon,
  Plug,
  Receipt,
  Repeat,
  Settings,
  Shield,
  ShoppingBag,
  User,
  Users,
  Wallet,
} from "lucide-react";

export type DashboardNavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  description?: string;
  /** Match pathname exactly (e.g. settings hub vs /settings/profile). */
  exactActive?: boolean;
};

export type DashboardNavSection = {
  title: string;
  badge?: string;
  items: DashboardNavItem[];
};

/**
 * Sidebar IA inspired by Stripe / Razorpay / Pabbly–style billing consoles.
 */
export const dashboardNavSections: DashboardNavSection[] = [
  {
    title: "Business",
    items: [
      {
        href: "/dashboard",
        label: "Overview",
        icon: LayoutDashboard,
        description: "Key metrics and activity",
      },
      {
        href: "/dashboard/customers",
        label: "Customers",
        icon: Users,
        description: "Billable accounts and contacts",
      },
      {
        href: "/dashboard/products",
        label: "Products & prices",
        icon: ShoppingBag,
        description: "Catalog and versioned pricing",
      },
      {
        href: "/dashboard/payment-pages",
        label: "Payment pages",
        icon: LinkIcon,
        description: "Hosted checkout links per price",
      },
    ],
  },
  {
    title: "Billing",
    items: [
      {
        href: "/dashboard/subscriptions",
        label: "Subscriptions",
        icon: Repeat,
        description: "Plans, renewals, trials",
      },
      {
        href: "/dashboard/invoices",
        label: "Invoices",
        icon: FileText,
        description: "Issued and draft invoices",
      },
      {
        href: "/dashboard/coupons",
        label: "Coupons",
        icon: Receipt,
        description: "Discounts and promos",
      },
    ],
  },
  {
    title: "Payments",
    badge: "Multi-gateway",
    items: [
      {
        href: "/dashboard/payments",
        label: "Transactions",
        icon: CreditCard,
        description: "Charges, refunds, payouts",
      },
      {
        href: "/dashboard/gateways",
        label: "Payment gateways",
        icon: Wallet,
        description: "Stripe, Razorpay, and more",
      },
      {
        href: "/dashboard/integrations",
        label: "Integrations",
        icon: Plug,
        description: "Pabbly-style workflows & apps",
      },
    ],
  },
  {
    title: "Workspace",
    items: [
      {
        href: "/dashboard/settings/organization",
        label: "Organization",
        icon: Building2,
        description: "Create or switch the active organization",
      },
      {
        href: "/dashboard/settings/companies",
        label: "Companies",
        icon: Landmark,
        description: "Legal entities, currencies, tax IDs",
      },
      {
        href: "/dashboard/settings/team",
        label: "Team & permissions",
        icon: Shield,
        description: "Members, roles, and access",
      },
    ],
  },
  {
    title: "Account",
    items: [
      {
        href: "/dashboard/settings/profile",
        label: "Profile",
        icon: User,
        description: "Your name, email, and security",
      },
      {
        href: "/dashboard/settings",
        label: "Preferences",
        icon: Settings,
        description: "Notifications, locale, workspace defaults",
        exactActive: true,
      },
    ],
  },
  {
    title: "Developers",
    items: [
      {
        href: "/dashboard/developers",
        label: "API & webhooks",
        icon: Code2,
        description: "Keys, events, signing secrets",
      },
    ],
  },
];
