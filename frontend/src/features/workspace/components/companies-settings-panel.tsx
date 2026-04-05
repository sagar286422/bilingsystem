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
  currenciesQueryKey,
  listCurrencies,
} from "@/lib/api/currencies";
import {
  addCompanyMember,
  companiesQueryKey,
  companyMembersQueryKey,
  createCompany,
  listCompanies,
  listCompanyMembers,
  removeCompanyMember,
} from "@/lib/api/companies";
import { getOrganization } from "@/lib/api/organizations";
import {
  listOrganizationMembers,
  organizationMembersQueryKey,
} from "@/lib/api/organization-members";
import { canManageOrgMembersAndTeams } from "@/lib/workspace-permissions";
import { useWorkspaceStore } from "@/stores/workspace-store";

export function CompaniesSettingsPanel() {
  const queryClient = useQueryClient();
  const { data: session, isPending: sessionPending } = authClient.useSession();
  const userId = session?.user?.id;
  const organizationId = useWorkspaceStore((s) => s.activeOrganizationId);

  const [name, setName] = useState("");
  const [country, setCountry] = useState("IN");
  const [currency, setCurrency] = useState("INR");
  const [taxId, setTaxId] = useState("");
  const [address, setAddress] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null);
  const [memberPick, setMemberPick] = useState("");
  const [memberError, setMemberError] = useState<string | null>(null);

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

  const {
    data: currenciesRes,
    isPending: currenciesPending,
    isError: currenciesError,
    error: currenciesErr,
    refetch: refetchCurrencies,
  } = useQuery({
    queryKey: currenciesQueryKey,
    queryFn: listCurrencies,
    enabled: Boolean(userId && organizationId && orgDetail),
    staleTime: 60_000,
    retry: false,
  });

  const currencyRows = currenciesRes?.data;

  useEffect(() => {
    if (!currencyRows?.length) return;
    setCurrency((prev) => {
      if (currencyRows.some((c) => c.code === prev)) return prev;
      const inr = currencyRows.find((c) => c.code === "INR");
      return inr ? inr.code : currencyRows[0]!.code;
    });
  }, [currencyRows]);

  const canManage = canManageOrgMembersAndTeams(orgDetail, userId);

  const {
    data: listRes,
    isPending: listPending,
    isError: listError,
    error: listErr,
    refetch: refetchList,
  } = useQuery({
    queryKey: companiesQueryKey(organizationId ?? undefined),
    queryFn: () => listCompanies(organizationId!),
    enabled: Boolean(userId && organizationId && orgDetail),
    staleTime: 15_000,
    retry: false,
  });

  const companies = listRes?.data ?? [];

  useEffect(() => {
    if (companies.length === 0) {
      setSelectedCompanyId(null);
      return;
    }
    setSelectedCompanyId((prev) =>
      prev && companies.some((c) => c.id === prev) ? prev : companies[0]!.id,
    );
  }, [companies]);

  const { data: orgMembersRes } = useQuery({
    queryKey: organizationMembersQueryKey(organizationId ?? undefined),
    queryFn: () => listOrganizationMembers(organizationId!),
    enabled: Boolean(userId && organizationId && orgDetail),
    staleTime: 15_000,
    retry: false,
  });

  const {
    data: companyMembersRes,
    isPending: companyMembersPending,
    refetch: refetchCompanyMembers,
  } = useQuery({
    queryKey: companyMembersQueryKey(
      organizationId ?? undefined,
      selectedCompanyId ?? undefined,
    ),
    queryFn: () =>
      listCompanyMembers(organizationId!, selectedCompanyId!),
    enabled: Boolean(
      userId && organizationId && orgDetail && selectedCompanyId,
    ),
    staleTime: 10_000,
    retry: false,
  });

  const createMutation = useMutation({
    mutationFn: () =>
      createCompany(organizationId!, {
        name: name.trim(),
        country: country.trim().toUpperCase(),
        currency: currency.trim().toUpperCase(),
        ...(taxId.trim() ? { tax_id: taxId.trim() } : {}),
        ...(address.trim() ? { address: address.trim() } : {}),
      }),
    onSuccess: async () => {
      setFormError(null);
      setName("");
      setTaxId("");
      setAddress("");
      await queryClient.invalidateQueries({
        queryKey: companiesQueryKey(organizationId ?? undefined),
      });
    },
    onError: (e: Error) => {
      setFormError(e.message);
    },
  });

  const addCompanyMemberMutation = useMutation({
    mutationFn: (targetUserId: string) =>
      addCompanyMember(organizationId!, selectedCompanyId!, targetUserId),
    onSuccess: async () => {
      setMemberError(null);
      setMemberPick("");
      await queryClient.invalidateQueries({
        queryKey: companyMembersQueryKey(
          organizationId ?? undefined,
          selectedCompanyId ?? undefined,
        ),
      });
    },
    onError: (e: Error) => {
      setMemberError(e.message);
    },
  });

  const removeCompanyMemberMutation = useMutation({
    mutationFn: (targetUserId: string) =>
      removeCompanyMember(organizationId!, selectedCompanyId!, targetUserId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: companyMembersQueryKey(
          organizationId ?? undefined,
          selectedCompanyId ?? undefined,
        ),
      });
    },
    onError: (e: Error) => {
      setMemberError(e.message);
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
        Select a workspace in the sidebar to manage companies.
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
            : "Workspace unavailable."}
        </p>
        <Button type="button" variant="outline" onClick={() => void refetchOrg()}>
          Retry
        </Button>
      </div>
    );
  }

  if (listPending) {
    return (
      <p className="px-4 text-sm text-muted-foreground sm:px-8">
        Loading companies…
      </p>
    );
  }

  if (listError) {
    return (
      <div className="space-y-4 px-4 sm:px-8">
        <p className="text-sm text-destructive">
          {listErr instanceof Error ? listErr.message : "Could not load companies."}
        </p>
        <Button type="button" variant="outline" onClick={() => void refetchList()}>
          Retry
        </Button>
      </div>
    );
  }

  const rows = companies;
  const orgMembers = orgMembersRes?.data ?? [];
  const companyMembers = companyMembersRes?.data ?? [];
  const linkedUserIds = new Set(companyMembers.map((m) => m.user_id));
  const availableToLink = orgMembers.filter((m) => !linkedUserIds.has(m.user_id));

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError(null);
    const n = name.trim();
    if (!n) {
      setFormError("Legal name is required.");
      return;
    }
    const c = country.trim().toUpperCase();
    if (c.length !== 2) {
      setFormError("Country must be a 2-letter code (e.g. IN, US).");
      return;
    }
    const cur = currency.trim().toUpperCase();
    if (!(currencyRows?.some((c) => c.code === cur) ?? false)) {
      setFormError("Choose a currency from the catalog.");
      return;
    }
    createMutation.mutate();
  }

  function onAddCompanyMember(e: FormEvent) {
    e.preventDefault();
    setMemberError(null);
    if (!memberPick) {
      setMemberError("Choose someone from the organization.");
      return;
    }
    addCompanyMemberMutation.mutate(memberPick);
  }

  return (
    <div className="space-y-8 px-4 py-8 sm:px-8">
      {!canManage ? (
        <div
          className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm"
          role="status"
        >
          <p className="font-medium text-amber-950 dark:text-amber-100">
            Read-only access
          </p>
          <p className="mt-1 text-muted-foreground">
            Only an organization <strong className="text-foreground">owner</strong>{" "}
            or <strong className="text-foreground">admin</strong> can create companies
            or change who is linked to a company.
          </p>
        </div>
      ) : null}

      <Card className="border-border/80 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg">Add company</CardTitle>
          <CardDescription>
            One legal entity per row — used for invoices, tax, and gateways.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            className="grid max-w-lg gap-4"
            onSubmit={onSubmit}
          >
            {formError ? (
              <p className="text-sm text-destructive" role="alert">
                {formError}
              </p>
            ) : null}
            {currenciesError ? (
              <div className="space-y-2">
                <p className="text-sm text-destructive" role="alert">
                  {currenciesErr instanceof Error
                    ? currenciesErr.message
                    : "Could not load currencies."}
                </p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="rounded-xl"
                  onClick={() => void refetchCurrencies()}
                >
                  Retry
                </Button>
              </div>
            ) : null}
            <div className="space-y-2">
              <Label htmlFor="co-name">Legal name</Label>
              <Input
                id="co-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Acme Pvt Ltd"
                className="rounded-xl"
                disabled={!canManage || createMutation.isPending}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="co-country">Country (ISO-3166)</Label>
                <Input
                  id="co-country"
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  placeholder="IN"
                  maxLength={2}
                  className="rounded-xl font-mono uppercase"
                  disabled={!canManage || createMutation.isPending}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="co-currency">Currency (catalog)</Label>
                <select
                  id="co-currency"
                  className="flex h-10 w-full rounded-xl border border-border/80 bg-background px-3 text-sm font-mono shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/30 disabled:opacity-60"
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  disabled={
                    !canManage ||
                    createMutation.isPending ||
                    currenciesPending ||
                    !currencyRows?.length ||
                    currenciesError
                  }
                >
                  {(currencyRows ?? []).map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.code} — {c.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="co-tax">Tax ID (optional)</Label>
              <Input
                id="co-tax"
                value={taxId}
                onChange={(e) => setTaxId(e.target.value)}
                className="rounded-xl"
                disabled={!canManage || createMutation.isPending}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="co-address">Address (optional)</Label>
              <Input
                id="co-address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="rounded-xl"
                disabled={!canManage || createMutation.isPending}
              />
            </div>
            <Button
              type="submit"
              className="w-fit rounded-xl"
              disabled={
                !canManage ||
                createMutation.isPending ||
                currenciesPending ||
                !currencyRows?.length ||
                currenciesError
              }
            >
              {createMutation.isPending ? "Creating…" : "Add company"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="border-border/80 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg">Link organization members to a company</CardTitle>
          <CardDescription>
            Only people who are already in this workspace (organization) can be
            linked. Add people under{" "}
            <strong className="text-foreground">Organization</strong> or{" "}
            <strong className="text-foreground">Team & permissions</strong> first.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Create a company above, then pick it here.
            </p>
          ) : (
            <>
              <div className="space-y-2 max-w-lg">
                <Label htmlFor="co-pick">Company</Label>
                <select
                  id="co-pick"
                  className="flex h-10 w-full rounded-xl border border-border/80 bg-background px-3 text-sm shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/30"
                  value={selectedCompanyId ?? ""}
                  onChange={(e) => setSelectedCompanyId(e.target.value || null)}
                >
                  {rows.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.currency})
                    </option>
                  ))}
                </select>
              </div>

              {selectedCompanyId ? (
                <form
                  className="flex max-w-lg flex-col gap-4"
                  onSubmit={onAddCompanyMember}
                >
                  {memberError ? (
                    <p className="text-sm text-destructive" role="alert">
                      {memberError}
                    </p>
                  ) : null}
                  <div className="space-y-2">
                    <Label htmlFor="co-member-add">
                      Add org member to this company
                    </Label>
                    <select
                      id="co-member-add"
                      className="flex h-10 w-full rounded-xl border border-border/80 bg-background px-3 text-sm shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/30"
                      value={memberPick}
                      onChange={(e) => setMemberPick(e.target.value)}
                      disabled={
                        !canManage ||
                        addCompanyMemberMutation.isPending ||
                        availableToLink.length === 0
                      }
                    >
                      <option value="">
                        {availableToLink.length === 0
                          ? "Everyone is already linked (or no org members)"
                          : "Select a person…"}
                      </option>
                      {availableToLink.map((m) => (
                        <option key={m.id} value={m.user_id}>
                          {m.user.name} ({m.user.email})
                        </option>
                      ))}
                    </select>
                  </div>
                  <Button
                    type="submit"
                    className="w-fit rounded-xl"
                    disabled={
                      !canManage ||
                      !memberPick ||
                      addCompanyMemberMutation.isPending
                    }
                  >
                    {addCompanyMemberMutation.isPending
                      ? "Linking…"
                      : "Link to company"}
                  </Button>
                </form>
              ) : null}

              {selectedCompanyId ? (
                <div className="overflow-x-auto rounded-xl border border-border/80">
                  <table className="w-full min-w-[280px] text-left text-sm">
                    <thead className="border-b border-border/80 bg-muted/40">
                      <tr>
                        <th className="px-3 py-2 font-medium">Name</th>
                        <th className="px-3 py-2 font-medium">Email</th>
                        <th className="px-3 py-2 text-right font-medium">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {companyMembersPending ? (
                        <tr>
                          <td
                            colSpan={3}
                            className="px-3 py-4 text-muted-foreground"
                          >
                            Loading…
                          </td>
                        </tr>
                      ) : companyMembers.length === 0 ? (
                        <tr>
                          <td
                            colSpan={3}
                            className="px-3 py-4 text-muted-foreground"
                          >
                            No one linked yet.
                          </td>
                        </tr>
                      ) : (
                        companyMembers.map((m) => (
                          <tr
                            key={m.id}
                            className="border-b border-border/60 last:border-0"
                          >
                            <td className="px-3 py-2.5">{m.user.name}</td>
                            <td className="px-3 py-2.5 text-muted-foreground">
                              {m.user.email}
                            </td>
                            <td className="px-3 py-2.5 text-right">
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="h-8 rounded-lg text-xs"
                                disabled={
                                  !canManage ||
                                  removeCompanyMemberMutation.isPending
                                }
                                onClick={() =>
                                  removeCompanyMemberMutation.mutate(m.user_id)
                                }
                              >
                                Remove
                              </Button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              ) : null}
              {selectedCompanyId ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 text-xs"
                  onClick={() => void refetchCompanyMembers()}
                >
                  Refresh list
                </Button>
              ) : null}
            </>
          )}
        </CardContent>
      </Card>

      <Card className="border-border/80 shadow-sm">
        <CardHeader className="border-b border-border/60 bg-muted/20 py-4">
          <div className="grid grid-cols-[2fr_1fr_1fr] gap-4 text-xs font-medium uppercase tracking-wide text-muted-foreground sm:grid-cols-[2fr_1fr_1fr]">
            <span>Legal name</span>
            <span className="hidden sm:block">Currency</span>
            <span className="hidden sm:block">Tax ID</span>
          </div>
        </CardHeader>
        <CardContent className="py-6">
          {rows.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground">
              No companies yet — add one above.
            </p>
          ) : (
            <ul className="divide-y divide-border/60">
              {rows.map((c) => (
                <li
                  key={c.id}
                  className="grid grid-cols-1 gap-1 py-4 sm:grid-cols-[2fr_1fr_1fr] sm:items-center"
                >
                  <span className="font-medium text-foreground">{c.name}</span>
                  <span className="text-sm text-muted-foreground sm:block">
                    {c.currency} · {c.country}
                  </span>
                  <span className="font-mono text-xs text-muted-foreground sm:block">
                    {c.tax_id ?? "—"}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
