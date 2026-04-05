import Fastify from "fastify";
import fastifyCors from "@fastify/cors";
import { apiKeyRoutes } from "./routes/api-key.routes.js";
import { authRoutes } from "./routes/auth.routes.js";
import { customerRoutes } from "./routes/customer.routes.js";
import { companyRoutes } from "./routes/company.routes.js";
import { currencyRoutes } from "./routes/currency.routes.js";
import { healthRoutes } from "./routes/health.routes.js";
import { invoiceRoutes } from "./routes/invoice.routes.js";
import { organizationBillingRoutes } from "./routes/organization-billing.routes.js";
import { organizationMemberRoutes } from "./routes/organization-member.routes.js";
import { organizationRoutes } from "./routes/organization.routes.js";
import { paymentPageRoutes } from "./routes/payment-page.routes.js";
import { publicPaymentRoutes } from "./routes/public-payment.routes.js";
import { subscriptionRoutes } from "./routes/subscription.routes.js";
import { planRoutes } from "./routes/plan.routes.js";
import { priceRoutes } from "./routes/price.routes.js";
import { productRoutes } from "./routes/product.routes.js";
import { sessionRoutes } from "./routes/session.routes.js";
import { teamRoutes } from "./routes/team.routes.js";
import { transactionRoutes } from "./routes/transaction.routes.js";
import { promoCodeRoutes } from "./routes/promo-code.routes.js";

export async function buildApp() {
  const fastify = Fastify({ logger: true });

  const base =
    process.env.BETTER_AUTH_URL?.replace(/\/$/, "") ?? "http://localhost:3000";
  const corsOrigins = process.env.CLIENT_ORIGIN
    ? process.env.CLIENT_ORIGIN.split(",").map((s) => s.trim()).filter(Boolean)
    : [base];

  await fastify.register(fastifyCors, {
    origin: corsOrigins.length === 1 ? corsOrigins[0] : corsOrigins,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "Cookie",
      "X-Requested-With",
    ],
    credentials: true,
    maxAge: 86_400,
  });

  await fastify.register(healthRoutes);
  await fastify.register(currencyRoutes);
  await fastify.register(publicPaymentRoutes);
  await fastify.register(sessionRoutes);
  await fastify.register(organizationRoutes);
  await fastify.register(organizationBillingRoutes);
  await fastify.register(organizationMemberRoutes);
  await fastify.register(apiKeyRoutes);
  await fastify.register(companyRoutes);
  await fastify.register(customerRoutes);
  await fastify.register(productRoutes);
  await fastify.register(priceRoutes);
  await fastify.register(paymentPageRoutes);
  await fastify.register(planRoutes);
  await fastify.register(teamRoutes);
  await fastify.register(subscriptionRoutes);
  await fastify.register(invoiceRoutes);
  await fastify.register(transactionRoutes);
  await fastify.register(promoCodeRoutes);
  await fastify.register(authRoutes);

  return fastify;
}
