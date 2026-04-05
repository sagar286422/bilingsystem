import "dotenv/config";
import { generateId as betterAuthGenerateId } from "@better-auth/core/utils/id";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nanoid } from "nanoid";
import { prisma } from "./db/prisma.js";

const baseURL =
  process.env.BETTER_AUTH_URL?.replace(/\/$/, "") ?? "http://localhost:3000";

function trustedOrigins(): string[] {
  if (process.env.CLIENT_ORIGIN) {
    return process.env.CLIENT_ORIGIN.split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return [new URL(baseURL).origin];
}

const googleAuth =
  process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
    ? {
        socialProviders: {
          google: {
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
          },
        },
      }
    : {};

export const auth = betterAuth({
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL,
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  emailAndPassword: {
    enabled: true,
  },
  user: {
    deleteUser: {
      enabled: true
    }
  },
  advanced: {
    database: {
      generateId: ({ model, size }) => {
        if (model === "user") {
          return `user_${nanoid()}`;
        }
        return betterAuthGenerateId(size);
      },
    },
  },
  ...googleAuth,
  trustedOrigins: trustedOrigins(),
});
