import type { Metadata } from "next";

import { GuestOnlyGate } from "@/components/auth/guest-only-gate";
import { LoginForm } from "@/features/auth/components/login-form";

export const metadata: Metadata = {
  title: "Sign in",
};

export default function LoginPage() {
  return (
    <GuestOnlyGate>
      <LoginForm />
    </GuestOnlyGate>
  );
}
