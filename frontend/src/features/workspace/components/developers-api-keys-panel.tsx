"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { FormEvent } from "react";
import { useState } from "react";

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
  apiKeysQueryKey,
  createApiKey,
  listApiKeys,
  revokeApiKey,
} from "@/lib/api/api-keys";
import { authClient } from "@/lib/auth-client";
import { getOrganization } from "@/lib/api/organizations";
import { siteOrigin } from "@/lib/env-public";
import { canManageOrgMembersAndTeams } from "@/lib/workspace-permissions";
import { useWorkspaceStore } from "@/stores/workspace-store";

export function DevelopersApiKeysPanel() {
  const queryClient = useQueryClient();
  const { data: session, isPending: sessionPending } = authClient.useSession();
  const userId = session?.user?.id;
  const organizationId = useWorkspaceStore((s) => s.activeOrganizationId);

  const [keyName, setKeyName] = useState("");
  const [keyKind, setKeyKind] = useState<"secret" | "publishable">("secret");
  const [keyEnv, setKeyEnv] = useState<"test" | "live">("test");
  const [formError, setFormError] = useState<string | null>(null);
  const [revealedSecret, setRevealedSecret] = useState<string | null>(null);
  const [revokeId, setRevokeId] = useState<string | null>(null);

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
    data: listRes,
    isPending: listPending,
    isError: listError,
    error: listErr,
    refetch: refetchList,
  } = useQuery({
    queryKey: apiKeysQueryKey(organizationId ?? undefined),
    queryFn: () => listApiKeys(organizationId!),
    enabled: Boolean(userId && organizationId && orgDetail),
    staleTime: 15_000,
    retry: false,
  });

  const createMutation = useMutation({
    mutationFn: () =>
      createApiKey(organizationId!, {
        name: keyName.trim(),
        kind: keyKind,
        environment: keyEnv,
      }),
    onSuccess: (row) => {
      setFormError(null);
      setKeyName("");
      if (row.secret) setRevealedSecret(row.secret);
      void queryClient.invalidateQueries({
        queryKey: apiKeysQueryKey(organizationId ?? undefined),
      });
    },
    onError: (e: Error) => setFormError(e.message),
  });

  const revokeMutation = useMutation({
    mutationFn: (id: string) => revokeApiKey(organizationId!, id),
    onSuccess: async () => {
      setRevokeId(null);
      await queryClient.invalidateQueries({
        queryKey: apiKeysQueryKey(organizationId ?? undefined),
      });
    },
    onError: (e: Error) => setFormError(e.message),
  });

  if (sessionPending || !userId) {
    return (
      <p className="px-4 text-sm text-muted-foreground sm:px-8">Loading…</p>
    );
  }

  if (!organizationId) {
    return (
      <p className="px-4 text-sm text-muted-foreground sm:px-8">
        Select a workspace in the sidebar to manage API keys.
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

  if (listError) {
    return (
      <div className="space-y-4 px-4 sm:px-8">
        <p className="text-sm text-destructive">
          {listErr instanceof Error ? listErr.message : "Could not load API keys."}
        </p>
        <Button type="button" variant="outline" onClick={() => void refetchList()}>
          Retry
        </Button>
      </div>
    );
  }

  const keys = listRes?.data ?? [];
  const examplePath = organizationId
    ? `${siteOrigin}/api/v1/organizations/${organizationId}/products`
    : `${siteOrigin}/api/v1/organizations/{organization_id}/products`;

  function onCreateKey(e: FormEvent) {
    e.preventDefault();
    setFormError(null);
    setRevealedSecret(null);
    if (!keyName.trim()) {
      setFormError("Name is required.");
      return;
    }
    createMutation.mutate();
  }

  return (
    <div className="space-y-8 px-4 py-8 sm:px-8">
      <Card className="border-border/80 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg">Using the REST API</CardTitle>
          <CardDescription>
            This console issues <strong className="text-foreground">Billing System</strong>{" "}
            keys: <code className="text-xs">sk_*</code> for{" "}
            <strong className="text-foreground">server</strong> REST (
            <code className="text-xs">/api/v1/organizations/.../...</code>) and{" "}
            <code className="text-xs">pk_*</code> for <strong className="text-foreground">browser</strong>{" "}
            checkout: public payment routes +{" "}
            <code className="text-xs">GET /api/v1/whoami-publishable</code>. Not Razorpay keys.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>
            Base URL (browser, via Next rewrite):{" "}
            <code className="rounded bg-muted px-1.5 py-0.5 text-xs text-foreground">
              {siteOrigin}/api/v1/…
            </code>
          </p>
          <p>
            Server-to-server: send{" "}
            <code className="rounded bg-muted px-1.5 py-0.5 text-xs text-foreground">
              Authorization: Bearer sk_test_…
            </code>{" "}
            or{" "}
            <code className="rounded bg-muted px-1.5 py-0.5 text-xs text-foreground">
              sk_live_…
            </code>
            . The organization ID in the URL must match the key&apos;s organization.
          </p>
          <p className="font-mono text-xs text-foreground/90 break-all">
            curl -H &quot;Authorization: Bearer YOUR_SECRET_KEY&quot; {examplePath}
          </p>
        </CardContent>
      </Card>

      <Card className="border-border/80 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg">Postman & partner integration</CardTitle>
          <CardDescription>
            Step-by-step flows, public checkout API, and the optional{" "}
            <code className="text-xs">billing-checkout.js</code> embed helper.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <ol className="list-decimal space-y-2 pl-5">
            <li>
              In the dashboard, create a <strong className="text-foreground">secret</strong> key
              and copy the full <code className="text-xs">sk_test_…</code> value once.
            </li>
            <li>
              Postman: <strong className="text-foreground">Authorization → Bearer Token</strong>
              , paste that token (not the short prefix shown in the list).
            </li>
            <li>
              Call{" "}
              <code className="rounded bg-muted px-1 py-0.5 text-xs">
                GET {siteOrigin}/api/v1/whoami
              </code>{" "}
              (or port <code className="text-xs">4000</code> on Fastify) and note{" "}
              <code className="text-xs">organization_id</code>.
            </li>
            <li>
              Use the same Bearer header on{" "}
              <code className="rounded bg-muted px-1 py-0.5 text-xs">
                GET {siteOrigin}/api/v1/organizations/&#123;organization_id&#125;/products
              </code>{" "}
              and other <code className="text-xs">/api/v1</code> routes — path org must match
              the key.
            </li>
            <li>
              <strong className="text-foreground">Checkout</strong> does not need an API key:
              hosted page{" "}
              <code className="rounded bg-muted px-1 py-0.5 text-xs">
                {siteOrigin}/pay/&#123;slug&#125;
              </code>
              , or load{" "}
              <code className="rounded bg-muted px-1 py-0.5 text-xs">
                /billing-checkout.js
              </code>{" "}
              for popup/iframe + <code className="text-xs">postMessage</code> when{" "}
              <code className="text-xs">embed=1</code>.
            </li>
          </ol>
          <p className="text-xs">
            Full guide, public endpoints, and security notes: repository file{" "}
            <code className="rounded bg-muted px-1 py-0.5 text-foreground">
              docs/DEVELOPER_INTEGRATION.md
            </code>
            . <code className="text-xs">pk_*</code> works on public checkout +{" "}
            <code className="text-xs">whoami-publishable</code> only — not on{" "}
            <code className="text-xs">/organizations/.../products</code> (use{" "}
            <code className="text-xs">sk_*</code> there).
          </p>
        </CardContent>
      </Card>

      {!canManage ? (
        <div
          className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm"
          role="status"
        >
          <p className="font-medium text-amber-950 dark:text-amber-100">
            Read-only
          </p>
          <p className="mt-1 text-muted-foreground">
            Only an organization owner or admin can create or revoke API keys.
          </p>
        </div>
      ) : null}

      <Card className="border-border/80 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg">Create secret key</CardTitle>
          <CardDescription>
            Secret keys can call all server routes your role allows. Store them in environment
            variables, never in client-side code.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="grid max-w-lg gap-4" onSubmit={onCreateKey}>
            {formError ? (
              <p className="text-sm text-destructive" role="alert">
                {formError}
              </p>
            ) : null}
            {revealedSecret ? (
              <div
                className="rounded-xl border border-amber-500/50 bg-amber-500/10 px-4 py-3 text-sm"
                role="status"
              >
                <p className="font-medium text-amber-950 dark:text-amber-100">
                  Copy this secret now
                </p>
                <p className="mt-1 text-muted-foreground">
                  It will not be shown again. Only the prefix is stored.
                </p>
                <pre className="mt-3 overflow-x-auto rounded-lg bg-background/80 p-3 font-mono text-xs text-foreground">
                  {revealedSecret}
                </pre>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="mt-3 rounded-lg"
                  onClick={async () => {
                    await navigator.clipboard.writeText(revealedSecret);
                  }}
                >
                  Copy to clipboard
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="mt-3 rounded-lg"
                  onClick={() => setRevealedSecret(null)}
                >
                  Dismiss
                </Button>
              </div>
            ) : null}
            <div className="space-y-2">
              <Label htmlFor="api-key-name">Name</Label>
              <Input
                id="api-key-name"
                value={keyName}
                onChange={(e) => setKeyName(e.target.value)}
                placeholder="Production backend"
                className="rounded-xl"
                disabled={!canManage || createMutation.isPending}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="api-key-kind">Kind</Label>
                <select
                  id="api-key-kind"
                  className="flex h-10 w-full rounded-xl border border-border/80 bg-background px-3 text-sm shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/30 disabled:opacity-60"
                  value={keyKind}
                  onChange={(e) =>
                    setKeyKind(e.target.value as "secret" | "publishable")
                  }
                  disabled={!canManage || createMutation.isPending}
                >
                  <option value="secret">Secret (sk_) — server API</option>
                  <option value="publishable">
                    Publishable (pk_) — browser / public checkout
                  </option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="api-key-env">Environment</Label>
                <select
                  id="api-key-env"
                  className="flex h-10 w-full rounded-xl border border-border/80 bg-background px-3 text-sm shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/30 disabled:opacity-60"
                  value={keyEnv}
                  onChange={(e) =>
                    setKeyEnv(e.target.value as "test" | "live")
                  }
                  disabled={!canManage || createMutation.isPending}
                >
                  <option value="test">Test</option>
                  <option value="live">Live</option>
                </select>
              </div>
            </div>
            <Button
              type="submit"
              className="w-fit rounded-xl"
              disabled={!canManage || createMutation.isPending}
            >
              {createMutation.isPending ? "Creating…" : "Create API key"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="border-border/80 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg">Your keys</CardTitle>
          <CardDescription>
            Only prefixes are listed. Revoke a key if it may have leaked.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {listPending ? (
            <p className="text-sm text-muted-foreground">Loading keys…</p>
          ) : keys.length === 0 ? (
            <p className="text-sm text-muted-foreground">No keys yet.</p>
          ) : (
            <ul className="divide-y divide-border/80 rounded-xl border border-border/80">
              {keys.map((k) => (
                <li
                  key={k.id}
                  className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="font-medium text-foreground">{k.name}</p>
                    <p className="font-mono text-xs text-muted-foreground">
                      {k.prefix} · {k.kind} · {k.environment}
                    </p>
                    {k.revoked_at ? (
                      <p className="text-xs text-destructive">Revoked</p>
                    ) : null}
                  </div>
                  {!k.revoked_at && canManage ? (
                    <div className="flex items-center gap-2">
                      {revokeId === k.id ? (
                        <>
                          <span className="text-xs text-muted-foreground">
                            Revoke this key?
                          </span>
                          <Button
                            type="button"
                            size="sm"
                            variant="destructive"
                            className="rounded-lg"
                            disabled={revokeMutation.isPending}
                            onClick={() => revokeMutation.mutate(k.id)}
                          >
                            Confirm
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            className="rounded-lg"
                            onClick={() => setRevokeId(null)}
                          >
                            Cancel
                          </Button>
                        </>
                      ) : (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="rounded-lg"
                          onClick={() => setRevokeId(k.id)}
                        >
                          Revoke
                        </Button>
                      )}
                    </div>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card className="border-border/80 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg">Razorpay: platform vs BYOK</CardTitle>
          <CardDescription>
            Two commercial models; payment routing picks which Razorpay credentials to use.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-muted-foreground">
          <div>
            <p className="font-medium text-foreground">Hosted on our Razorpay (platform)</p>
            <p className="mt-1">
              You use our hosted checkout / payment links / Orders API with{" "}
              <strong className="text-foreground">our</strong> Razorpay account. We settle to
              you minus an agreed <strong className="text-foreground">application fee</strong>{" "}
              (percentage or fixed), implemented the same way Razorpay supports revenue sharing
              / route splits for platforms — your backend records the fee in invoices.
            </p>
          </div>
          <div>
            <p className="font-medium text-foreground">Bring your own key (BYOK)</p>
            <p className="mt-1">
              The organization stores <strong className="text-foreground">their</strong>{" "}
              Razorpay Key ID and secret (encrypted). All API calls to Razorpay use their
              account; we charge <strong className="text-foreground">no</strong> percentage — only
              your product subscription if you bill for the software separately.
            </p>
          </div>
          <p className="text-xs">
            Next implementation step: a{" "}
            <code className="rounded bg-muted px-1 py-0.5">payment_mode</code> flag on the
            organization (or per company), a credentials vault for BYOK, and a single{" "}
            <code className="rounded bg-muted px-1 py-0.5">createCheckoutSession</code>-style
            service that branches on that flag and applies fees only in platform mode.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
