"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { FormEvent } from "react";
import { useEffect, useMemo, useState } from "react";

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
import {
  companiesQueryKey,
  listCompanies,
} from "@/lib/api/companies";
import {
  customersQueryKey,
  listCustomers,
} from "@/lib/api/customers";
import {
  createInvoice,
  invoicesQueryKey,
  listInvoices,
  patchInvoice,
} from "@/lib/api/invoices";
import { authClient } from "@/lib/auth-client";
import { getOrganization } from "@/lib/api/organizations";
import { formatMoneyMinor } from "@/lib/money";
import { canManageOrgMembersAndTeams } from "@/lib/workspace-permissions";
import { useWorkspaceStore } from "@/stores/workspace-store";

const INVOICE_STATUSES = [
  "draft",
  "open",
  "paid",
  "void",
  "uncollectible",
] as const;

export function InvoicesPanel() {
  const queryClient = useQueryClient();
  const { data: session, isPending: sessionPending } = authClient.useSession();
  const userId = session?.user?.id;
  const organizationId = useWorkspaceStore((s) => s.activeOrganizationId);

  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(
    null,
  );
  const [customerId, setCustomerId] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [subtotalMinor, setSubtotalMinor] = useState("1000");
  const [discountMinor, setDiscountMinor] = useState("0");
  const [formError, setFormError] = useState<string | null>(null);

  const { data: orgDetail, isPending: orgPending } = useQuery({
    queryKey: ["organization", "detail", userId, organizationId],
    queryFn: () => getOrganization(organizationId!),
    enabled: Boolean(userId && organizationId),
    staleTime: 30_000,
    retry: false,
  });

  const canManage = canManageOrgMembersAndTeams(orgDetail, userId);

  const { data: companiesRes } = useQuery({
    queryKey: companiesQueryKey(organizationId ?? undefined),
    queryFn: () => listCompanies(organizationId!),
    enabled: Boolean(userId && organizationId && orgDetail),
    staleTime: 15_000,
    retry: false,
  });

  const companies = companiesRes?.data ?? [];

  useEffect(() => {
    if (companies.length === 0) {
      setSelectedCompanyId(null);
      return;
    }
    setSelectedCompanyId((prev) =>
      prev && companies.some((c) => c.id === prev) ? prev : companies[0]!.id,
    );
  }, [companies]);

  const selectedCompany = companies.find((c) => c.id === selectedCompanyId);

  useEffect(() => {
    if (selectedCompany?.currency) {
      setCurrency(selectedCompany.currency);
    }
  }, [selectedCompany?.currency]);

  const {
    data: customersRes,
    isPending: customersPending,
  } = useQuery({
    queryKey: customersQueryKey(
      organizationId ?? undefined,
      selectedCompanyId ?? undefined,
    ),
    queryFn: () => listCustomers(organizationId!, selectedCompanyId!),
    enabled: Boolean(userId && organizationId && orgDetail && selectedCompanyId),
    staleTime: 10_000,
    retry: false,
  });

  const customers = customersRes?.data ?? [];

  useEffect(() => {
    if (customers.length === 0) {
      setCustomerId("");
      return;
    }
    setCustomerId((prev) =>
      prev && customers.some((c) => c.id === prev) ? prev : customers[0]!.id,
    );
  }, [customers]);

  const {
    data: invoicesRes,
    isPending: invoicesPending,
    isError: invoicesError,
    error: invoicesErr,
    refetch: refetchInvoices,
  } = useQuery({
    queryKey: invoicesQueryKey(
      organizationId ?? undefined,
      selectedCompanyId ?? undefined,
    ),
    queryFn: () => listInvoices(organizationId!, selectedCompanyId!),
    enabled: Boolean(userId && organizationId && orgDetail && selectedCompanyId),
    staleTime: 10_000,
    retry: false,
  });

  const invoices = invoicesRes?.data ?? [];

  const createMutation = useMutation({
    mutationFn: () => {
      const sub = Number.parseInt(subtotalMinor, 10);
      const disc = Number.parseInt(discountMinor, 10) || 0;
      if (!Number.isFinite(sub) || sub < 0) {
        throw new Error("Subtotal must be a non-negative integer (minor units).");
      }
      if (!Number.isFinite(disc) || disc < 0 || disc > sub) {
        throw new Error("Discount must be valid minor units ≤ subtotal.");
      }
      if (!customerId) throw new Error("Select a customer.");
      return createInvoice(organizationId!, selectedCompanyId!, {
        customer_id: customerId,
        currency: currency.trim().toUpperCase(),
        subtotal_amount: sub,
        discount_amount: disc,
        total_amount: sub - disc,
        status: "draft",
      });
    },
    onSuccess: async () => {
      setFormError(null);
      await queryClient.invalidateQueries({
        queryKey: invoicesQueryKey(
          organizationId ?? undefined,
          selectedCompanyId ?? undefined,
        ),
      });
    },
    onError: (e: Error) => setFormError(e.message),
  });

  const statusMutation = useMutation({
    mutationFn: ({
      invoiceId,
      status,
    }: {
      invoiceId: string;
      status: string;
    }) =>
      patchInvoice(organizationId!, selectedCompanyId!, invoiceId, { status }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: invoicesQueryKey(
          organizationId ?? undefined,
          selectedCompanyId ?? undefined,
        ),
      });
    },
  });

  const sortedInvoices = useMemo(
    () => [...invoices].sort((a, b) => b.created_at.localeCompare(a.created_at)),
    [invoices],
  );

  function onCreate(e: FormEvent) {
    e.preventDefault();
    setFormError(null);
    createMutation.mutate();
  }

  if (sessionPending || !userId) {
    return (
      <p className="text-muted-foreground px-4 text-sm sm:px-8">Loading…</p>
    );
  }

  if (!organizationId) {
    return (
      <p className="text-muted-foreground px-4 text-sm sm:px-8">
        Select a workspace in the sidebar.
      </p>
    );
  }

  if (orgPending) {
    return (
      <p className="text-muted-foreground px-4 text-sm sm:px-8">
        Loading workspace…
      </p>
    );
  }

  return (
    <div className="space-y-8 px-4 py-8 sm:px-8">
      {!canManage ? (
        <div
          className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm"
          role="status"
        >
          <p className="font-medium text-amber-950 dark:text-amber-100">
            Read-only
          </p>
          <p className="text-muted-foreground mt-1">
            Only organization owners and admins can create or update invoices.
          </p>
        </div>
      ) : null}

      <Card className="border-border/80 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg">Company</CardTitle>
          <CardDescription>
            Invoices belong to one company (legal entity) and one customer.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {companies.length === 0 ? (
            <p className="text-muted-foreground text-sm">Add a company first.</p>
          ) : (
            <label className="flex flex-wrap items-center gap-2 text-sm">
              <span className="text-muted-foreground">Company</span>
              <select
                className="border-input bg-background rounded-md border px-3 py-2"
                value={selectedCompanyId ?? ""}
                onChange={(e) => setSelectedCompanyId(e.target.value || null)}
              >
                {companies.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.currency})
                  </option>
                ))}
              </select>
            </label>
          )}
        </CardContent>
      </Card>

      {canManage && selectedCompanyId ? (
        <Card className="border-border/80 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Create invoice</CardTitle>
            <CardDescription>
              Amounts are in minor units (e.g. cents).{" "}
              <code className="text-xs">total = subtotal − discount</code>.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form className="grid max-w-lg gap-4" onSubmit={onCreate}>
              {formError ? (
                <p className="text-destructive text-sm" role="alert">
                  {formError}
                </p>
              ) : null}
              <div className="space-y-2">
                <Label>Customer</Label>
                <select
                  className="border-input bg-background h-10 w-full rounded-md border px-3 text-sm"
                  value={customerId}
                  onChange={(e) => setCustomerId(e.target.value)}
                  disabled={customersPending || customers.length === 0}
                >
                  {customers.length === 0 ? (
                    <option value="">No customers — add via Customers or checkout</option>
                  ) : (
                    customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.email}
                        {c.name ? ` (${c.name})` : ""}
                      </option>
                    ))
                  )}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="inv-currency">Currency (ISO 4217)</Label>
                <Input
                  id="inv-currency"
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="rounded-xl"
                  maxLength={3}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="inv-subtotal">Subtotal (minor units)</Label>
                <Input
                  id="inv-subtotal"
                  inputMode="numeric"
                  value={subtotalMinor}
                  onChange={(e) => setSubtotalMinor(e.target.value)}
                  className="rounded-xl"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="inv-discount">Discount (minor units)</Label>
                <Input
                  id="inv-discount"
                  inputMode="numeric"
                  value={discountMinor}
                  onChange={(e) => setDiscountMinor(e.target.value)}
                  className="rounded-xl"
                />
              </div>
              <Button
                type="submit"
                className="w-fit rounded-xl"
                disabled={
                  createMutation.isPending ||
                  customers.length === 0 ||
                  !customerId
                }
              >
                {createMutation.isPending ? "Creating…" : "Create draft invoice"}
              </Button>
            </form>
          </CardContent>
        </Card>
      ) : null}

      <Card className="border-border/80 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg">Invoices</CardTitle>
          <CardDescription>
            Subscription billing also creates invoices; manual rows appear here
            too.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {invoicesError ? (
            <p className="text-destructive text-sm">
              {invoicesErr instanceof Error
                ? invoicesErr.message
                : "Could not load invoices."}{" "}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => void refetchInvoices()}
              >
                Retry
              </Button>
            </p>
          ) : invoicesPending || !selectedCompanyId ? (
            <p className="text-muted-foreground text-sm">Loading…</p>
          ) : sortedInvoices.length === 0 ? (
            <p className="text-muted-foreground text-sm">No invoices yet.</p>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-border/80">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead className="bg-muted/40 border-b border-border/80">
                  <tr>
                    <th className="px-3 py-2 font-medium">Customer</th>
                    <th className="px-3 py-2 font-medium">Total</th>
                    <th className="px-3 py-2 font-medium">Status</th>
                    <th className="px-3 py-2 font-medium">Created</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedInvoices.map((inv) => (
                    <tr
                      key={inv.id}
                      className="border-border/60 border-b last:border-0"
                    >
                      <td className="px-3 py-2.5">
                        <div className="font-medium">{inv.customer.email}</div>
                        <code className="text-muted-foreground text-xs">
                          {inv.id}
                        </code>
                      </td>
                      <td className="px-3 py-2.5 tabular-nums">
                        {formatMoneyMinor(inv.total_amount, inv.currency)}
                      </td>
                      <td className="px-3 py-2.5">
                        {canManage ? (
                          <select
                            className="border-input bg-background h-9 rounded-md border px-2 text-sm"
                            value={inv.status}
                            disabled={statusMutation.isPending}
                            onChange={(e) => {
                              const v = e.target.value;
                              if (v === inv.status) return;
                              statusMutation.mutate({
                                invoiceId: inv.id,
                                status: v,
                              });
                            }}
                          >
                            {INVOICE_STATUSES.map((s) => (
                              <option key={s} value={s}>
                                {s}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <span className="capitalize">{inv.status}</span>
                        )}
                      </td>
                      <td className="text-muted-foreground px-3 py-2.5 text-xs">
                        {new Date(inv.created_at).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
