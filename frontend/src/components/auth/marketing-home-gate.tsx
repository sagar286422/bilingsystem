"use client";

import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { useEffect } from "react";

import { authClient } from "@/lib/auth-client";

/**
 * Logged-in users skip the marketing homepage and land on the dashboard.
 */
export function MarketingHomeGate({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { data: session, isPending } = authClient.useSession();

  useEffect(() => {
    if (isPending) return;
    if (session?.user) router.replace("/dashboard");
  }, [isPending, session?.user, router]);

  if (isPending) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center text-sm text-muted-foreground">
        Loading…
      </div>
    );
  }

  if (session?.user) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-sm text-muted-foreground">
        Redirecting to dashboard…
      </div>
    );
  }

  return <>{children}</>;
}
