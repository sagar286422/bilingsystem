"use client";

import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  customersQueryKey,
  getCustomer,
  listCustomers,
  type CustomerWithSummaryDto,
  type CustomerWithTransactionsDto,
  type PurchaseActivityLine,
} from "@/lib/api/customers";
import {
  companiesQueryKey,
  listCompanies,
} from "@/lib/api/companies";
import { getOrganization } from "@/lib/api/organizations";
import { authClient } from "@/lib/auth-client";
import { formatMoneyMinor } from "@/lib/money";
import { cn } from "@/lib/utils";
import { useWorkspaceStore } from "@/stores/workspace-store";

function statusClass(status: string) {
  switch (status) {
    case "succeeded":
      return "bg-emerald-500/15 text-emerald-800 dark:text-emerald-300";
    case "pending":
      return "bg-amber-500/15 text-amber-900 dark:text-amber-200";
    case "failed":
      return "bg-red-500/15 text-red-800 dark:text-red-300";
    default:
      return "bg-muted text-muted-foreground";
  }
}

function ActivityRow({ line }: { line: PurchaseActivityLine }) {
  const label =
    line.product_name ??
    (line.payment_page?.title || line.payment_page?.slug
      ? `Checkout: ${line.payment_page.title ?? line.payment_page.slug}`
      : "Payment");
  return (
    <div className="flex flex-col gap-1 border-b border-border/60 py-3 text-sm last:border-0">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="font-medium text-foreground">{label}</span>
        <span
          className={cn(
            "rounded-full px-2 py-0.5 text-xs font-medium capitalize",
            statusClass(line.status),
          )}
        >
          {line.status}
        </span>
      </div>
      <div className="text-muted-foreground flex flex-wrap gap-x-4 gap-y-1 text-xs">
        <span>
          {formatMoneyMinor(line.amount, line.currency)}{" "}
          <span className="opacity-80">· {line.gateway}</span>
        </span>
        {line.payment_page ? (
          <span>Page /{line.payment_page.slug}</span>
        ) : null}
        {line.razorpay_payment_id ? (
          <span className="font-mono">{line.razorpay_payment_id}</span>
        ) : null}
      </div>
      <time className="text-muted-foreground text-xs">
        {new Date(line.created_at).toLocaleString()}
      </time>
    </div>
  );
}

