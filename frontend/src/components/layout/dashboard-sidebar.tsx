"use client";

import type { ComponentType } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { dashboardNavSections } from "@/config/dashboard-nav";
import { signOut } from "@/lib/api/auth";
import { authClient } from "@/lib/auth-client";

import { OrganizationSwitcher } from "@/features/workspace/components/organization-switcher";

import { ThemeToggle } from "./theme-toggle";

function NavLink({
  href,
  label,
  description,
  Icon,
  active,
  onNavigate,
}: {
  href: string;
  label: string;
  description?: string;
  Icon: ComponentType<{ className?: string }>;
  active: boolean;
  onNavigate?: () => void;
}) {
  return (
    <Link
      href={href}
      title={description}
      onClick={onNavigate}
      className={`group flex items-start gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors ${
        active
          ? "bg-primary/10 text-primary font-medium"
          : "text-muted-foreground hover:bg-muted/80 hover:text-foreground"
      }`}
    >
      <Icon
        className={`mt-0.5 size-4 shrink-0 ${active ? "text-primary" : "opacity-80 group-hover:opacity-100"}`}
        aria-hidden
      />
      <span className="leading-snug">{label}</span>
    </Link>
  );
}

export function DashboardSidebar({
  onNavigate,
  className = "",
}: {
  onNavigate?: () => void;
  className?: string;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session } = authClient.useSession();
  const user = session?.user;

  async function handleSignOut() {
    await signOut();
    router.refresh();
    router.push("/");
  }

  return (
    <aside
      className={`flex w-full flex-col border-border/80 bg-sidebar text-sidebar-foreground md:w-64 md:shrink-0 md:border-r ${className}`}
    >
      <div className="flex h-14 items-center gap-2 border-b border-border/60 px-4">
        <Link
          href="/dashboard"
          className="font-semibold tracking-tight text-foreground"
          onClick={onNavigate}
        >
          Billing
        </Link>
        <span className="rounded-md border border-border/80 bg-muted/50 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
          Console
        </span>
      </div>
      <OrganizationSwitcher />
      <div className="flex-1 overflow-y-auto px-2 py-4">
        {dashboardNavSections.map((section) => (
          <div key={section.title} className="mb-6 last:mb-2">
            <div className="mb-2 flex items-center gap-2 px-3">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                {section.title}
              </span>
              {section.badge ? (
                <span className="rounded bg-primary/15 px-1.5 py-px text-[10px] font-medium text-primary">
                  {section.badge}
                </span>
              ) : null}
            </div>
            <nav className="flex flex-col gap-0.5" aria-label={section.title}>
              {section.items.map((item) => {
                const navActive = item.exactActive
                  ? pathname === item.href
                  : item.href === "/dashboard"
                    ? pathname === "/dashboard"
                    : pathname === item.href ||
                      pathname.startsWith(`${item.href}/`);
                return (
                  <NavLink
                    key={item.href}
                    href={item.href}
                    label={item.label}
                    description={item.description}
                    Icon={item.icon}
                    active={navActive}
                    onNavigate={onNavigate}
                  />
                );
              })}
            </nav>
          </div>
        ))}
      </div>
      <div className="border-t border-border/60 p-3">
        <div className="mb-3 flex items-center justify-between gap-2 rounded-xl bg-muted/40 px-3 py-2">
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-medium text-foreground">
              {user?.name ?? user?.email ?? "Account"}
            </p>
            {user?.email && user?.name ? (
              <p className="truncate text-[11px] text-muted-foreground">
                {user.email}
              </p>
            ) : null}
          </div>
          <ThemeToggle />
        </div>
        <Button
          variant="outline"
          size="sm"
          className="h-9 w-full"
          type="button"
          onClick={() => void handleSignOut()}
        >
          Sign out
        </Button>
      </div>
    </aside>
  );
}
