import { describe, expect, it } from "vitest";

import { registerSchema } from "./register-schema.zod";

describe("registerSchema", () => {
  const base = {
    name: "Ada Lovelace",
    organizationName: "Analytical Engines Ltd",
    email: "ada@example.com",
    password: "hunter2x",
    confirmPassword: "hunter2x",
  };

  it("accepts valid payload", () => {
    const result = registerSchema.safeParse(base);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.email).toBe(base.email);
    }
  });

  it("rejects missing name", () => {
    const result = registerSchema.safeParse({ ...base, name: "" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe("Name is required");
    }
  });

  it("rejects invalid email", () => {
    const result = registerSchema.safeParse({ ...base, email: "bad" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((i) => i.message === "Enter a valid email")).toBe(
        true,
      );
    }
  });

  it("rejects password without a digit", () => {
    const result = registerSchema.safeParse({
      ...base,
      password: "allletters",
      confirmPassword: "allletters",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(
        result.error.issues.some((i) =>
          i.message.includes("Include at least one number"),
        ),
      ).toBe(true);
    }
  });

  it("rejects mismatched passwords", () => {
    const result = registerSchema.safeParse({
      ...base,
      confirmPassword: "somethingelse9",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(
        result.error.issues.some((i) => i.message === "Passwords must match"),
      ).toBe(true);
    }
  });
});
