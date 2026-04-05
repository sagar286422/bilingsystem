import { describe, expect, it } from "vitest";

import { loginValidationSchema } from "./login-schema.yup";

describe("loginValidationSchema", () => {
  it("accepts valid credentials", async () => {
    const values = { email: "user@example.com", password: "password1" };
    await expect(loginValidationSchema.validate(values)).resolves.toEqual(
      values,
    );
  });

  it("rejects invalid email", async () => {
    await expect(
      loginValidationSchema.validate({
        email: "not-an-email",
        password: "password1",
      }),
    ).rejects.toMatchObject({ message: "Enter a valid email" });
  });

  it("rejects empty email", async () => {
    await expect(
      loginValidationSchema.validate({ email: "", password: "password1" }),
    ).rejects.toMatchObject({ message: "Email is required" });
  });

  it("rejects short password", async () => {
    await expect(
      loginValidationSchema.validate({
        email: "a@b.co",
        password: "short",
      }),
    ).rejects.toMatchObject({ message: "At least 8 characters" });
  });

  it("rejects missing password", async () => {
    await expect(
      loginValidationSchema.validate({ email: "a@b.co", password: "" }),
    ).rejects.toMatchObject({ message: "Password is required" });
  });
});
