import type { Metadata } from "next";

import { GuestOnlyGate } from "@/components/auth/guest-only-gate";
import { RegisterForm } from "@/features/auth/components/register-form";

export const metadata: Metadata = {
  title: "Register",
};

export default function RegisterPage() {
  return (
    <GuestOnlyGate>
      <RegisterForm />
    </GuestOnlyGate>
  );
}
