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
import { getOrganization } from "@/lib/api/organizations";
import {
  companiesQueryKey,
  listCompanies,
} from "@/lib/api/companies";
import { formatMoneyMinor } from "@/lib/money";

import {
  createPaymentPage,
  listPaymentPages,
  patchPaymentPage,
  paymentPagesQueryKey,
  type PaymentPageDto,
} from "@/lib/api/payment-pages";
import {
  listPrices,
  pricesQueryKey,
} from "@/lib/api/prices";
import {
  listProducts,
  productsQueryKey,
} from "@/lib/api/products";
import { siteOrigin } from "@/lib/env-public";
import { canManageOrgMembersAndTeams } from "@/lib/workspace-permissions";
import { useWorkspaceStore } from "@/stores/workspace-store";

type CustomizeForm = {
  accent: string;
  page_bg: string;
  card_bg: string;
  logo_url: string;
  hero_subtitle: string;
  footer_note: string;
  checkout_button_label: string;
  success_title: string;
  success_message: string;
  theme: "light" | "dark";
  card_radius: "sm" | "md" | "lg" | "xl";
  show_fee_disclosure: boolean;
  font_sans: string;
};

const EMPTY_CUSTOM: CustomizeForm = {
  accent: "",
  page_bg: "",
  card_bg: "",
  logo_url: "",
  hero_subtitle: "",
  footer_note: "",
  checkout_button_label: "",
  success_title: "",
  success_message: "",
  theme: "light",
  card_radius: "xl",
  show_fee_disclosure: true,
  font_sans: "",
};

function customizationFromDto(c: Record<string, unknown> | undefined): CustomizeForm {
  if (!c) return { ...EMPTY_CUSTOM };
  const s = (k: keyof CustomizeForm) =>
    typeof c[k] === "string" ? (c[k] as string) : "";
  return {
    accent: s("accent"),
    page_bg: s("page_bg"),
    card_bg: s("card_bg"),
    logo_url: s("logo_url"),
    hero_subtitle: s("hero_subtitle"),
    footer_note: s("footer_note"),
    checkout_button_label: s("checkout_button_label"),
    success_title: s("success_title"),
    success_message: s("success_message"),
    theme: c.theme === "dark" ? "dark" : "light",
    card_radius:
      c.card_radius === "sm" ||
      c.card_radius === "md" ||
      c.card_radius === "lg" ||
      c.card_radius === "xl"
        ? c.card_radius
        : "xl",
    show_fee_disclosure: c.show_fee_disclosure !== false,
    font_sans: s("font_sans"),
  };
}

function packCustomization(f: CustomizeForm): Record<string, unknown> {
  const o: Record<string, unknown> = {
    theme: f.theme,
    card_radius: f.card_radius,
    show_fee_disclosure: f.show_fee_disclosure,
  };
  if (f.accent.trim()) o.accent = f.accent.trim();
  if (f.page_bg.trim()) o.page_bg = f.page_bg.trim();
  if (f.card_bg.trim()) o.card_bg = f.card_bg.trim();
  if (f.logo_url.trim()) o.logo_url = f.logo_url.trim();
  if (f.hero_subtitle.trim()) o.hero_subtitle = f.hero_subtitle.trim();
  if (f.footer_note.trim()) o.footer_note = f.footer_note.trim();
  if (f.checkout_button_label.trim())
    o.checkout_button_label = f.checkout_button_label.trim();
  if (f.success_title.trim()) o.success_title = f.success_title.trim();
  if (f.success_message.trim()) o.success_message = f.success_message.trim();
  if (f.font_sans.trim()) o.font_sans = f.font_sans.trim();
  return o;
}

