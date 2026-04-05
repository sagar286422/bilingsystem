import { hashPassword } from "better-auth/crypto";
import { nanoid } from "nanoid";

import { prisma } from "../db/prisma.js";

const MIN_PASSWORD_LENGTH = 8;

export class CredentialUserError extends Error {
  constructor(
    message: string,
    readonly code:
      | "VALIDATION_ERROR"
      | "USER_EMAIL_EXISTS" = "VALIDATION_ERROR",
  ) {
    super(message);
    this.name = "CredentialUserError";
  }
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/**
 * Creates a Better Auth–compatible user + credential account so the person can
 * sign in with email/password at the same login page as everyone else.
 */
export async function createUserWithEmailPassword(input: {
  name: string;
  email: string;
  password: string;
}): Promise<{ id: string; email: string; name: string }> {
  const email = normalizeEmail(input.email);
  if (!email) {
    throw new CredentialUserError("email is required");
  }
  if (typeof input.password !== "string" || input.password.length < MIN_PASSWORD_LENGTH) {
    throw new CredentialUserError(
      `password must be at least ${MIN_PASSWORD_LENGTH} characters`,
    );
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    throw new CredentialUserError(
      "An account with this email already exists.",
      "USER_EMAIL_EXISTS",
    );
  }

  const displayName =
    typeof input.name === "string" && input.name.trim()
      ? input.name.trim()
      : email.split("@")[0] ?? "User";

  const userId = `user_${nanoid()}`;
  const passwordHash = await hashPassword(input.password);

  await prisma.$transaction(async (tx) => {
    await tx.user.create({
      data: {
        id: userId,
        name: displayName,
        email,
        emailVerified: false,
      },
    });
    await tx.account.create({
      data: {
        id: `acc_${nanoid()}`,
        accountId: userId,
        providerId: "credential",
        userId,
        password: passwordHash,
      },
    });
  });

  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  return { id: user.id, email: user.email, name: user.name };
}
