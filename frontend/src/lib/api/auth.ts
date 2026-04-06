import { authClient } from "@/lib/auth-client";
import { useWorkspaceStore } from "@/stores/workspace-store";

import { getSiteOrigin } from "../env-public";

function dashboardUrl(): string {
  return `${getSiteOrigin()}/dashboard`;
}

export async function signInWithEmail(email: string, password: string) {
  const result = await authClient.signIn.email({
    email,
    password,
    callbackURL: dashboardUrl(),
  });
  if (result.error) {
    throw new Error(result.error.message ?? "Sign in failed");
  }
  return result.data;
}

export async function signUpWithEmail(
  name: string,
  email: string,
  password: string,
) {
  const result = await authClient.signUp.email({
    name,
    email,
    password,
    callbackURL: dashboardUrl(),
  });
  if (result.error) {
    throw new Error(result.error.message ?? "Sign up failed");
  }
  return result.data;
}

export async function signOut() {
  await authClient.signOut();
  useWorkspaceStore.getState().setActiveOrganizationId(null);
}

export async function signInWithGoogle() {
  const result = await authClient.signIn.social({
    provider: "google",
    callbackURL: dashboardUrl(),
    disableRedirect: true,
  });
  if (result.error) {
    throw new Error(result.error.message ?? "Google sign-in failed");
  }
  const url = result.data?.url;
  if (url) {
    window.location.href = url;
  }
}
