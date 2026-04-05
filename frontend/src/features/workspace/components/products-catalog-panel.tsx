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
import { authClient } from "@/lib/auth-client";
import {
  createPrice,
  deactivatePrice,
  listPrices,
  pricesQueryKey,
  type CreatePriceBody,
} from "@/lib/api/prices";
import {
  currenciesQueryKey,
  listCurrencies,
  minorUnitsByCode,
} from "@/lib/api/currencies";
import {
  createProduct,
  listProducts,
  productsQueryKey,
} from "@/lib/api/products";
import { getOrganization } from "@/lib/api/organizations";
import { formatMoneyMinor } from "@/lib/money";
import { canManageOrgMembersAndTeams } from "@/lib/workspace-permissions";
import { useWorkspaceStore } from "@/stores/workspace-store";

export function ProductsCatalogPanel() {
  const queryClient = useQueryClient();
  const { data: session, isPending: sessionPending } = authClient.useSession();
  const userId = session?.user?.id;
  const organizationId = useWorkspaceStore((s) => s.activeOrganizationId);

  const [productName, setProductName] = useState("");
  const [productDescription, setProductDescription] = useState("");
  const [productError, setProductError] = useState<string | null>(null);

  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);

  const [priceCurrency, setPriceCurrency] = useState("USD");
  const [priceAmountMinor, setPriceAmountMinor] = useState("");
  const [priceType, setPriceType] = useState<"one_time" | "recurring">(
    "one_time",
  );
  const [priceInterval, setPriceInterval] = useState<"month" | "year">(
    "month",
  );
  const [priceError, setPriceError] = useState<string | null>(null);

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
  const currencies = currencyRows ?? [];
  const minorMap = useMemo(
    () => minorUnitsByCode(currencyRows ?? []),
    [currencyRows],
  );

  useEffect(() => {
    if (!currencyRows?.length) return;
    setPriceCurrency((prev) =>
      currencyRows.some((c) => c.code === prev)
        ? prev
        : currencyRows[0]!.code,
    );
  }, [currencyRows]);

  const canManage = canManageOrgMembersAndTeams(orgDetail, userId);

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
    refetch: refetchPrices,
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

  const createProductMutation = useMutation({
    mutationFn: () =>
      createProduct(organizationId!, {
        name: productName.trim(),
        ...(productDescription.trim()
          ? { description: productDescription.trim() }
          : {}),
      }),
    onSuccess: async () => {
      setProductError(null);
      setProductName("");
      setProductDescription("");
      await queryClient.invalidateQueries({
        queryKey: productsQueryKey(organizationId ?? undefined),
      });
    },
    onError: (e: Error) => setProductError(e.message),
  });

  const createPriceMutation = useMutation({
    mutationFn: () => {
      const minor = Number.parseInt(priceAmountMinor.trim(), 10);
      const body: CreatePriceBody = {
        currency: priceCurrency.trim().toUpperCase(),
        unit_amount: minor,
        type: priceType,
        billing_scheme: "fixed",
      };
      if (priceType === "recurring") {
        body.interval = priceInterval;
        body.interval_count = 1;
      }
      return createPrice(organizationId!, selectedProductId!, body);
    },
    onSuccess: async () => {
      setPriceError(null);
      setPriceAmountMinor("");
      await queryClient.invalidateQueries({
        queryKey: pricesQueryKey(
          organizationId ?? undefined,
          selectedProductId ?? undefined,
        ),
      });
    },
    onError: (e: Error) => setPriceError(e.message),
  });

  const deactivatePriceMutation = useMutation({
    mutationFn: (priceId: string) =>
      deactivatePrice(organizationId!, selectedProductId!, priceId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: pricesQueryKey(
          organizationId ?? undefined,
          selectedProductId ?? undefined,
        ),
      });
    },
    onError: (e: Error) => setPriceError(e.message),
  });

  if (sessionPending || !userId) {
    return (
      <p className="px-4 text-sm text-muted-foreground sm:px-8">Loading…</p>
    );
  }

  if (!organizationId) {
    return (
      <p className="px-4 text-sm text-muted-foreground sm:px-8">
        Select a workspace in the sidebar to manage the catalog.
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

  if (productsPending) {
    return (
      <p className="px-4 text-sm text-muted-foreground sm:px-8">
        Loading products…
      </p>
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
        <Button type="button" variant="outline" onClick={() => void refetchProducts()}>
          Retry
        </Button>
      </div>
    );
  }

  const prices = pricesRes?.data ?? [];

  function onCreateProduct(e: FormEvent) {
    e.preventDefault();
    setProductError(null);
    const n = productName.trim();
    if (!n) {
      setProductError("Product name is required.");
      return;
    }
    createProductMutation.mutate();
  }

  function onCreatePrice(e: FormEvent) {
    e.preventDefault();
    setPriceError(null);
    const minor = Number.parseInt(priceAmountMinor.trim(), 10);
    if (!Number.isFinite(minor) || minor < 0) {
      setPriceError("Amount must be a non-negative integer (minor units, e.g. cents).");
      return;
    }
    const cur = priceCurrency.trim().toUpperCase();
    if (!(currencyRows?.some((c) => c.code === cur) ?? false)) {
      setPriceError("Choose a currency from the catalog.");
      return;
    }
    if (!selectedProductId) return;
    createPriceMutation.mutate();
  }

  return (
    <div className="space-y-8 px-4 py-8 sm:px-8">
      {!canManage ? (
        <div
          className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm"
          role="status"
        >
          <p className="font-medium text-amber-950 dark:text-amber-100">
            Read-only catalog
          </p>
          <p className="mt-1 text-muted-foreground">
            Only an organization <strong className="text-foreground">owner</strong>{" "}
            or <strong className="text-foreground">admin</strong> can create
            products and prices (or use a secret API key).
          </p>
        </div>
      ) : null}

      <Card className="border-border/80 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg">Create product</CardTitle>
          <CardDescription>
            A product is a sellable item; prices are versioned and immutable except
            deactivation.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="grid max-w-lg gap-4" onSubmit={onCreateProduct}>
            {productError ? (
              <p className="text-sm text-destructive" role="alert">
                {productError}
              </p>
            ) : null}
            <div className="space-y-2">
              <Label htmlFor="prod-name">Name</Label>
              <Input
                id="prod-name"
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
                placeholder="Pro plan"
                className="rounded-xl"
                disabled={!canManage || createProductMutation.isPending}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="prod-desc">Description (optional)</Label>
              <Input
                id="prod-desc"
                value={productDescription}
                onChange={(e) => setProductDescription(e.target.value)}
                placeholder="Short summary"
                className="rounded-xl"
                disabled={!canManage || createProductMutation.isPending}
              />
            </div>
            <Button
              type="submit"
              className="w-fit rounded-xl"
              disabled={!canManage || createProductMutation.isPending}
            >
              {createProductMutation.isPending ? "Creating…" : "Create product"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="border-border/80 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg">Prices</CardTitle>
          <CardDescription>
            <code className="rounded bg-muted px-1 py-0.5 text-xs">unit_amount</code>{" "}
            is stored in minor units per ISO 4217 (e.g.{" "}
            <code className="text-xs">999</code> = $9.99 for USD; whole yen for JPY).
            Currencies come from the server catalog.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {products.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Create a product first, then add prices.
            </p>
          ) : (
            <>
              <div className="space-y-2 max-w-lg">
                <Label htmlFor="prod-select">Product</Label>
                <select
                  id="prod-select"
                  className="flex h-10 w-full rounded-xl border border-border/80 bg-background px-3 text-sm shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/30"
                  value={selectedProductId ?? ""}
                  onChange={(e) => setSelectedProductId(e.target.value || null)}
                >
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                      {!p.active ? " (inactive)" : ""}
                    </option>
                  ))}
                </select>
              </div>

              {selectedProductId ? (
                <form
                  className="grid max-w-lg gap-4"
                  onSubmit={onCreatePrice}
                >
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
                  {priceError ? (
                    <p className="text-sm text-destructive" role="alert">
                      {priceError}
                    </p>
                  ) : null}
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="price-currency">Currency</Label>
                      <select
                        id="price-currency"
                        className="flex h-10 w-full rounded-xl border border-border/80 bg-background px-3 text-sm font-mono shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/30 disabled:opacity-60"
                        value={priceCurrency}
                        onChange={(e) => setPriceCurrency(e.target.value)}
                        disabled={
                          !canManage ||
                          createPriceMutation.isPending ||
                          currenciesPending ||
                          currencies.length === 0
                        }
                      >
                        {currencies.map((c) => (
                          <option key={c.code} value={c.code}>
                            {c.code} — {c.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="price-amount">Amount (minor units)</Label>
                      <Input
                        id="price-amount"
                        inputMode="numeric"
                        value={priceAmountMinor}
                        onChange={(e) => setPriceAmountMinor(e.target.value)}
                        placeholder="999"
                        className="rounded-xl font-mono"
                        disabled={!canManage || createPriceMutation.isPending}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="price-type">Billing</Label>
                    <select
                      id="price-type"
                      className="flex h-10 w-full rounded-xl border border-border/80 bg-background px-3 text-sm shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/30"
                      value={priceType}
                      onChange={(e) =>
                        setPriceType(e.target.value as "one_time" | "recurring")
                      }
                      disabled={!canManage || createPriceMutation.isPending}
                    >
                      <option value="one_time">One-time</option>
                      <option value="recurring">Recurring</option>
                    </select>
                  </div>
                  {priceType === "recurring" ? (
                    <div className="space-y-2">
                      <Label htmlFor="price-interval">Interval</Label>
                      <select
                        id="price-interval"
                        className="flex h-10 w-full rounded-xl border border-border/80 bg-background px-3 text-sm shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/30"
                        value={priceInterval}
                        onChange={(e) =>
                          setPriceInterval(e.target.value as "month" | "year")
                        }
                        disabled={!canManage || createPriceMutation.isPending}
                      >
                        <option value="month">Monthly</option>
                        <option value="year">Yearly</option>
                      </select>
                    </div>
                  ) : null}
                  <Button
                    type="submit"
                    className="w-fit rounded-xl"
                    disabled={
                      !canManage ||
                      createPriceMutation.isPending ||
                      currenciesPending ||
                      currencies.length === 0 ||
                      currenciesError
                    }
                  >
                    {createPriceMutation.isPending
                      ? "Creating price…"
                      : "Add price"}
                  </Button>
                </form>
              ) : null}

              {selectedProductId ? (
                <div className="overflow-x-auto rounded-xl border border-border/80">
                  <table className="w-full min-w-[320px] text-left text-sm">
                    <thead className="border-b border-border/80 bg-muted/40">
                      <tr>
                        <th className="px-3 py-2 font-medium">Version</th>
                        <th className="px-3 py-2 font-medium">Amount</th>
                        <th className="px-3 py-2 font-medium">Type</th>
                        <th className="px-3 py-2 font-medium">Active</th>
                        <th className="px-3 py-2 text-right font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pricesPending ? (
                        <tr>
                          <td
                            colSpan={5}
                            className="px-3 py-4 text-muted-foreground"
                          >
                            Loading prices…
                          </td>
                        </tr>
                      ) : prices.length === 0 ? (
                        <tr>
                          <td
                            colSpan={5}
                            className="px-3 py-4 text-muted-foreground"
                          >
                            No prices yet for this product.
                          </td>
                        </tr>
                      ) : (
                        prices.map((pr) => (
                          <tr
                            key={pr.id}
                            className="border-b border-border/60 last:border-0"
                          >
                            <td className="px-3 py-2.5 font-mono text-xs">
                              v{pr.version}
                            </td>
                            <td className="px-3 py-2.5">
                              {formatMoneyMinor(
                                pr.unit_amount,
                                pr.currency,
                                minorMap.get(pr.currency.toUpperCase()) ?? 2,
                              )}
                            </td>
                            <td className="px-3 py-2.5 text-muted-foreground">
                              {pr.type}
                              {pr.interval
                                ? ` · ${pr.interval}`
                                : ""}
                            </td>
                            <td className="px-3 py-2.5">
                              {pr.active ? (
                                <span className="text-primary">Yes</span>
                              ) : (
                                <span className="text-muted-foreground">No</span>
                              )}
                            </td>
                            <td className="px-3 py-2.5 text-right">
                              {pr.active ? (
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  className="h-8 rounded-lg text-xs"
                                  disabled={
                                    !canManage ||
                                    deactivatePriceMutation.isPending
                                  }
                                  onClick={() =>
                                    deactivatePriceMutation.mutate(pr.id)
                                  }
                                >
                                  Deactivate
                                </Button>
                              ) : (
                                <span className="text-xs text-muted-foreground">
                                  —
                                </span>
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              ) : null}
              {selectedProductId ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 text-xs"
                  onClick={() => void refetchPrices()}
                >
                  Refresh prices
                </Button>
              ) : null}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
