"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { FormEvent } from "react";
import { useEffect, useState } from "react";
import { Eye, EyeOff } from "lucide-react";

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
import { getOrganization } from "@/lib/api/organizations";
import {
  addTeamMemberByCredentials,
  createTeam,
  listTeamMembers,
  listTeams,
  patchTeamMemberRole,
  teamMembersQueryKey,
  teamsQueryKey,
} from "@/lib/api/teams";
import { canManageOrgMembersAndTeams } from "@/lib/workspace-permissions";
import { useWorkspaceStore } from "@/stores/workspace-store";

const TEAM_TYPES = [
  { value: "custom", label: "Custom" },
  { value: "geo", label: "Geo" },
  { value: "product", label: "Product" },
] as const;

const TEAM_MEMBER_ROLES = [
  { value: "viewer", label: "Viewer" },
  { value: "member", label: "Member" },
  { value: "admin", label: "Team admin" },
] as const;

export function TeamSettingsPanel() {
  const queryClient = useQueryClient();
  const { data: session, isPending: sessionPending } = authClient.useSession();
  const userId = session?.user?.id;
  const organizationId = useWorkspaceStore((s) => s.activeOrganizationId);

  const [newTeamName, setNewTeamName] = useState("");
  const [newTeamType, setNewTeamType] = useState<string>("custom");
  const [createTeamError, setCreateTeamError] = useState<string | null>(null);

  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);

  const [memberName, setMemberName] = useState("");
  const [memberEmail, setMemberEmail] = useState("");
  const [memberPassword, setMemberPassword] = useState("");
  const [inviteRole, setInviteRole] = useState<string>("viewer");
  const [showPassword, setShowPassword] = useState(false);
  const [memberError, setMemberError] = useState<string | null>(null);
  const [roleError, setRoleError] = useState<string | null>(null);

  const {
    data: orgDetail,
    isPending: orgPending,
    isError: orgError,
    error: orgErr,
    refetch: refetchOrg,
  } = useQuery({
    queryKey: ["organization", "detail", userId, organizationId],
    queryFn: () => getOrganization(organizationId!),
    enabled: Boolean(userId && organizationId),
    staleTime: 30_000,
    retry: false,
  });

  const canManage = canManageOrgMembersAndTeams(orgDetail, userId);

  const {
    data: teamsRes,
    isPending: teamsPending,
    isError: teamsError,
    error: teamsErr,
    refetch: refetchTeams,
  } = useQuery({
    queryKey: teamsQueryKey(organizationId ?? undefined),
    queryFn: () => listTeams(organizationId!),
    enabled: Boolean(userId && organizationId && orgDetail),
    staleTime: 15_000,
    retry: false,
  });

  const teams = teamsRes?.data ?? [];

  useEffect(() => {
    if (teams.length === 0) {
      setSelectedTeamId(null);
      return;
    }
    setSelectedTeamId((prev) =>
      prev && teams.some((t) => t.id === prev) ? prev : teams[0]!.id,
    );
  }, [teams]);

  const {
    data: membersRes,
    isPending: membersPending,
    refetch: refetchMembers,
  } = useQuery({
    queryKey: teamMembersQueryKey(organizationId ?? undefined, selectedTeamId ?? undefined),
    queryFn: () => listTeamMembers(organizationId!, selectedTeamId!),
    enabled: Boolean(userId && organizationId && orgDetail && selectedTeamId),
    staleTime: 15_000,
    retry: false,
  });

  const createTeamMutation = useMutation({
    mutationFn: () =>
      createTeam(organizationId!, {
        name: newTeamName.trim(),
        type: newTeamType,
      }),
    onSuccess: async (team) => {
      setCreateTeamError(null);
      setNewTeamName("");
      await queryClient.invalidateQueries({
        queryKey: teamsQueryKey(organizationId ?? undefined),
      });
      setSelectedTeamId(team.id);
    },
    onError: (e: Error) => {
      setCreateTeamError(e.message);
    },
  });

  const addMemberMutation = useMutation({
    mutationFn: () =>
      addTeamMemberByCredentials(organizationId!, selectedTeamId!, {
        email: memberEmail.trim(),
        password: memberPassword,
        ...(memberName.trim() ? { name: memberName.trim() } : {}),
        ...(inviteRole && inviteRole !== "viewer" ? { role: inviteRole } : {}),
      }),
    onSuccess: async () => {
      setMemberError(null);
      setMemberEmail("");
      setMemberPassword("");
      setMemberName("");
      await queryClient.invalidateQueries({
        queryKey: teamMembersQueryKey(
          organizationId ?? undefined,
          selectedTeamId ?? undefined,
        ),
      });
    },
    onError: (e: Error) => {
      setMemberError(e.message);
    },
  });

  const patchRoleMutation = useMutation({
    mutationFn: (vars: { userId: string; role: string }) =>
      patchTeamMemberRole(organizationId!, selectedTeamId!, vars.userId, {
        role: vars.role,
      }),
    onSuccess: async () => {
      setRoleError(null);
      await queryClient.invalidateQueries({
        queryKey: teamMembersQueryKey(
          organizationId ?? undefined,
          selectedTeamId ?? undefined,
        ),
      });
    },
    onError: (e: Error) => {
      setRoleError(e.message);
    },
  });

  if (sessionPending || !userId) {
    return (
      <p className="px-4 text-sm text-muted-foreground sm:px-8">Loading…</p>
    );
  }

  if (!organizationId) {
    return (
      <p className="px-4 text-sm text-muted-foreground sm:px-8">
        Select a workspace in the sidebar to manage teams for that organization.
      </p>
    );
  }

  if (orgPending) {
    return (
      <p className="px-4 text-sm text-muted-foreground sm:px-8">
        Loading workspace…
      </p>
    );
  }

  if (orgError) {
    return (
      <div className="space-y-4 px-4 sm:px-8">
        <p className="text-sm text-destructive">
          {orgErr instanceof Error
            ? orgErr.message
            : "This workspace is not available. It may have been removed or you may no longer be a member."}
        </p>
        <p className="text-sm text-muted-foreground">
          Choose another workspace from the sidebar, or refresh after an admin
          invites you again.
        </p>
        <Button
          type="button"
          variant="outline"
          onClick={() => void refetchOrg()}
        >
          Retry
        </Button>
      </div>
    );
  }

  if (teamsPending) {
    return (
      <p className="px-4 text-sm text-muted-foreground sm:px-8">
        Loading teams…
      </p>
    );
  }

  if (teamsError) {
    return (
      <div className="space-y-4 px-4 sm:px-8">
        <p className="text-sm text-destructive">
          {teamsErr instanceof Error
            ? teamsErr.message
            : "Could not load teams."}
        </p>
        <Button type="button" variant="outline" onClick={() => void refetchTeams()}>
          Retry
        </Button>
      </div>
    );
  }

  function onCreateTeam(e: FormEvent) {
    e.preventDefault();
    setCreateTeamError(null);
    const name = newTeamName.trim();
    if (!name) {
      setCreateTeamError("Enter a team name.");
      return;
    }
    createTeamMutation.mutate();
  }

  function onAddMember(e: FormEvent) {
    e.preventDefault();
    setMemberError(null);
    const email = memberEmail.trim();
    if (!email) {
      setMemberError("Email is required.");
      return;
    }
    if (memberPassword.length < 8) {
      setMemberError("Password must be at least 8 characters.");
      return;
    }
    if (!selectedTeamId) return;
    addMemberMutation.mutate();
  }

  const members = membersRes?.data ?? [];

  return (
    <div className="space-y-8 px-4 py-8 sm:px-8">
      {!canManage ? (
        <div
          className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-foreground"
          role="status"
        >
          <p className="font-medium text-amber-950 dark:text-amber-100">
            Read-only access in this workspace
          </p>
          <p className="mt-1 text-muted-foreground">
            Your organization role is <strong className="text-foreground">member</strong>{" "}
            (viewer). Only the{" "}
            <strong className="text-foreground">owner</strong> or an{" "}
            <strong className="text-foreground">admin</strong> can create teams or add
            team members. Ask them to promote you to admin, or sign in with the
            account that created the organization.
          </p>
        </div>
      ) : null}

      <Card className="border-border/80 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg">Create a team</CardTitle>
          <CardDescription>
            Teams group people inside this organization. Types are labels for
            your own routing; the API stores{" "}
            <code className="rounded bg-muted px-1 py-0.5 text-xs">geo</code>,{" "}
            <code className="rounded bg-muted px-1 py-0.5 text-xs">product</code>
            , or <code className="rounded bg-muted px-1 py-0.5 text-xs">custom</code>.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            className="flex max-w-lg flex-col gap-4"
            onSubmit={onCreateTeam}
          >
            {createTeamError ? (
              <p className="text-sm text-destructive" role="alert">
                {createTeamError}
              </p>
            ) : null}
            <div className="space-y-2">
              <Label htmlFor="new-team-name">Team name</Label>
              <Input
                id="new-team-name"
                value={newTeamName}
                onChange={(e) => setNewTeamName(e.target.value)}
                placeholder="e.g. India billing"
                className="rounded-xl"
                disabled={!canManage || createTeamMutation.isPending}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-team-type">Type</Label>
              <select
                id="new-team-type"
                className="flex h-10 w-full rounded-xl border border-border/80 bg-background px-3 text-sm shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/30"
                value={newTeamType}
                onChange={(e) => setNewTeamType(e.target.value)}
                disabled={!canManage || createTeamMutation.isPending}
              >
                {TEAM_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
            <Button
              type="submit"
              className="w-fit rounded-xl"
              disabled={!canManage || createTeamMutation.isPending}
            >
              {createTeamMutation.isPending ? "Creating…" : "Create team"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="border-border/80 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg">Team members</CardTitle>
          <CardDescription>
            Add someone with email and password — they get an account and can
            sign in on the same login page. They join this organization as a
            member. Pick a team role below or change it anytime in the table.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {teams.length > 0 ? (
            <div className="space-y-2 max-w-lg">
              <Label htmlFor="team-select">Team</Label>
              <select
                id="team-select"
                className="flex h-10 w-full rounded-xl border border-border/80 bg-background px-3 text-sm shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/30"
                value={selectedTeamId ?? ""}
                onChange={(e) => setSelectedTeamId(e.target.value || null)}
              >
                {teams.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} ({t.type})
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Create a team above before adding members.
            </p>
          )}

          {selectedTeamId ? (
            <>
              <form
                className="grid max-w-lg gap-4"
                onSubmit={onAddMember}
              >
                {memberError ? (
                  <p className="text-sm text-destructive" role="alert">
                    {memberError}
                  </p>
                ) : null}
                {roleError ? (
                  <p className="text-sm text-destructive" role="alert">
                    {roleError}
                  </p>
                ) : null}
                <div className="space-y-2">
                  <Label htmlFor="invite-role">Team role</Label>
                  <select
                    id="invite-role"
                    className="flex h-10 w-full rounded-xl border border-border/80 bg-background px-3 text-sm shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/30"
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value)}
                    disabled={!canManage || addMemberMutation.isPending}
                  >
                    {TEAM_MEMBER_ROLES.map((r) => (
                      <option key={r.value} value={r.value}>
                        {r.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="invite-name">Display name (optional)</Label>
                  <Input
                    id="invite-name"
                    value={memberName}
                    onChange={(e) => setMemberName(e.target.value)}
                    autoComplete="name"
                    className="rounded-xl"
                    disabled={!canManage || addMemberMutation.isPending}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="invite-email">Work email</Label>
                  <Input
                    id="invite-email"
                    type="email"
                    value={memberEmail}
                    onChange={(e) => setMemberEmail(e.target.value)}
                    autoComplete="email"
                    className="rounded-xl"
                    disabled={!canManage || addMemberMutation.isPending}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="invite-password">Initial password</Label>
                  <div className="relative">
                    <Input
                      id="invite-password"
                      type={showPassword ? "text" : "password"}
                      value={memberPassword}
                      onChange={(e) => setMemberPassword(e.target.value)}
                      autoComplete="new-password"
                      className="rounded-xl pr-10"
                      disabled={!canManage || addMemberMutation.isPending}
                    />
                    <button
                      type="button"
                      className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-muted-foreground hover:text-foreground"
                      onClick={() => setShowPassword((s) => !s)}
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? (
                        <EyeOff className="size-4" />
                      ) : (
                        <Eye className="size-4" />
                      )}
                    </button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    They will use this password to sign in; you can share it
                    securely out of band.
                  </p>
                </div>
                <Button
                  type="submit"
                  className="w-fit rounded-xl"
                  disabled={!canManage || addMemberMutation.isPending}
                >
                  {addMemberMutation.isPending
                    ? "Adding…"
                    : "Create account & add to team"}
                </Button>
              </form>

              <div className="overflow-x-auto rounded-xl border border-border/80">
                <table className="w-full min-w-[280px] text-left text-sm">
                  <thead className="border-b border-border/80 bg-muted/40">
                    <tr>
                      <th className="px-3 py-2 font-medium">Name</th>
                      <th className="px-3 py-2 font-medium">Email</th>
                      <th className="px-3 py-2 font-medium">Team role</th>
                    </tr>
                  </thead>
                  <tbody>
                    {membersPending ? (
                      <tr>
                        <td
                          colSpan={3}
                          className="px-3 py-4 text-muted-foreground"
                        >
                          Loading members…
                        </td>
                      </tr>
                    ) : members.length === 0 ? (
                      <tr>
                        <td
                          colSpan={3}
                          className="px-3 py-4 text-muted-foreground"
                        >
                          No members yet.
                        </td>
                      </tr>
                    ) : (
                      members.map((m) => (
                        <tr
                          key={m.id}
                          className="border-b border-border/60 last:border-0"
                        >
                          <td className="px-3 py-2.5">{m.user.name}</td>
                          <td className="px-3 py-2.5 text-muted-foreground">
                            {m.user.email}
                          </td>
                          <td className="px-3 py-2.5">
                            {canManage ? (
                              <select
                                className="flex h-9 w-full max-w-[11rem] rounded-lg border border-border/80 bg-background px-2 text-sm capitalize outline-none focus-visible:ring-2 focus-visible:ring-ring/30"
                                value={m.role}
                                disabled={patchRoleMutation.isPending}
                                onChange={(e) => {
                                  const next = e.target.value;
                                  if (next === m.role) return;
                                  patchRoleMutation.mutate({
                                    userId: m.user_id,
                                    role: next,
                                  });
                                }}
                              >
                                {TEAM_MEMBER_ROLES.map((r) => (
                                  <option key={r.value} value={r.value}>
                                    {r.label}
                                  </option>
                                ))}
                              </select>
                            ) : (
                              <span className="text-muted-foreground capitalize">
                                {m.role}
                              </span>
                            )}
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
                onClick={() => void refetchMembers()}
              >
                Refresh list
              </Button>
            </>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