export function CustomersPanel() {
  const { data: session, isPending: sessionPending } = authClient.useSession();
  const userId = session?.user?.id;
  const organizationId = useWorkspaceStore((s) => s.activeOrganizationId);

  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(
    null,
  );
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(
    null,
  );

  const { data: orgDetail, isPending: orgPending } = useQuery({
    queryKey: ["organization", "detail", userId, organizationId],
    queryFn: () => getOrganization(organizationId!),
    enabled: Boolean(userId && organizationId),
    staleTime: 30_000,
    retry: false,
  });

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

  const customers: CustomerWithSummaryDto[] = customersRes?.data ?? [];

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
    data: customerDetail,
    isPending: detailPending,
    isError: detailError,
    error: detailErr,
  } = useQuery({
    queryKey: [
      "customer",
      "detail",
      organizationId,
      selectedCompanyId,
      selectedCustomerId,
    ],
    queryFn: () =>
      getCustomer(organizationId!, selectedCompanyId!, selectedCustomerId!, {
        expandTransactions: true,
      }) as Promise<CustomerWithTransactionsDto>,
    enabled: Boolean(
      organizationId && selectedCompanyId && selectedCustomerId,
    ),
    staleTime: 10_000,
    retry: false,
  });

  const loading =
    sessionPending ||
    !userId ||
    orgPending ||
    companiesPending ||
    !organizationId;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Company</CardTitle>
          <CardDescription>
            Customers are scoped to a company (legal entity). Checkout links use
            the payment page&apos;s company — pick the same company here to see
            those buyers.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-3">
          {companiesError ? (
            <p className="text-destructive text-sm">
              {companiesErr instanceof Error
                ? companiesErr.message
                : "Could not load companies."}{" "}
              <Button variant="outline" size="sm" onClick={() => refetchCompanies()}>
                Retry
              </Button>
            </p>
          ) : companies.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              Add a company under Settings first.
            </p>
          ) : (
            <label className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">Company</span>
              <select
                className="border-input bg-background rounded-md border px-3 py-2 text-sm"
                value={selectedCompanyId ?? ""}
                onChange={(e) => setSelectedCompanyId(e.target.value || null)}
                disabled={loading}
              >
                {companies.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Customers</CardTitle>
            <CardDescription>
              Anyone who starts checkout on a payment page is upserted here;
              successful Razorpay payments appear as{" "}
              <span className="text-foreground">succeeded</span>.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {customersError ? (
              <p className="text-destructive text-sm">
                {customersErr instanceof Error
                  ? customersErr.message
                  : "Could not load customers."}{" "}
                <Button variant="outline" size="sm" onClick={() => refetchCustomers()}>
                  Retry
                </Button>
              </p>
            ) : customersPending || !selectedCompanyId ? (
              <p className="text-muted-foreground text-sm">Loading…</p>
            ) : customers.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                No customers for this company yet. Complete a payment on a
                payment page that uses this company.
              </p>
            ) : (
              <ul className="max-h-[420px] space-y-1 overflow-y-auto pr-1">
                {customers.map((c) => {
                  const active = c.id === selectedCustomerId;
                  const ps = c.purchase_summary;
                  return (
                    <li key={c.id}>
                      <button
                        type="button"
                        onClick={() => setSelectedCustomerId(c.id)}
                        className={cn(
                          "w-full rounded-lg border px-3 py-2.5 text-left text-sm transition-colors",
                          active
                            ? "border-primary bg-primary/5"
                            : "border-border/80 hover:bg-muted/40",
                        )}
                      >
                        <div className="font-medium text-foreground">
                          {c.email}
                        </div>
                        {c.name ? (
                          <div className="text-muted-foreground text-xs">
                            {c.name}
                          </div>
                        ) : null}
                        <div className="text-muted-foreground mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-xs">
                          <span>
                            Paid:{" "}
                            <span className="text-foreground font-medium tabular-nums">
                              {ps.succeeded_count}
                            </span>
                          </span>
                          {ps.last_product_name ? (
                            <span className="truncate">
                              Last: {ps.last_product_name}
                            </span>
                          ) : null}
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Purchase history</CardTitle>
            <CardDescription>
              Full transaction timeline for the selected customer (checkout,
              subscriptions, invoices when linked).
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!selectedCustomerId ? (
              <p className="text-muted-foreground text-sm">
                Select a customer.
              </p>
            ) : detailError ? (
              <p className="text-destructive text-sm">
                {detailErr instanceof Error
                  ? detailErr.message
                  : "Could not load customer detail."}
              </p>
            ) : detailPending || !customerDetail ? (
              <p className="text-muted-foreground text-sm">Loading…</p>
            ) : (
              <div>
                <div className="mb-4">
                  <div className="font-medium">{customerDetail.email}</div>
                  {customerDetail.name ? (
                    <div className="text-muted-foreground text-sm">
                      {customerDetail.name}
                    </div>
                  ) : null}
                  <div className="text-muted-foreground font-mono text-xs">
                    {customerDetail.id}
                  </div>
                </div>
                <Separator className="my-3" />
                {customerDetail.transactions.length === 0 ? (
                  <p className="text-muted-foreground text-sm">
                    No transactions yet. If checkout was only started, you may
                    see a pending row until payment completes.
                  </p>
                ) : (
                  <div className="max-h-[380px] overflow-y-auto pr-1">
                    {customerDetail.transactions.map((t) => (
                      <ActivityRow key={t.transaction_id} line={t} />
                    ))}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
