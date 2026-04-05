"use client";

import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  createPublicPaymentOrder,
  getPublicPaymentPage,
  verifyPublicPayment,
  type PublicPaymentPageResponse,
} from "@/lib/api/public-payment";
import { cardRadiusCss, resolveCheckoutTheme } from "@/lib/checkout-theme";
import { formatMoneyMinor } from "@/lib/money";

declare global {
  interface Window {
    Razorpay?: new (opts: Record<string, unknown>) => { open: () => void };
  }
}

function loadRazorpayScript(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.Razorpay) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("Could not load Razorpay Checkout"));
    document.body.appendChild(s);
  });
}

export default function PublicPayPage() {
  const params = useParams();
  const slug = typeof params.slug === "string" ? params.slug : "";

  const [page, setPage] = useState<PublicPaymentPageResponse | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<string | null>(null);
  const [payError, setPayError] = useState<string | null>(null);

  const embedMessagingRef = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined" || !slug) return;
    const q = new URLSearchParams(window.location.search);
    embedMessagingRef.current = q.get("embed") === "1";
    const e = q.get("email");
    if (e) setEmail((prev) => prev || decodeURIComponent(e));
    const n = q.get("name");
    if (n) setName((prev) => prev || decodeURIComponent(n));
  }, [slug]);

  const theme = useMemo(
    () =>
      resolveCheckoutTheme(
        page?.customization ?? {},
        page?.platform_fee_bps ?? 0,
      ),
    [page],
  );

  const rootStyle = useMemo(
    () =>
      ({
        "--pay-accent": theme.accent,
        "--pay-page-bg": theme.page_bg,
        "--pay-card-bg": theme.card_bg,
        "--pay-text": theme.text,
        "--pay-muted": theme.text_muted,
        "--pay-border": theme.border,
        "--pay-radius": cardRadiusCss(theme.card_radius),
        fontFamily: theme.font_sans,
      }) as React.CSSProperties,
    [theme],
  );

  useEffect(() => {
    if (!slug) return;
    let cancelled = false;
    void (async () => {
      try {
        const p = await getPublicPaymentPage(slug);
        if (!cancelled) setPage(p);
      } catch (e) {
        if (!cancelled)
          setLoadError(e instanceof Error ? e.message : "Not found");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  const startPay = useCallback(async () => {
    if (!page || !slug) return;
    setPayError(null);
    setBusy(true);
    try {
      await loadRazorpayScript();
      const order = await createPublicPaymentOrder(slug, {
        email: email.trim().toLowerCase(),
        ...(name.trim() ? { name: name.trim() } : {}),
      });

      const Rp = window.Razorpay;
      if (!Rp) throw new Error("Razorpay Checkout not available");

      const options: Record<string, unknown> = {
        key: order.key_id,
        amount: order.amount,
        currency: order.currency,
        order_id: order.order_id,
        name: page.organization_name,
        description: order.title,
        prefill: {
          email: email.trim().toLowerCase(),
          ...(name.trim() ? { name: name.trim() } : {}),
        },
        handler: function (response: {
          razorpay_payment_id: string;
          razorpay_order_id: string;
          razorpay_signature: string;
        }) {
          void (async () => {
            try {
              const v = await verifyPublicPayment(slug, {
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
              });
              setDone(v.transaction_id);
              if (embedMessagingRef.current) {
                const payload = {
                  type: "billing_checkout_complete",
                  transaction_id: v.transaction_id,
                  slug,
                };
                try {
                  window.opener?.postMessage(payload, "*");
                  if (window.parent !== window) {
                    window.parent.postMessage(payload, "*");
                  }
                } catch {
                  /* cross-origin restrictions */
                }
              }
            } catch (err) {
              setPayError(
                err instanceof Error ? err.message : "Verification failed",
              );
            } finally {
              setBusy(false);
            }
          })();
        },
        modal: {
          ondismiss: () => {
            setBusy(false);
          },
        },
      };

      const rz = new Rp(options);
      rz.open();
    } catch (e) {
      setPayError(e instanceof Error ? e.message : "Payment failed to start");
      setBusy(false);
    }
  }, [page, slug, email, name]);

  if (loadError) {
    return (
      <div
        className="flex min-h-screen items-center justify-center px-4"
        style={rootStyle}
      >
        <div
          className="max-w-md rounded-[var(--pay-radius)] border px-8 py-10 text-center shadow-lg"
          style={{
            backgroundColor: "var(--pay-card-bg)",
            borderColor: "var(--pay-border)",
            color: "var(--pay-text)",
          }}
        >
          <p className="text-sm" style={{ color: "#dc2626" }}>
            {loadError}
          </p>
        </div>
      </div>
    );
  }

  if (!page) {
    return (
      <div
        className="flex min-h-screen items-center justify-center px-4"
        style={{ ...rootStyle, backgroundColor: "#f4f4f5" }}
      >
        <p className="text-sm text-zinc-500">Loading checkout…</p>
      </div>
    );
  }

  const intervalLabel =
    page.price_type === "recurring" && page.interval
      ? `${page.interval}${
          page.interval_count && page.interval_count > 1
            ? ` ×${page.interval_count}`
            : ""
        } billing`
      : "One-time payment";

  return (
    <div
      className="relative min-h-screen overflow-hidden"
      style={{ ...rootStyle, backgroundColor: "var(--pay-page-bg)" }}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -left-32 -top-32 h-96 w-96 rounded-full opacity-[0.12] blur-3xl"
        style={{ backgroundColor: "var(--pay-accent)" }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-24 -right-24 h-80 w-80 rounded-full opacity-[0.08] blur-3xl"
        style={{ backgroundColor: "var(--pay-accent)" }}
      />

      <div className="relative z-[1] mx-auto flex min-h-screen max-w-lg flex-col justify-center px-4 py-12 sm:px-6">
        <div
          className="border px-6 pb-8 pt-8 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.15)] sm:px-10"
          style={{
            borderRadius: "var(--pay-radius)",
            backgroundColor: "var(--pay-card-bg)",
            borderColor: "var(--pay-border)",
            color: "var(--pay-text)",
            boxShadow:
              theme.theme === "dark"
                ? "0 25px 50px -12px rgba(0,0,0,0.5)"
                : undefined,
          }}
        >
          {theme.logo_url ? (
            <div className="mb-8 flex justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={theme.logo_url}
                alt=""
                className="max-h-14 w-auto object-contain"
              />
            </div>
          ) : null}

          <p
            className="text-center text-xs font-medium uppercase tracking-[0.2em]"
            style={{ color: "var(--pay-muted)" }}
          >
            {page.organization_name}
          </p>
          <h1
            className="mt-3 text-center text-2xl font-semibold leading-tight tracking-tight sm:text-3xl"
            style={{ color: "var(--pay-text)" }}
          >
            {page.title}
          </h1>
          {theme.hero_subtitle ? (
            <p
              className="mt-3 text-center text-sm leading-relaxed"
              style={{ color: "var(--pay-muted)" }}
            >
              {theme.hero_subtitle}
            </p>
          ) : page.product_description ? (
            <p
              className="mt-3 text-center text-sm leading-relaxed"
              style={{ color: "var(--pay-muted)" }}
            >
              {page.product_description}
            </p>
          ) : null}

          <div
            className="mt-8 rounded-xl px-4 py-5 text-center"
            style={{
              backgroundColor:
                theme.theme === "dark" ? "rgba(255,255,255,0.04)" : "#fafafa",
            }}
          >
            <p
              className="text-xs font-medium uppercase tracking-wider"
              style={{ color: "var(--pay-muted)" }}
            >
              {intervalLabel}
            </p>
            <p
              className="mt-2 text-3xl font-semibold tabular-nums tracking-tight sm:text-4xl"
              style={{ color: "var(--pay-text)" }}
            >
              {formatMoneyMinor(page.amount_minor, page.currency)}
            </p>
            {theme.show_fee_disclosure ? (
              <p className="mt-3 text-xs leading-normal" style={{ color: "var(--pay-muted)" }}>
                Includes a {page.platform_fee_bps / 100}% recorded platform fee
                for this workspace. Payment processor fees are separate.
              </p>
            ) : null}
          </div>

          {done ? (
            <div
              className="mt-8 rounded-xl border px-4 py-5 text-center"
              style={{
                borderColor: "var(--pay-border)",
                backgroundColor:
                  theme.theme === "dark"
                    ? "rgba(129,140,248,0.12)"
                    : "rgba(79,70,229,0.06)",
              }}
              role="status"
            >
              <p className="font-semibold" style={{ color: "var(--pay-text)" }}>
                {theme.success_title}
              </p>
              <p
                className="mt-2 text-sm leading-relaxed"
                style={{ color: "var(--pay-muted)" }}
              >
                {theme.success_message}
              </p>
              <p
                className="mt-3 font-mono text-[11px]"
                style={{ color: "var(--pay-muted)" }}
              >
                Ref: {done}
              </p>
            </div>
          ) : (
            <div className="mt-8 space-y-4">
              {payError ? (
                <p className="text-center text-sm" style={{ color: "#dc2626" }} role="alert">
                  {payError}
                </p>
              ) : null}
              <div className="space-y-1.5">
                <label
                  className="text-xs font-medium"
                  style={{ color: "var(--pay-muted)" }}
                  htmlFor="pay-email"
                >
                  Email
                </label>
                <input
                  id="pay-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full border px-4 py-3 text-sm outline-none ring-offset-2 transition focus:ring-2"
                  style={{
                    borderRadius: "calc(var(--pay-radius) - 4px)",
                    backgroundColor: "var(--pay-card-bg)",
                    borderColor: "var(--pay-border)",
                    color: "var(--pay-text)",
                    // focus ring color via class
                  }}
                  disabled={busy}
                />
              </div>
              <div className="space-y-1.5">
                <label
                  className="text-xs font-medium"
                  style={{ color: "var(--pay-muted)" }}
                  htmlFor="pay-name"
                >
                  Name <span style={{ opacity: 0.7 }}>(optional)</span>
                </label>
                <input
                  id="pay-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full border px-4 py-3 text-sm outline-none transition focus:ring-2 focus:ring-[var(--pay-accent)]"
                  style={{
                    borderRadius: "calc(var(--pay-radius) - 4px)",
                    backgroundColor: "var(--pay-card-bg)",
                    borderColor: "var(--pay-border)",
                    color: "var(--pay-text)",
                  }}
                  disabled={busy}
                />
              </div>
              <button
                type="button"
                disabled={busy || !email.trim()}
                onClick={() => void startPay()}
                className="w-full py-3.5 text-sm font-semibold text-white shadow-lg transition hover:opacity-95 disabled:opacity-50"
                style={{
                  borderRadius: "var(--pay-radius)",
                  backgroundColor: "var(--pay-accent)",
                  boxShadow: `0 10px 25px -5px color-mix(in srgb, var(--pay-accent) 45%, transparent)`,
                }}
              >
                {busy ? "Opening secure checkout…" : theme.checkout_button_label}
              </button>
              <p
                className="pt-2 text-center text-[11px] leading-normal"
                style={{ color: "var(--pay-muted)" }}
              >
                Secured by Razorpay. You may be asked for OTP or bank details on the
                next step.
              </p>
            </div>
          )}

          {theme.footer_note ? (
            <p
              className="mt-8 border-t pt-6 text-center text-xs leading-relaxed"
              style={{ borderColor: "var(--pay-border)", color: "var(--pay-muted)" }}
            >
              {theme.footer_note}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
