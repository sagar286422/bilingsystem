import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useWorkspaceStore } from "@/stores/workspace-store";
import { inputIn } from "@/test/form-queries";
import { renderWithProviders } from "@/test/render-with-providers";

import { RegisterForm } from "./register-form";

const mockPush = vi.fn();
const mockRefresh = vi.fn();
const mockSignUpWithEmail = vi.fn().mockResolvedValue({});
const mockCreateOrganization = vi.fn().mockResolvedValue({
  id: "org_test",
  name: "Acme",
});

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush, refresh: mockRefresh }),
}));

vi.mock("@/lib/api/auth", () => ({
  signUpWithEmail: (...args: unknown[]) => mockSignUpWithEmail(...args),
}));

vi.mock("@/lib/api/organizations", () => ({
  createOrganization: (name: string) => mockCreateOrganization(name),
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

describe("RegisterForm", () => {
  beforeEach(() => {
    mockPush.mockClear();
    mockRefresh.mockClear();
    // restoreMocks: true (vitest.config) resets vi.fn implementations between tests
    mockSignUpWithEmail.mockResolvedValue({});
    mockCreateOrganization.mockResolvedValue({
      id: "org_test",
      name: "Acme",
    });
    localStorage.removeItem("billing-workspace");
    useWorkspaceStore.persist.rehydrate();
    useWorkspaceStore.setState({ activeOrganizationId: null });
  });

  it("renders and links to login", () => {
    const { container } = renderWithProviders(<RegisterForm />);
    const card = getFormRoot(container);
    expect(
      within(card).getByText("Create account", {
        selector: '[data-slot="card-title"]',
      }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /sign in/i })).toHaveAttribute(
      "href",
      "/login",
    );
  });

  it("registers and creates organization", async () => {
    const user = userEvent.setup();
    const { container } = renderWithProviders(<RegisterForm />);
    const card = getFormRoot(container);

    await user.type(inputIn(card, "name"), "Test User");
    await user.type(inputIn(card, "organizationName"), "Acme");
    await user.type(inputIn(card, "reg-email"), "u@example.com");
    await user.type(inputIn(card, "reg-password"), "password1");
    await user.type(inputIn(card, "confirmPassword"), "password1");

    await user.click(
      within(card).getByRole("button", { name: /^create account$/i }),
    );

    await waitFor(() => {
      expect(mockSignUpWithEmail).toHaveBeenCalledWith(
        "Test User",
        "u@example.com",
        "password1",
      );
    });
    await waitFor(() => {
      expect(mockCreateOrganization).toHaveBeenCalledWith("Acme");
    });
    await waitFor(() => {
      expect(useWorkspaceStore.getState().activeOrganizationId).toBe(
        "org_test",
      );
    });
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith("/dashboard");
    });
  });

  it("shows error when passwords do not match", async () => {
    const user = userEvent.setup();
    const { container } = renderWithProviders(<RegisterForm />);
    const card = getFormRoot(container);

    await user.type(inputIn(card, "name"), "Test User");
    await user.type(inputIn(card, "organizationName"), "Acme");
    await user.type(inputIn(card, "reg-email"), "u@example.com");
    await user.type(inputIn(card, "reg-password"), "password1");
    await user.type(inputIn(card, "confirmPassword"), "password2");

    await user.click(
      within(card).getByRole("button", { name: /^create account$/i }),
    );

    expect(
      await screen.findByText("Passwords must match"),
    ).toBeInTheDocument();
  });
});
