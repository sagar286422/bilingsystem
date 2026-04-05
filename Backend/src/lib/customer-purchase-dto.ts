import type { Price, Product } from "@prisma/client";
import type {
  TransactionDetailRow,
  TransactionWithCheckout,
} from "../services/customer.service.js";

function metaPriceId(metadata: unknown): string | null {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return null;
  }
  const v = (metadata as Record<string, unknown>).price_id;
  return typeof v === "string" && v.trim() ? v.trim() : null;
}

function metaRazorpayPaymentId(metadata: unknown): string | null {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return null;
  }
  const v = (metadata as Record<string, unknown>).razorpay_payment_id;
  return typeof v === "string" && v.trim() ? v.trim() : null;
}

function resolveCatalog(
  t: TransactionWithCheckout | TransactionDetailRow,
  metaMap: Map<string, { price: Price; product: Product }>,
): {
  product_id: string | null;
  product_name: string | null;
  price_id: string | null;
} {
  if (t.paymentPage) {
    return {
      product_id: t.paymentPage.price.productId,
      product_name: t.paymentPage.price.product.name,
      price_id: t.paymentPage.priceId,
    };
  }
  const pid = metaPriceId(t.metadata);
  if (!pid) return { product_id: null, product_name: null, price_id: null };
  const hit = metaMap.get(pid);
  if (!hit) return { product_id: null, product_name: null, price_id: pid };
  return {
    product_id: hit.product.id,
    product_name: hit.product.name,
    price_id: hit.price.id,
  };
}

export function purchaseActivityLineDto(
  t: TransactionWithCheckout | TransactionDetailRow,
  metaMap: Map<string, { price: Price; product: Product }>,
) {
  const cat = resolveCatalog(t, metaMap);
  const rz = metaRazorpayPaymentId(t.metadata);
  const base = {
    object: "purchase_activity" as const,
    transaction_id: t.id,
    status: t.status,
    amount: t.amount,
    currency: t.currency,
    gateway: t.gateway,
    gateway_order_id: t.gatewayReferenceId,
    created_at: t.createdAt.toISOString(),
    product_id: cat.product_id,
    product_name: cat.product_name,
    price_id: cat.price_id,
    payment_page: t.paymentPage
      ? {
          slug: t.paymentPage.slug,
          title: t.paymentPage.title,
        }
      : null,
    razorpay_payment_id: rz,
  };

  const sub = "subscription" in t ? t.subscription : null;
  const inv = "invoice" in t ? t.invoice : null;

  return {
    ...base,
    ...(sub
      ? { subscription_id: sub.id, subscription_status: sub.status }
      : {}),
    ...(inv
      ? {
          invoice_id: inv.id,
          invoice_status: inv.status,
        }
      : {}),
  };
}

export type PurchaseActivityLine = ReturnType<typeof purchaseActivityLineDto>;
