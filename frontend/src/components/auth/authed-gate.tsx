"use client";

import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { useEffect } from "react";

import { authClient } from "@/lib/auth-client";

/** Dashboard and other authed surfaces: redirect guests to login. */
export function AuthedGate({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { data: session, isPending } = authClient.useSession();

  useEffect(() => {
    if (isPending) return;
    if (!session?.user) router.replace("/login");
  }, [isPending, session?.user, router]);

  if (isPending) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-sm text-muted-foreground">
        Loading…
      </div>
    );
  }

  if (!session?.user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-sm text-muted-foreground">
        Sign in required — redirecting…
      </div>
    );
  }

  return <>{children}</>;
}
