import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { inputIn } from "@/test/form-queries";
import { renderWithProviders } from "@/test/render-with-providers";

import { LoginForm } from "./login-form";

const mockPush = vi.fn();
const mockRefresh = vi.fn();
const mockSignInWithEmail = vi.fn().mockResolvedValue({});

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush, refresh: mockRefresh }),
}));

vi.mock("@/lib/api/auth", () => ({
  signInWithEmail: (...args: unknown[]) => mockSignInWithEmail(...args),
}));

vi.mock("@/lib/env-public", () => ({
  isGoogleAuthEnabled: false,
  siteOrigin: "http://localhost:3000",
}));

function getFormRoot(container: HTMLElement): HTMLElement {
  const card = container.querySelector('[data-slot="card"]');
  if (!card || !(card instanceof HTMLElement)) {
    throw new Error('missing [data-slot="card"]');
  }
  return card;
}

describe("LoginForm", () => {
  beforeEach(() => {
    mockPush.mockClear();
    mockRefresh.mockClear();
    // restoreMocks: true (vitest.config) resets vi.fn implementations between tests
    mockSignInWithEmail.mockResolvedValue({});
  });

  it("renders title and link to register", () => {
    const { container } = renderWithProviders(<LoginForm />);
    const card = getFormRoot(container);
    expect(
      within(card).getByText("Sign in", { selector: '[data-slot="card-title"]' }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /create one/i })).toHaveAttribute(
      "href",
      "/register",
    );
  });

  it("shows validation errors when submitting empty fields", async () => {
    const user = userEvent.setup();
    const { container } = renderWithProviders(<LoginForm />);
    const card = getFormRoot(container);
    await user.click(
      within(card).getByRole("button", { name: /^continue$/i }),
    );

    expect(await screen.findByText("Email is required")).toBeInTheDocument();
    expect(screen.getByText("Password is required")).toBeInTheDocument();
  });

  it("signs in and navigates when fields are valid", async () => {
    const user = userEvent.setup();
    const { container } = renderWithProviders(<LoginForm />);
    const card = getFormRoot(container);

    await user.type(inputIn(card, "email"), "hello@example.com");
    await user.type(inputIn(card, "password"), "secret12");

    await user.click(
      within(card).getByRole("button", { name: /^continue$/i }),
    );

    await waitFor(() => {
      expect(mockSignInWithEmail).toHaveBeenCalledWith(
        "hello@example.com",
        "secret12",
      );
    });

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith("/dashboard");
    });
  });
});
