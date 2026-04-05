"use client";

import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";

import { authClient } from "@/lib/auth-client";
import {
  fetchAllOrganizations,
  organizationsQueryKey,
} from "@/lib/api/organizations";
import { useWorkspaceStore } from "@/stores/workspace-store";

/**
 * Keeps `activeOrganizationId` aligned with `GET /api/v1/organizations`.
 * All org-scoped API calls still enforce membership on the server — this is
 * only which org the UI targets for paths like `/api/v1/organizations/:id/...`.
 */
export function WorkspaceOrgSync() {
  const { data: session, isPending: sessionPending } = authClient.useSession();
  const activeOrganizationId = useWorkspaceStore((s) => s.activeOrganizationId);
  const setActiveOrganizationId = useWorkspaceStore(
    (s) => s.setActiveOrganizationId,
  );

  const userId = session?.user?.id;

  const { data: listResponse } = useQuery({
    queryKey: organizationsQueryKey(userId, "all"),
    queryFn: fetchAllOrganizations,
    enabled: !sessionPending && Boolean(userId),
    staleTime: 30_000,
  });

  useEffect(() => {
    if (sessionPending || !session?.user) return;

    const rows = listResponse?.data;
    if (!rows) return;

    if (rows.length === 0) {
      if (activeOrganizationId !== null) {
        setActiveOrganizationId(null);
      }
      return;
    }

    const allowed = new Set(rows.map((o) => o.id));
    if (
      !activeOrganizationId ||
      !allowed.has(activeOrganizationId)
    ) {
      setActiveOrganizationId(rows[0].id);
    }
  }, [
    session?.user,
    sessionPending,
    listResponse?.data,
    activeOrganizationId,
    setActiveOrganizationId,
  ]);

  return null;
}
