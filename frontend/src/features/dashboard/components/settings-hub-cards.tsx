import Link from "next/link";
import { Building2, Landmark, Palette, Shield, User } from "lucide-react";

import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const hubs = [
  {
    href: "/dashboard/settings/theme",
    title: "Appearance",
    description: "Light or dark mode and accent color themes.",
    icon: Palette,
  },
  {
    href: "/dashboard/settings/profile",
    title: "Profile",
    description: "Your name, avatar, email, and password.",
    icon: User,
  },
  {
    href: "/dashboard/settings/organization",
    title: "Organization",
    description: "Create or switch org, slug, and billing identity.",
    icon: Building2,
  },
  {
    href: "/dashboard/settings/companies",
    title: "Companies",
    description: "Legal entities for invoices, tax IDs, and gateways.",
    icon: Landmark,
  },
  {
    href: "/dashboard/settings/team",
    title: "Team & permissions",
    description: "Invite members and assign roles (RBAC).",
    icon: Shield,
  },
] as const;

export function SettingsHubCards() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {hubs.map(({ href, title, description, icon: Icon }) => (
        <Link key={href} href={href} className="group block rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <Card className="h-full border-border/80 bg-card/80 shadow-sm transition-[box-shadow,transform] hover:shadow-md group-hover:-translate-y-0.5">
            <CardHeader>
              <Icon
                className="mb-2 size-9 text-primary"
                aria-hidden
              />
              <CardTitle className="text-base group-hover:text-primary">
                {title}
              </CardTitle>
              <CardDescription className="text-pretty">
                {description}
              </CardDescription>
            </CardHeader>
          </Card>
        </Link>
      ))}
    </div>
  );
}
