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
import { getOrganization } from "@/lib/api/organizations";
import { patchOrganizationBilling } from "@/lib/api/organization-billing";
import { canManageOrgMembersAndTeams } from "@/lib/workspace-permissions";
import { useWorkspaceStore } from "@/stores/workspace-store";

export function GatewaysPanel() {
  const queryClient = useQueryClient();
  const { data: session, isPending: sessionPending } = authClient.useSession();
  const userId = session?.user?.id;
  const organizationId = useWorkspaceStore((s) => s.activeOrganizationId);

  const [paymentMode, setPaymentMode] = useState<"platform" | "byok_razorpay">(
    "platform",
  );
  const [feePercent, setFeePercent] = useState("1");
  const [byokKeyId, setByokKeyId] = useState("");
  const [byokSecret, setByokSecret] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

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

  useEffect(() => {
    if (!orgDetail) return;
    if (orgDetail.payment_mode === "byok_razorpay")
      setPaymentMode("byok_razorpay");
    else setPaymentMode("platform");
    const bps = orgDetail.platform_fee_bps ?? 100;
    setFeePercent(String(bps / 100));
  }, [orgDetail]);

  const canManage = canManageOrgMembersAndTeams(orgDetail, userId);

  const saveMutation = useMutation({
    mutationFn: () => {
      const pct = Number.parseFloat(feePercent);
      const bps = Number.isFinite(pct)
        ? Math.min(100_000, Math.max(0, Math.round(pct * 100)))
        : 100;
      const body: Parameters<typeof patchOrganizationBilling>[1] = {
        payment_mode: paymentMode,
        platform_fee_bps: bps,
      };
      if (paymentMode === "byok_razorpay" && byokKeyId.trim() && byokSecret.trim()) {
        body.razorpay_key_id = byokKeyId.trim();
        body.razorpay_key_secret = byokSecret.trim();
      }
      return patchOrganizationBilling(organizationId!, body);
    },
    onSuccess: async () => {
      setFormError(null);
      setByokSecret("");
      await queryClient.invalidateQueries({
        queryKey: ["organization", "detail", userId, organizationId],
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
        Select a workspace in the sidebar.
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

  function onSave(e: FormEvent) {
    e.preventDefault();
    setFormError(null);
    if (
      paymentMode === "byok_razorpay" &&
      !orgDetail?.byok_configured &&
      (!byokKeyId.trim() || !byokSecret.trim())
    ) {
      setFormError("BYOK requires Razorpay Key ID and Key Secret.");
      return;
    }
    saveMutation.mutate();
  }

  return (
    <div className="space-y-8 px-4 py-8 sm:px-8">
      <Card className="border-border/80 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg">How payments are routed</CardTitle>
          <CardDescription>
            <strong className="text-foreground">Platform</strong> — customers pay into{" "}
            your host&apos;s Razorpay (server{" "}
            <code className="text-xs">PLATFORM_RAZORPAY_*</code> in{" "}
            <code className="text-xs">.env</code>
            ). Each transaction records a platform fee for your ledger (default 1%).{" "}
            <strong className="text-foreground">BYOK</strong> — money goes to the
            merchant&apos;s Razorpay; keys are encrypted in the database (requires{" "}
            <code className="text-xs">GATEWAY_CREDENTIALS_MASTER_KEY</code>).
          </CardDescription>
        </CardHeader>
      </Card>

      {!canManage ? (
        <div
          className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm"
          role="status"
        >
          Only an organization owner or admin can change gateway settings.
        </div>
      ) : null}

      <Card className="border-border/80 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg">Razorpay routing &amp; fee</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="grid max-w-lg gap-4" onSubmit={onSave}>
            {formError ? (
              <p className="text-sm text-destructive" role="alert">
                {formError}
              </p>
            ) : null}
            <div className="space-y-2">
              <Label htmlFor="pay-mode">Payment mode</Label>
              <select
                id="pay-mode"
                className="flex h-10 w-full rounded-xl border border-border/80 bg-background px-3 text-sm shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/30 disabled:opacity-60"
                value={paymentMode}
                onChange={(e) =>
                  setPaymentMode(e.target.value as "platform" | "byok_razorpay")
                }
                disabled={!canManage || saveMutation.isPending}
              >
                <option value="platform">
                  Platform — payments to host Razorpay account
                </option>
                <option value="byok_razorpay">
                  BYOK — merchant&apos;s Razorpay keys
                </option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="platform-fee">
                Platform fee (% of each payment, ledger)
              </Label>
              <Input
                id="platform-fee"
                inputMode="decimal"
                value={feePercent}
                onChange={(e) => setFeePercent(e.target.value)}
                className="rounded-xl font-mono"
                disabled={!canManage || saveMutation.isPending}
              />
              <p className="text-xs text-muted-foreground">
                Stored as basis points (100 = 1%). Applied to the gross amount on
                each checkout for reporting; settlement with your sellers is outside
                this MVP.
              </p>
            </div>
            {paymentMode === "byok_razorpay" ? (
              <>
                <p className="text-sm text-muted-foreground">
                  Use prices from Products (one-time or recurring). Recurring prices
                  use the same Razorpay <strong className="text-foreground">Order</strong>{" "}
                  for the first period here; full Razorpay Subscriptions renewal is a
                  follow-up.
                </p>
                <div className="space-y-2">
                  <Label htmlFor="rzp-key-id">Razorpay Key ID</Label>
                  <Input
                    id="rzp-key-id"
                    value={byokKeyId}
                    onChange={(e) => setByokKeyId(e.target.value)}
                    className="rounded-xl font-mono text-sm"
                    placeholder="rzp_test_…"
                    autoComplete="off"
                    disabled={!canManage || saveMutation.isPending}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="rzp-secret">Razorpay Key Secret</Label>
                  <Input
                    id="rzp-secret"
                    type="password"
                    value={byokSecret}
                    onChange={(e) => setByokSecret(e.target.value)}
                    className="rounded-xl font-mono text-sm"
                    placeholder={
                      orgDetail.byok_configured
                        ? "Leave blank to keep existing secret"
                        : "Required to activate BYOK"
                    }
                    autoComplete="new-password"
                    disabled={!canManage || saveMutation.isPending}
                  />
                </div>
                {orgDetail.byok_configured ? (
                  <p className="text-xs text-muted-foreground">
                    Key ID suffix on file: …{orgDetail.razorpay_key_id_suffix ?? "—"}
                    . Submit new ID+secret together to rotate.
                  </p>
                ) : null}
              </>
            ) : null}
            <Button
              type="submit"
              className="w-fit rounded-xl"
              disabled={!canManage || saveMutation.isPending}
            >
              {saveMutation.isPending ? "Saving…" : "Save settings"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
