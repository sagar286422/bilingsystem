"use client";

import { useQuery } from "@tanstack/react-query";
import { Building2, ChevronDown } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";
import {
  fetchAllOrganizations,
  organizationsQueryKey,
} from "@/lib/api/organizations";
import { useWorkspaceStore } from "@/stores/workspace-store";

function formatRole(role?: string): string | null {
  if (!role) return null;
  return role.charAt(0).toUpperCase() + role.slice(1);
}

export function OrganizationSwitcher() {
  const { data: session, isPending: sessionPending } = authClient.useSession();
  const activeOrganizationId = useWorkspaceStore((s) => s.activeOrganizationId);
  const setActiveOrganizationId = useWorkspaceStore(
    (s) => s.setActiveOrganizationId,
  );

  const userId = session?.user?.id;

  const {
    data: listResponse,
    isPending: listPending,
    isError,
    refetch,
  } = useQuery({
    queryKey: organizationsQueryKey(userId, "all"),
    queryFn: fetchAllOrganizations,
    enabled: !sessionPending && Boolean(userId),
    staleTime: 30_000,
  });

  if (sessionPending || !session?.user) {
    return null;
  }

  if (listPending) {
    return (
      <div className="border-b border-border/60 px-3 py-3">
        <p className="text-xs text-muted-foreground">Loading workspaces…</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="border-b border-border/60 px-3 py-3">
        <p className="text-xs text-destructive">Couldn’t load organizations.</p>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="mt-1 h-8 px-2 text-xs"
          onClick={() => void refetch()}
        >
          Retry
        </Button>
      </div>
    );
  }

  const rows = listResponse?.data ?? [];
  if (rows.length === 0) {
    return (
      <div className="border-b border-border/60 px-3 py-3">
        <p className="mb-2 text-xs text-muted-foreground">
          No workspace yet. Create an organization to use billing features.
        </p>
        <Button size="sm" className="h-8 w-full rounded-xl text-xs" asChild>
          <Link href="/dashboard/settings/organization">Create organization</Link>
        </Button>
      </div>
    );
  }

  const active =
    rows.find((o) => o.id === activeOrganizationId) ?? rows[0];
  const roleLabel = formatRole(active.membership_role);

  return (
    <div className="border-b border-border/60 px-3 py-3">
      <label
        htmlFor="workspace-org-select"
        className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground"
      >
        <Building2 className="size-3.5 shrink-0" aria-hidden />
        Workspace
      </label>
      <div className="relative">
        <select
          id="workspace-org-select"
          className="h-10 w-full appearance-none rounded-xl border border-border/80 bg-background/80 py-2 pl-3 pr-9 text-sm font-medium text-foreground shadow-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30"
          value={activeOrganizationId ?? active.id}
          onChange={(e) => {
            const next = e.target.value;
            if (next) setActiveOrganizationId(next);
          }}
          aria-label="Active organization"
        >
          {rows.map((o) => (
            <option key={o.id} value={o.id}>
              {o.name}
            </option>
          ))}
        </select>
        <ChevronDown
          className="pointer-events-none absolute right-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden
        />
      </div>
      {roleLabel ? (
        <p className="mt-1.5 text-[11px] text-muted-foreground">
          Your role: <span className="text-foreground">{roleLabel}</span>
        </p>
      ) : null}
      <p className="mt-2 text-[10px] leading-snug text-muted-foreground/90">
        API calls use this org ID in the path; the server checks membership on
        every request.
      </p>
    </div>
  );
}
