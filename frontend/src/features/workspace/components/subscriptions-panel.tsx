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
  createCustomer,
  customersQueryKey,
  listCustomers,
} from "@/lib/api/customers";
import { authClient } from "@/lib/auth-client";
import { getOrganization } from "@/lib/api/organizations";
import {
  companiesQueryKey,
  listCompanies,
} from "@/lib/api/companies";
import { formatMoneyMinor } from "@/lib/money";
import {
  listPrices,
  pricesQueryKey,
} from "@/lib/api/prices";
import {
  createSubscription,
  listSubscriptions,
  subscriptionsQueryKey,
} from "@/lib/api/subscriptions";
import {
  listProducts,
  productsQueryKey,
} from "@/lib/api/products";
import { canManageOrgMembersAndTeams } from "@/lib/workspace-permissions";
import { useWorkspaceStore } from "@/stores/workspace-store";

export function SubscriptionsPanel() {
  const queryClient = useQueryClient();
  const { data: session, isPending: sessionPending } = authClient.useSession();
  const userId = session?.user?.id;
  const organizationId = useWorkspaceStore((s) => s.activeOrganizationId);

  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(
    null,
  );
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(
    null,
  );
  const [selectedProductId, setSelectedProductId] = useState<string | null>(
    null,
  );
  const [selectedPriceId, setSelectedPriceId] = useState<string | null>(null);

  const [custEmail, setCustEmail] = useState("");
  const [custName, setCustName] = useState("");
  const [custError, setCustError] = useState<string | null>(null);

  const [quantity, setQuantity] = useState("1");
  const [promoCode, setPromoCode] = useState("");
  const [subError, setSubError] = useState<string | null>(null);
  const [lastCreatedId, setLastCreatedId] = useState<string | null>(null);

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
    data: companiesRes,
    isPending: companiesPending,
    isError: companiesError,
    error: companiesErr,
    refetch: refetchCompanies,
  } = useQuery({
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

  const {
    data: customersRes,
    isPending: customersPending,
    isError: customersError,
    error: customersErr,
    refetch: refetchCustomers,
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
      setSelectedCustomerId(null);
      return;
    }
    setSelectedCustomerId((prev) =>
      prev && customers.some((c) => c.id === prev) ? prev : customers[0]!.id,
    );
  }, [customers]);

  const {
    data: productsRes,
    isPending: productsPending,
    isError: productsError,
    error: productsErr,
    refetch: refetchProducts,
  } = useQuery({
    queryKey: productsQueryKey(organizationId ?? undefined),
    queryFn: () => listProducts(organizationId!),
    enabled: Boolean(userId && organizationId && orgDetail),
    staleTime: 15_000,
    retry: false,
  });

  const products = productsRes?.data ?? [];

  useEffect(() => {
    if (products.length === 0) {
      setSelectedProductId(null);
      return;
    }
    setSelectedProductId((prev) =>
      prev && products.some((p) => p.id === prev) ? prev : products[0]!.id,
    );
  }, [products]);

  const {
    data: pricesRes,
    isPending: pricesPending,
  } = useQuery({
    queryKey: pricesQueryKey(
      organizationId ?? undefined,
      selectedProductId ?? undefined,
    ),
    queryFn: () => listPrices(organizationId!, selectedProductId!),
    enabled: Boolean(userId && organizationId && orgDetail && selectedProductId),
    staleTime: 10_000,
    retry: false,
  });

  const recurringPrices = useMemo(
    () =>
      pricesRes?.data.filter((p) => p.type === "recurring" && p.active) ?? [],
    [pricesRes?.data],
  );

  useEffect(() => {
    if (recurringPrices.length === 0) {
      setSelectedPriceId(null);
      return;
    }
    setSelectedPriceId((prev) =>
      prev && recurringPrices.some((p) => p.id === prev)
        ? prev
        : recurringPrices[0]!.id,
    );
  }, [recurringPrices]);

  const {
    data: subsRes,
    isPending: subsPending,
    refetch: refetchSubs,
  } = useQuery({
    queryKey: subscriptionsQueryKey(
      organizationId ?? undefined,
      selectedCompanyId ?? undefined,
      selectedCustomerId ?? undefined,
    ),
    queryFn: () =>
      listSubscriptions(
        organizationId!,
        selectedCompanyId!,
        selectedCustomerId!,
      ),
    enabled: Boolean(
      userId &&
        organizationId &&
        orgDetail &&
        selectedCompanyId &&
        selectedCustomerId,
    ),
    staleTime: 10_000,
    retry: false,
  });

  const createCustomerMutation = useMutation({
    mutationFn: () =>
      createCustomer(organizationId!, selectedCompanyId!, {
        email: custEmail.trim().toLowerCase(),
        ...(custName.trim() ? { name: custName.trim() } : {}),
      }),
    onSuccess: async (row) => {
      setCustError(null);
      setCustEmail("");
      setCustName("");
      setSelectedCustomerId(row.id);
      await queryClient.invalidateQueries({
        queryKey: customersQueryKey(
          organizationId ?? undefined,
          selectedCompanyId ?? undefined,
        ),
      });
    },
    onError: (e: Error) => setCustError(e.message),
  });

  const createSubMutation = useMutation({
    mutationFn: () => {
      const q = Number.parseInt(quantity.trim(), 10);
      const body = {
        price_id: selectedPriceId!,
        quantity: Number.isFinite(q) && q >= 1 ? q : 1,
        ...(promoCode.trim()
          ? { promo_code: promoCode.trim().toUpperCase() }
          : {}),
      };
      return createSubscription(
        organizationId!,
        selectedCompanyId!,
        selectedCustomerId!,
        body,
      );
    },
    onSuccess: async (res) => {
      setSubError(null);
      setLastCreatedId(res.subscription.id);
      await queryClient.invalidateQueries({
        queryKey: subscriptionsQueryKey(
          organizationId ?? undefined,
          selectedCompanyId ?? undefined,
          selectedCustomerId ?? undefined,
        ),
      });
    },
    onError: (e: Error) => setSubError(e.message),
  });

  if (sessionPending || !userId) {
    return (
      <p className="px-4 text-sm text-muted-foreground sm:px-8">Loading…</p>
    );
  }

  if (!organizationId) {
    return (
      <p className="px-4 text-sm text-muted-foreground sm:px-8">
        Select a workspace in the sidebar to manage subscriptions.
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
          {orgErr instanceof Error ? orgErr.message : "Workspace unavailable."}
        </p>
        <Button type="button" variant="outline" onClick={() => void refetchOrg()}>
          Retry
        </Button>
      </div>
    );
  }

  if (companiesPending || productsPending) {
    return (
      <p className="px-4 text-sm text-muted-foreground sm:px-8">Loading…</p>
    );
  }

  if (companiesError) {
    return (
      <div className="space-y-4 px-4 sm:px-8">
        <p className="text-sm text-destructive">
          {companiesErr instanceof Error
            ? companiesErr.message
            : "Could not load companies."}
        </p>
        <Button
          type="button"
          variant="outline"
          onClick={() => void refetchCompanies()}
        >
          Retry
        </Button>
      </div>
    );
  }

  if (productsError) {
    return (
      <div className="space-y-4 px-4 sm:px-8">
        <p className="text-sm text-destructive">
          {productsErr instanceof Error
            ? productsErr.message
            : "Could not load products."}
        </p>
        <Button
          type="button"
          variant="outline"
          onClick={() => void refetchProducts()}
        >
          Retry
        </Button>
      </div>
    );
  }

  function onAddCustomer(e: FormEvent) {
    e.preventDefault();
    setCustError(null);
    if (!selectedCompanyId) return;
    const em = custEmail.trim().toLowerCase();
    if (!em) {
      setCustError("Email is required.");
      return;
    }
    createCustomerMutation.mutate();
  }

  function onCreateSubscription(e: FormEvent) {
    e.preventDefault();
    setSubError(null);
    if (
      !selectedCompanyId ||
      !selectedCustomerId ||
      !selectedPriceId
    ) {
      setSubError("Pick a company, customer, and recurring price.");
      return;
    }
    createSubMutation.mutate();
  }

  const subscriptions = subsRes?.data ?? [];

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
          <p className="mt-1 text-muted-foreground">
            Only an organization owner or admin can create customers and
            subscriptions.
          </p>
        </div>
      ) : null}

      {companies.length === 0 ? (
        <Card className="border-border/80 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Add a company first</CardTitle>
            <CardDescription>
              Customers and subscriptions belong to a company. Create one under
              Settings → Companies.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <>
          <Card className="border-border/80 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg">Scope</CardTitle>
              <CardDescription>
                Subscriptions are per customer under a billing company.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4 sm:flex-row sm:flex-wrap">
              <div className="space-y-2 min-w-[200px] flex-1">
                <Label htmlFor="sub-company">Company</Label>
                <select
                  id="sub-company"
                  className="flex h-10 w-full rounded-xl border border-border/80 bg-background px-3 text-sm shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/30"
                  value={selectedCompanyId ?? ""}
                  onChange={(e) =>
                    setSelectedCompanyId(e.target.value || null)
                  }
                >
                  {companies.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.currency})
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2 min-w-[200px] flex-1">
                <Label htmlFor="sub-customer">Customer</Label>
                {customersError ? (
                  <p className="text-sm text-destructive">
                    {customersErr instanceof Error
                      ? customersErr.message
                      : "Could not load customers."}
                  </p>
                ) : (
                  <select
                    id="sub-customer"
                    className="flex h-10 w-full rounded-xl border border-border/80 bg-background px-3 text-sm shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/30 disabled:opacity-60"
                    value={selectedCustomerId ?? ""}
                    onChange={(e) =>
                      setSelectedCustomerId(e.target.value || null)
                    }
                    disabled={customersPending || customers.length === 0}
                  >
                    {customers.length === 0 ? (
                      <option value="">No customers yet — add one below</option>
                    ) : (
                      customers.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.email}
                          {c.name ? ` (${c.name})` : ""}
                        </option>
                      ))
                    )}
                  </select>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/80 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg">Add customer</CardTitle>
              <CardDescription>
                Email must be unique per company.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form
                className="grid max-w-lg gap-4"
                onSubmit={onAddCustomer}
              >
                {custError ? (
                  <p className="text-sm text-destructive" role="alert">
                    {custError}
                  </p>
                ) : null}
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="sub-cust-email">Email</Label>
                    <Input
                      id="sub-cust-email"
                      type="email"
                      value={custEmail}
                      onChange={(e) => setCustEmail(e.target.value)}
                      className="rounded-xl"
                      disabled={!canManage || createCustomerMutation.isPending}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="sub-cust-name">Name (optional)</Label>
                    <Input
                      id="sub-cust-name"
                      value={custName}
                      onChange={(e) => setCustName(e.target.value)}
                      className="rounded-xl"
                      disabled={!canManage || createCustomerMutation.isPending}
                    />
                  </div>
                </div>
                <Button
                  type="submit"
                  className="w-fit rounded-xl"
                  disabled={!canManage || createCustomerMutation.isPending}
                >
                  {createCustomerMutation.isPending
                    ? "Creating…"
                    : "Create customer"}
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card className="border-border/80 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg">New subscription</CardTitle>
              <CardDescription>
                Uses an <strong className="text-foreground">active recurring</strong>{" "}
                price from your catalog. The backend opens the first period, marks an
                invoice paid, and records a test gateway transaction (real PSP wiring
                comes next).
              </CardDescription>
            </CardHeader>
            <CardContent>
              {products.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Create a product and a recurring price under Products first.
                </p>
              ) : (
                <form
                  className="grid max-w-lg gap-4"
                  onSubmit={onCreateSubscription}
                >
                  {subError ? (
                    <p className="text-sm text-destructive" role="alert">
                      {subError}
                    </p>
                  ) : null}
                  {lastCreatedId ? (
                    <p className="text-sm text-primary" role="status">
                      Created subscription{" "}
                      <code className="rounded bg-muted px-1 text-xs">
                        {lastCreatedId}
                      </code>
                      .
                    </p>
                  ) : null}
                  <div className="space-y-2">
                    <Label htmlFor="sub-product">Product</Label>
                    <select
                      id="sub-product"
                      className="flex h-10 w-full rounded-xl border border-border/80 bg-background px-3 text-sm shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/30 disabled:opacity-60"
                      value={selectedProductId ?? ""}
                      onChange={(e) =>
                        setSelectedProductId(e.target.value || null)
                      }
                      disabled={
                        !canManage ||
                        createSubMutation.isPending ||
                        productsPending
                      }
                    >
                      {products.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="sub-price">Recurring price</Label>
                    <select
                      id="sub-price"
                      className="flex h-10 w-full rounded-xl border border-border/80 bg-background px-3 text-sm font-mono shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/30 disabled:opacity-60"
                      value={selectedPriceId ?? ""}
                      onChange={(e) =>
                        setSelectedPriceId(e.target.value || null)
                      }
                      disabled={
                        !canManage ||
                        createSubMutation.isPending ||
                        pricesPending ||
                        recurringPrices.length === 0
                      }
                    >
                      {recurringPrices.length === 0 ? (
                        <option value="">
                          No active recurring price for this product
                        </option>
                      ) : (
                        recurringPrices.map((pr) => (
                          <option key={pr.id} value={pr.id}>
                            v{pr.version} ·{" "}
                            {formatMoneyMinor(pr.unit_amount, pr.currency)} ·{" "}
                            {pr.interval ?? "?"}
                            {pr.interval_count && pr.interval_count > 1
                              ? ` ×${pr.interval_count}`
                              : ""}
                          </option>
                        ))
                      )}
                    </select>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="sub-qty">Quantity</Label>
                      <Input
                        id="sub-qty"
                        inputMode="numeric"
                        value={quantity}
                        onChange={(e) => setQuantity(e.target.value)}
                        className="rounded-xl font-mono"
                        disabled={!canManage || createSubMutation.isPending}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="sub-promo">Promo code (optional)</Label>
                      <Input
                        id="sub-promo"
                        value={promoCode}
                        onChange={(e) => setPromoCode(e.target.value)}
                        className="rounded-xl font-mono uppercase"
                        placeholder="WELCOME10"
                        disabled={!canManage || createSubMutation.isPending}
                      />
                    </div>
                  </div>
                  <Button
                    type="submit"
                    className="w-fit rounded-xl"
                    disabled={
                      !canManage ||
                      createSubMutation.isPending ||
                      !selectedCustomerId ||
                      !selectedPriceId ||
                      recurringPrices.length === 0
                    }
                  >
                    {createSubMutation.isPending
                      ? "Creating…"
                      : "Create subscription"}
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>

          {selectedCustomerId ? (
            <Card className="border-border/80 shadow-sm">
              <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
                <div>
                  <CardTitle className="text-lg">
                    Subscriptions for this customer
                  </CardTitle>
                  <CardDescription>
                    Current period and linked catalog price.
                  </CardDescription>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="rounded-xl"
                  onClick={() => void refetchSubs()}
                >
                  Refresh
                </Button>
              </CardHeader>
              <CardContent>
                {subsPending ? (
                  <p className="text-sm text-muted-foreground">Loading…</p>
                ) : subscriptions.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No subscriptions yet.
                  </p>
                ) : (
                  <div className="overflow-x-auto rounded-xl border border-border/80">
                    <table className="w-full min-w-[520px] text-left text-sm">
                      <thead className="border-b border-border/80 bg-muted/40">
                        <tr>
                          <th className="px-3 py-2 font-medium">ID</th>
                          <th className="px-3 py-2 font-medium">Status</th>
                          <th className="px-3 py-2 font-medium">Plan / price</th>
                          <th className="px-3 py-2 font-medium">Current period</th>
                        </tr>
                      </thead>
                      <tbody>
                        {subscriptions.map((s) => (
                          <tr
                            key={s.id}
                            className="border-b border-border/60 last:border-0"
                          >
                            <td className="px-3 py-2.5 font-mono text-xs">
                              {s.id}
                            </td>
                            <td className="px-3 py-2.5">{s.status}</td>
                            <td className="px-3 py-2.5 text-muted-foreground">
                              {s.price ? (
                                <>
                                  {s.price.product_name ?? "Product"}{" "}
                                  <span className="text-foreground">
                                    {formatMoneyMinor(
                                      s.price.unit_amount,
                                      s.price.currency,
                                    )}
                                  </span>
                                  {s.price.interval
                                    ? ` / ${s.price.interval}`
                                    : ""}
                                </>
                              ) : (
                                s.price_id
                              )}
                            </td>
                            <td className="px-3 py-2.5 text-xs text-muted-foreground">
                              {new Date(
                                s.current_period_start,
                              ).toLocaleDateString()}{" "}
                              →{" "}
                              {new Date(
                                s.current_period_end,
                              ).toLocaleDateString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          ) : null}
        </>
      )}
    </div>
  );
}