function CustomizeFields({
  value,
  onChange,
  idPrefix,
}: {
  value: CustomizeForm;
  onChange: (v: CustomizeForm) => void;
  idPrefix: string;
}) {
  const u = (patch: Partial<CustomizeForm>) =>
    onChange({ ...value, ...patch });
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}-accent`}>Accent color</Label>
        <div className="flex gap-2">
          <input
            id={`${idPrefix}-accent`}
            type="color"
            className="h-10 w-14 cursor-pointer rounded-lg border border-border/80 bg-transparent"
            value={value.accent || "#4f46e5"}
            onChange={(e) => u({ accent: e.target.value })}
          />
          <Input
            value={value.accent}
            onChange={(e) => u({ accent: e.target.value })}
            placeholder="#4f46e5"
            className="rounded-xl font-mono text-sm"
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}-theme`}>Theme</Label>
        <select
          id={`${idPrefix}-theme`}
          className="flex h-10 w-full rounded-xl border border-border/80 bg-background px-3 text-sm shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/30"
          value={value.theme}
          onChange={(e) =>
            u({ theme: e.target.value as "light" | "dark" })
          }
        >
          <option value="light">Light</option>
          <option value="dark">Dark</option>
        </select>
      </div>
      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}-pagebg`}>Page background</Label>
        <Input
          id={`${idPrefix}-pagebg`}
          value={value.page_bg}
          onChange={(e) => u({ page_bg: e.target.value })}
          placeholder="#f4f4f5 or linear-gradient(...)"
          className="rounded-xl font-mono text-sm"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}-cardbg`}>Card background</Label>
        <Input
          id={`${idPrefix}-cardbg`}
          value={value.card_bg}
          onChange={(e) => u({ card_bg: e.target.value })}
          placeholder="#ffffff"
          className="rounded-xl font-mono text-sm"
        />
      </div>
      <div className="space-y-2 sm:col-span-2">
        <Label htmlFor={`${idPrefix}-logo`}>Logo URL</Label>
        <Input
          id={`${idPrefix}-logo`}
          value={value.logo_url}
          onChange={(e) => u({ logo_url: e.target.value })}
          placeholder="https://…"
          className="rounded-xl text-sm"
        />
      </div>
      <div className="space-y-2 sm:col-span-2">
        <Label htmlFor={`${idPrefix}-hero`}>Subtitle under title</Label>
        <textarea
          id={`${idPrefix}-hero`}
          value={value.hero_subtitle}
          onChange={(e) => u({ hero_subtitle: e.target.value })}
          placeholder="Short pitch shown under the main title"
          rows={2}
          className="flex w-full rounded-xl border border-border/80 bg-background px-3 py-2 text-sm shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/30"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}-btn`}>Pay button label</Label>
        <Input
          id={`${idPrefix}-btn`}
          value={value.checkout_button_label}
          onChange={(e) => u({ checkout_button_label: e.target.value })}
          placeholder="Pay securely"
          className="rounded-xl text-sm"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}-radius`}>Card corner radius</Label>
        <select
          id={`${idPrefix}-radius`}
          className="flex h-10 w-full rounded-xl border border-border/80 bg-background px-3 text-sm shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/30"
          value={value.card_radius}
          onChange={(e) =>
            u({
              card_radius: e.target.value as CustomizeForm["card_radius"],
            })
          }
        >
          <option value="sm">Small</option>
          <option value="md">Medium</option>
          <option value="lg">Large</option>
          <option value="xl">Extra large</option>
        </select>
      </div>
      <div className="flex items-center gap-2 sm:col-span-2">
        <input
          id={`${idPrefix}-fee`}
          type="checkbox"
          checked={value.show_fee_disclosure}
          onChange={(e) => u({ show_fee_disclosure: e.target.checked })}
          className="h-4 w-4 rounded border-border"
        />
        <Label htmlFor={`${idPrefix}-fee`} className="font-normal">
          Show platform fee note (when fee &gt; 0)
        </Label>
      </div>
      <div className="space-y-2 sm:col-span-2">
        <Label htmlFor={`${idPrefix}-footer`}>Footer note</Label>
        <textarea
          id={`${idPrefix}-footer`}
          value={value.footer_note}
          onChange={(e) => u({ footer_note: e.target.value })}
          placeholder="Support email, terms link text, etc."
          rows={2}
          className="flex w-full rounded-xl border border-border/80 bg-background px-3 py-2 text-sm shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/30"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}-suct`}>Success title</Label>
        <Input
          id={`${idPrefix}-suct`}
          value={value.success_title}
          onChange={(e) => u({ success_title: e.target.value })}
          className="rounded-xl text-sm"
        />
      </div>
      <div className="space-y-2 sm:col-span-2">
        <Label htmlFor={`${idPrefix}-sucm`}>Success message</Label>
        <textarea
          id={`${idPrefix}-sucm`}
          value={value.success_message}
          onChange={(e) => u({ success_message: e.target.value })}
          rows={2}
          className="flex w-full rounded-xl border border-border/80 bg-background px-3 py-2 text-sm shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/30"
        />
      </div>
      <div className="space-y-2 sm:col-span-2">
        <Label htmlFor={`${idPrefix}-font`}>Font stack (optional CSS)</Label>
        <Input
          id={`${idPrefix}-font`}
          value={value.font_sans}
          onChange={(e) => u({ font_sans: e.target.value })}
          placeholder='e.g. "DM Sans", sans-serif'
          className="rounded-xl font-mono text-sm"
        />
      </div>
    </div>
  );
}

export function PaymentPagesPanel() {
  const queryClient = useQueryClient();
  const { data: session, isPending: sessionPending } = authClient.useSession();
  const userId = session?.user?.id;
  const organizationId = useWorkspaceStore((s) => s.activeOrganizationId);

  const [slug, setSlug] = useState("");
  const [title, setTitle] = useState("");
  const [customizeNew, setCustomizeNew] = useState(false);
  const [newCustom, setNewCustom] = useState<CustomizeForm>({ ...EMPTY_CUSTOM });
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(
    null,
  );
  const [selectedProductId, setSelectedProductId] = useState<string | null>(
    null,
  );
  const [selectedPriceId, setSelectedPriceId] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const [editingPage, setEditingPage] = useState<PaymentPageDto | null>(null);
  const [editCustom, setEditCustom] = useState<CustomizeForm>({ ...EMPTY_CUSTOM });
  const [editTitle, setEditTitle] = useState("");
  const [editJson, setEditJson] = useState("");
  const [editError, setEditError] = useState<string | null>(null);

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

  const { data: productsRes } = useQuery({
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

  const { data: pricesRes } = useQuery({
    queryKey: pricesQueryKey(
      organizationId ?? undefined,
      selectedProductId ?? undefined,
    ),
    queryFn: () => listPrices(organizationId!, selectedProductId!),
    enabled: Boolean(userId && organizationId && orgDetail && selectedProductId),
    staleTime: 10_000,
    retry: false,
  });

  const activePrices = useMemo(
    () => pricesRes?.data.filter((p) => p.active) ?? [],
    [pricesRes?.data],
  );

  useEffect(() => {
    if (activePrices.length === 0) {
      setSelectedPriceId(null);
      return;
    }
    setSelectedPriceId((prev) =>
      prev && activePrices.some((p) => p.id === prev)
        ? prev
        : activePrices[0]!.id,
    );
  }, [activePrices]);

  const { data: pagesRes, isPending: pagesPending, refetch: refetchPages } =
    useQuery({
      queryKey: paymentPagesQueryKey(organizationId ?? undefined),
      queryFn: () => listPaymentPages(organizationId!),
      enabled: Boolean(userId && organizationId && orgDetail),
      staleTime: 15_000,
      retry: false,
    });

  const createMutation = useMutation({
    mutationFn: () =>
      createPaymentPage(organizationId!, {
        slug: slug.trim().toLowerCase(),
        company_id: selectedCompanyId!,
        price_id: selectedPriceId!,
        ...(title.trim() ? { title: title.trim() } : {}),
        ...(customizeNew
          ? { customization: packCustomization(newCustom) }
          : {}),
      }),
    onSuccess: async () => {
      setFormError(null);
      setSlug("");
      setTitle("");
      setCustomizeNew(false);
      setNewCustom({ ...EMPTY_CUSTOM });
      await queryClient.invalidateQueries({
        queryKey: paymentPagesQueryKey(organizationId ?? undefined),
      });
    },
    onError: (e: Error) => setFormError(e.message),
  });

  const patchMutation = useMutation({
    mutationFn: async () => {
      if (!organizationId || !editingPage) throw new Error("No page selected");
      let extra: Record<string, unknown> = {};
      if (editJson.trim()) {
        try {
          extra = JSON.parse(editJson) as Record<string, unknown>;
        } catch {
          throw new Error("Advanced JSON is invalid.");
        }
      }
      const merged = { ...packCustomization(editCustom), ...extra };
      return patchPaymentPage(organizationId, editingPage.id, {
        title: editTitle.trim() || null,
        customization: merged,
      });
    },
    onSuccess: async () => {
      setEditError(null);
      setEditingPage(null);
      await queryClient.invalidateQueries({
        queryKey: paymentPagesQueryKey(organizationId ?? undefined),
      });
    },
    onError: (e: Error) => setEditError(e.message),
  });

  function openEditor(p: PaymentPageDto) {
    setEditingPage(p);
    setEditTitle(p.title ?? "");
    setEditCustom(customizationFromDto(p.customization));
    setEditJson("");
    setEditError(null);
  }

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

  function onCreate(e: FormEvent) {
    e.preventDefault();
    setFormError(null);
    if (!slug.trim()) {
      setFormError("Slug is required (e.g. pro-plan-inr).");
      return;
    }
    if (!selectedCompanyId || !selectedPriceId) {
      setFormError("Choose a company and price.");
      return;
    }
    createMutation.mutate();
  }

  const pages = pagesRes?.data ?? [];

  return (
    <div className="space-y-8 px-4 py-8 sm:px-8">
      {!canManage ? (
        <div
          className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm"
          role="status"
        >
          Only an organization owner or admin can create payment pages.
        </div>
      ) : null}

      {editingPage ? (
        <Card className="border-primary/30 shadow-md">
          <CardHeader>
            <CardTitle className="text-lg">Customize checkout</CardTitle>
            <CardDescription>
              {editingPage.slug} — changes apply immediately on the public link.
              Advanced JSON merges on top of the form (same keys as API).
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {editError ? (
              <p className="text-sm text-destructive" role="alert">
                {editError}
              </p>
            ) : null}
            <div className="space-y-2 max-w-lg">
              <Label htmlFor="edit-title">Page title</Label>
              <Input
                id="edit-title"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className="rounded-xl"
              />
            </div>
            <CustomizeFields
              idPrefix="edit"
              value={editCustom}
              onChange={setEditCustom}
            />
            <div className="space-y-2">
              <Label htmlFor="edit-json">Advanced — merge JSON (optional)</Label>
              <textarea
                id="edit-json"
                value={editJson}
                onChange={(e) => setEditJson(e.target.value)}
                placeholder='{"accent":"#ff00ff","page_bg":"#111"}'
                rows={4}
                className="flex w-full rounded-xl border border-border/80 bg-muted/30 px-3 py-2 font-mono text-xs shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/30"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                className="rounded-xl"
                disabled={patchMutation.isPending}
                onClick={() => patchMutation.mutate()}
              >
                {patchMutation.isPending ? "Saving…" : "Save customization"}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="rounded-xl"
                onClick={() => setEditingPage(null)}
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {companies.length === 0 ? (
        <Card className="border-border/80 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Add a company first</CardTitle>
            <CardDescription>
              Payment pages book revenue under a company entity.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <Card className="border-border/80 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">New payment page</CardTitle>
            <CardDescription>
              Public URL:{" "}
              <code className="text-xs">{siteOrigin}/pay/your-slug</code>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form className="grid max-w-2xl gap-4" onSubmit={onCreate}>
              {formError ? (
                <p className="text-sm text-destructive" role="alert">
                  {formError}
                </p>
              ) : null}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="pp-slug">Slug (URL)</Label>
                  <Input
                    id="pp-slug"
                    value={slug}
                    onChange={(e) =>
                      setSlug(e.target.value.toLowerCase().replace(/\s+/g, "-"))
                    }
                    placeholder="starter-500-inr"
                    className="rounded-xl font-mono text-sm"
                    disabled={!canManage || createMutation.isPending}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pp-title">Page title (optional)</Label>
                  <Input
                    id="pp-title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="rounded-xl"
                    disabled={!canManage || createMutation.isPending}
                  />
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="pp-co">Company</Label>
                  <select
                    id="pp-co"
                    className="flex h-10 w-full rounded-xl border border-border/80 bg-background px-3 text-sm shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/30"
                    value={selectedCompanyId ?? ""}
                    onChange={(e) =>
                      setSelectedCompanyId(e.target.value || null)
                    }
                    disabled={!canManage || createMutation.isPending}
                  >
                    {companies.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pp-prod">Product</Label>
                  <select
                    id="pp-prod"
                    className="flex h-10 w-full rounded-xl border border-border/80 bg-background px-3 text-sm shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/30"
                    value={selectedProductId ?? ""}
                    onChange={(e) =>
                      setSelectedProductId(e.target.value || null)
                    }
                    disabled={!canManage || createMutation.isPending}
                  >
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pp-price">Price</Label>
                  <select
                    id="pp-price"
                    className="flex h-10 w-full rounded-xl border border-border/80 bg-background px-3 text-sm font-mono shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/30"
                    value={selectedPriceId ?? ""}
                    onChange={(e) =>
                      setSelectedPriceId(e.target.value || null)
                    }
                    disabled={
                      !canManage ||
                      createMutation.isPending ||
                      activePrices.length === 0
                    }
                  >
                    {activePrices.length === 0 ? (
                      <option value="">No active prices</option>
                    ) : (
                      activePrices.map((pr) => (
                        <option key={pr.id} value={pr.id}>
                          {pr.type}
                          {pr.interval ? ` · ${pr.interval}` : ""} ·{" "}
                          {formatMoneyMinor(pr.unit_amount, pr.currency)}
                        </option>
                      ))
                    )}
                  </select>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input
                  id="pp-custom"
                  type="checkbox"
                  checked={customizeNew}
                  onChange={(e) => setCustomizeNew(e.target.checked)}
                  className="h-4 w-4 rounded border-border"
                />
                <Label htmlFor="pp-custom" className="font-normal">
                  Customize checkout appearance &amp; copy
                </Label>
              </div>
              {customizeNew ? (
                <CustomizeFields
                  idPrefix="new"
                  value={newCustom}
                  onChange={setNewCustom}
                />
              ) : null}
              <Button
                type="submit"
                className="w-fit rounded-xl"
                disabled={
                  !canManage ||
                  createMutation.isPending ||
                  activePrices.length === 0
                }
              >
                {createMutation.isPending ? "Creating…" : "Create payment page"}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      <Card className="border-border/80 shadow-sm">
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
          <div>
            <CardTitle className="text-lg">Your payment pages</CardTitle>
            <CardDescription>Share links with customers.</CardDescription>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="rounded-xl"
            onClick={() => void refetchPages()}
          >
            Refresh
          </Button>
        </CardHeader>
        <CardContent>
          {pagesPending ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : pages.length === 0 ? (
            <p className="text-sm text-muted-foreground">No pages yet.</p>
          ) : (
            <ul className="space-y-3">
              {pages.map((p) => {
                const url = `${siteOrigin}${p.pay_path}`;
                return (
                  <li
                    key={p.id}
                    className="rounded-xl border border-border/80 px-4 py-3 text-sm"
                  >
                    <p className="font-medium text-foreground">
                      {p.title ?? p.product_name}
                    </p>
                    <p className="mt-1 font-mono text-xs text-muted-foreground break-all">
                      {url}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {p.product_name} ·{" "}
                      {formatMoneyMinor(p.amount_minor, p.currency)} ·{" "}
                      {p.price_type}
                      {p.interval ? ` / ${p.interval}` : ""}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-8 rounded-lg text-xs"
                        onClick={() => void navigator.clipboard.writeText(url)}
                      >
                        Copy link
                      </Button>
                      {canManage ? (
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          className="h-8 rounded-lg text-xs"
                          onClick={() => openEditor(p)}
                        >
                          Customize
                        </Button>
                      ) : null}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
