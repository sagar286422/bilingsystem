"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { FormEvent } from "react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authClient } from "@/lib/auth-client";
import {
  createOrganization,
  getOrganization,
  listOrganizations,
  organizationsQueryKey,
} from "@/lib/api/organizations";
import {
  inviteOrganizationMemberByEmail,
  listOrganizationMembers,
  organizationMembersQueryKey,
} from "@/lib/api/organization-members";
import { canManageOrgMembersAndTeams } from "@/lib/workspace-permissions";
import { useWorkspaceStore } from "@/stores/workspace-store";

export function OrganizationSettingsPanel() {
  const queryClient = useQueryClient();
  const { data: session, isPending: sessionPending } = authClient.useSession();
  const userId = session?.user?.id;

  const activeOrganizationId = useWorkspaceStore((s) => s.activeOrganizationId);
  const setActiveOrganizationId = useWorkspaceStore(
    (s) => s.setActiveOrganizationId,
  );

  const [newOrgName, setNewOrgName] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [listPage, setListPage] = useState(1);
  const pageSize = 10;
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteError, setInviteError] = useState<string | null>(null);

  const {
    data: listResponse,
    isPending: listPending,
    isError,
    error: listError,
    refetch,
  } = useQuery({
    queryKey: organizationsQueryKey(userId, {
      page: listPage,
      page_size: pageSize,
    }),
    queryFn: () =>
      listOrganizations({ page: listPage, page_size: pageSize }),
    enabled: !sessionPending && Boolean(userId),
    staleTime: 30_000,
    retry: false,
  });

  const orgsOnPage = listResponse?.data ?? [];
  const activeFromPage = orgsOnPage.find((o) => o.id === activeOrganizationId);

  const { data: activeFetched } = useQuery({
    queryKey: ["organization", userId, activeOrganizationId],
    queryFn: () => getOrganization(activeOrganizationId!),
    enabled:
      Boolean(userId && activeOrganizationId) && !activeFromPage,
    staleTime: 30_000,
    retry: false,
  });

  const totalCount = listResponse?.total_count ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  useEffect(() => {
    if (listPage > totalPages) setListPage(totalPages);
  }, [listPage, totalPages]);

  const createMutation = useMutation({
    mutationFn: (name: string) => createOrganization(name),
    onSuccess: async (org) => {
      setFormError(null);
      setNewOrgName("");
      setActiveOrganizationId(org.id);
      await queryClient.invalidateQueries({
        queryKey: ["organizations", userId ?? "_"],
      });
    },
    onError: (e: Error) => {
      setFormError(e.message);
    },
  });

  const {
    data: orgMembersRes,
    isPending: orgMembersPending,
    refetch: refetchOrgMembers,
  } = useQuery({
    queryKey: organizationMembersQueryKey(activeOrganizationId ?? undefined),
    queryFn: () => listOrganizationMembers(activeOrganizationId!),
    enabled: Boolean(userId && activeOrganizationId && !sessionPending),
    retry: false,
  });

  const inviteOrgMemberMutation = useMutation({
    mutationFn: (email: string) =>
      inviteOrganizationMemberByEmail(activeOrganizationId!, email),
    onSuccess: async () => {
      setInviteError(null);
      setInviteEmail("");
      await queryClient.invalidateQueries({
        queryKey: organizationMembersQueryKey(activeOrganizationId ?? undefined),
      });
    },
    onError: (e: Error) => {
      setInviteError(e.message);
    },
  });

  if (sessionPending || !userId) {
    return (
      <p className="px-4 text-sm text-muted-foreground sm:px-8">Loading…</p>
    );
  }

  if (listPending) {
    return (
      <p className="px-4 text-sm text-muted-foreground sm:px-8">
        Loading organizations…
      </p>
    );
  }

  if (isError) {
    return (
      <div className="space-y-4 px-4 sm:px-8">
        <p className="text-sm text-destructive">
          {listError instanceof Error
            ? listError.message
            : "Could not load organizations."}
        </p>
        <Button type="button" variant="outline" onClick={() => void refetch()}>
          Retry
        </Button>
      </div>
    );
  }

  const active = activeFromPage ?? activeFetched ?? orgsOnPage[0] ?? null;
  const canManageOrg = canManageOrgMembersAndTeams(active, userId);
  const orgMembers = orgMembersRes?.data ?? [];

  function onCreateSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError(null);
    const trimmed = newOrgName.trim();
    if (!trimmed) {
      setFormError("Enter an organization name.");
      return;
    }
    createMutation.mutate(trimmed);
  }

  function onInviteOrgMember(e: FormEvent) {
    e.preventDefault();
    setInviteError(null);
    const trimmed = inviteEmail.trim().toLowerCase();
    if (!trimmed) {
      setInviteError("Email is required.");
      return;
    }
    if (!activeOrganizationId) return;
    inviteOrgMemberMutation.mutate(trimmed);
  }

  return (
    <div className="space-y-8 px-4 py-8 sm:px-8">
      <Card className="border-primary/20 bg-primary/5 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg">Active organization</CardTitle>
          <CardDescription>
            This is the workspace used in the sidebar and for API paths. Only
            name is stored today; updates require a backend PATCH later.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid max-w-lg gap-4">
          {active ? (
            <>
              <div className="space-y-2">
                <Label htmlFor="org-name-readonly">Name</Label>
                <Input
                  id="org-name-readonly"
                  readOnly
                  value={active.name}
                  className="rounded-xl bg-muted/30"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="org-id-readonly">Organization ID</Label>
                <Input
                  id="org-id-readonly"
                  readOnly
                  value={active.id}
                  className="rounded-xl bg-muted/30 font-mono text-xs"
                />
              </div>
              {active.membership_role ? (
                <p className="text-xs text-muted-foreground">
                  Your role:{" "}
                  <span className="font-medium text-foreground">
                    {active.membership_role}
                  </span>
                </p>
              ) : null}
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              You don’t have a workspace yet — create one below.
            </p>
          )}
        </CardContent>
      </Card>

      <Card className="border-border/80 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg">Your organizations</CardTitle>
          <CardDescription>
            Workspaces you belong to, from{" "}
            <code className="rounded bg-muted px-1 py-0.5 text-xs">
              GET /api/v1/organizations
            </code>{" "}
            with pagination.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {totalCount === 0 ? (
            <p className="text-sm text-muted-foreground">
              No organizations yet — create one below.
            </p>
          ) : (
            <>
              <div className="overflow-x-auto rounded-xl border border-border/80">
                <table className="w-full min-w-[320px] text-left text-sm">
                  <thead className="border-b border-border/80 bg-muted/40">
                    <tr>
                      <th className="px-3 py-2 font-medium">Name</th>
                      <th className="px-3 py-2 font-medium">Your role</th>
                      <th className="px-3 py-2 font-medium">Workspace</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orgsOnPage.map((o) => {
                      const isActive = o.id === activeOrganizationId;
                      return (
                        <tr
                          key={o.id}
                          className="border-b border-border/60 last:border-0"
                        >
                          <td className="px-3 py-2.5 font-medium">{o.name}</td>
                          <td className="px-3 py-2.5 text-muted-foreground capitalize">
                            {o.membership_role ?? "—"}
                          </td>
                          <td className="px-3 py-2.5">
                            {isActive ? (
                              <span className="text-xs font-medium text-primary">
                                Active
                              </span>
                            ) : (
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="h-8 rounded-lg text-xs"
                                onClick={() => setActiveOrganizationId(o.id)}
                              >
                                Switch here
                              </Button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground">
                <p>
                  Showing{" "}
                  <span className="font-medium text-foreground">
                    {totalCount === 0
                      ? 0
                      : (listPage - 1) * pageSize + 1}
                    –
                    {Math.min(listPage * pageSize, totalCount)}
                  </span>{" "}
                  of{" "}
                  <span className="font-medium text-foreground">
                    {totalCount}
                  </span>
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8 rounded-lg"
                    disabled={listPage <= 1}
                    onClick={() => setListPage((p) => Math.max(1, p - 1))}
                  >
                    Previous
                  </Button>
                  <span className="text-xs tabular-nums">
                    Page {listPage} of {totalPages}
                  </span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8 rounded-lg"
                    disabled={listPage >= totalPages}
                    onClick={() =>
                      setListPage((p) => Math.min(totalPages, p + 1))
                    }
                  >
                    Next
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {activeOrganizationId ? (
        <Card className="border-border/80 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Organization members</CardTitle>
            <CardDescription>
              People in this workspace. Inviting by email requires they already
              have an account; to create a brand-new login and add them to a
              team, use{" "}
              <strong className="text-foreground">Team & permissions</strong>{" "}
              with email and password.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!canManageOrg ? (
              <p className="text-sm text-muted-foreground">
                Only an owner or admin can invite org members. You can still
                view the list below.
              </p>
            ) : null}
            {canManageOrg ? (
              <form
                className="flex max-w-lg flex-col gap-4"
                onSubmit={onInviteOrgMember}
              >
                {inviteError ? (
                  <p className="text-sm text-destructive" role="alert">
                    {inviteError}
                  </p>
                ) : null}
                <div className="space-y-2">
                  <Label htmlFor="org-invite-email">Invite by email</Label>
                  <Input
                    id="org-invite-email"
                    type="email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="colleague@company.com"
                    autoComplete="email"
                    className="rounded-xl"
                    disabled={inviteOrgMemberMutation.isPending}
                  />
                </div>
                <Button
                  type="submit"
                  className="w-fit rounded-xl"
                  disabled={inviteOrgMemberMutation.isPending}
                >
                  {inviteOrgMemberMutation.isPending
                    ? "Inviting…"
                    : "Add to organization"}
                </Button>
              </form>
            ) : null}
            <div className="overflow-x-auto rounded-xl border border-border/80">
              <table className="w-full min-w-[320px] text-left text-sm">
                <thead className="border-b border-border/80 bg-muted/40">
                  <tr>
                    <th className="px-3 py-2 font-medium">Name</th>
                    <th className="px-3 py-2 font-medium">Email</th>
                    <th className="px-3 py-2 font-medium">Org role</th>
                  </tr>
                </thead>
                <tbody>
                  {orgMembersPending ? (
                    <tr>
                      <td
                        colSpan={3}
                        className="px-3 py-4 text-muted-foreground"
                      >
                        Loading members…
                      </td>
                    </tr>
                  ) : orgMembers.length === 0 ? (
                    <tr>
                      <td
                        colSpan={3}
                        className="px-3 py-4 text-muted-foreground"
                      >
                        No members listed.
                      </td>
                    </tr>
                  ) : (
                    orgMembers.map((m) => (
                      <tr
                        key={m.id}
                        className="border-b border-border/60 last:border-0"
                      >
                        <td className="px-3 py-2.5">{m.user.name}</td>
                        <td className="px-3 py-2.5 text-muted-foreground">
                          {m.user.email}
                        </td>
                        <td className="px-3 py-2.5 capitalize text-muted-foreground">
                          {m.role}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 text-xs"
              onClick={() => void refetchOrgMembers()}
            >
              Refresh members
            </Button>
          </CardContent>
        </Card>
      ) : null}

      <Card className="border-border/80 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg">
            {totalCount === 0
              ? "Create your first organization"
              : "Create another organization"}
          </CardTitle>
          <CardDescription>
            Calls{" "}
            <code className="rounded bg-muted px-1 py-0.5 text-xs">
              POST /api/v1/organizations
            </code>{" "}
            with your session cookie. You become the owner.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            className="flex max-w-lg flex-col gap-4"
            onSubmit={onCreateSubmit}
          >
            {formError ? (
              <p className="text-sm text-destructive" role="alert">
                {formError}
              </p>
            ) : null}
            <div className="space-y-2">
              <Label htmlFor="new-org-name">Organization name</Label>
              <Input
                id="new-org-name"
                name="name"
                value={newOrgName}
                onChange={(e) => setNewOrgName(e.target.value)}
                placeholder="e.g. Acme Billing"
                autoComplete="organization"
                className="rounded-xl"
                disabled={createMutation.isPending}
              />
            </div>
            <Button
              type="submit"
              className="w-fit rounded-xl"
              disabled={createMutation.isPending}
            >
              {createMutation.isPending ? "Creating…" : "Create organization"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
