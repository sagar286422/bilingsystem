import "dotenv/config";
import { PrismaClient } from "@prisma/client";

if (!process.env.DB_URL) {
  throw new Error("DB_URL is required");
}

export const prisma = new PrismaClient();
