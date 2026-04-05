"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";
import {
  fetchAllOrganizations,
  organizationsQueryKey,
} from "@/lib/api/organizations";
import { useWorkspaceStore } from "@/stores/workspace-store";
import { Settings } from "lucide-react";

/**
 * Primary settings entry on the right (Stripe-style console).
 * Left: active workspace name from the same org list the server authorizes.
 */
export function DashboardTopBar() {
  const pathname = usePathname();
  const onSettings = pathname.startsWith("/dashboard/settings");
  const { data: session, isPending: sessionPending } = authClient.useSession();
  const activeOrganizationId = useWorkspaceStore((s) => s.activeOrganizationId);

  const userId = session?.user?.id;

  const { data: listResponse } = useQuery({
    queryKey: organizationsQueryKey(userId, "all"),
    queryFn: fetchAllOrganizations,
    enabled: !sessionPending && Boolean(userId),
    staleTime: 30_000,
  });

  const activeOrg = listResponse?.data.find(
    (o) => o.id === activeOrganizationId,
  );

  return (
    <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center justify-between gap-4 border-b border-border/60 bg-card/90 px-4 backdrop-blur-md supports-[backdrop-filter]:bg-card/75 sm:px-6">
      <div className="min-w-0 flex-1">
        {activeOrg ? (
          <p className="truncate text-sm">
            <span className="text-muted-foreground">Workspace </span>
            <span className="font-semibold text-foreground">
              {activeOrg.name}
            </span>
          </p>
        ) : session?.user ? (
          <p className="truncate text-sm text-muted-foreground">
            Select or create a workspace…
          </p>
        ) : null}
      </div>
      <Button
        variant={onSettings ? "secondary" : "outline"}
        size="icon"
        className="size-10 shrink-0 rounded-xl border-border/80 shadow-sm"
        asChild
        aria-current={onSettings ? "page" : undefined}
      >
        <Link href="/dashboard/settings" title="Workspace & account settings">
          <Settings className="size-[1.15rem]" aria-hidden />
          <span className="sr-only">Settings</span>
        </Link>
      </Button>
    </header>
  );
}
