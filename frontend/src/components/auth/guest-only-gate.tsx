"use client";

import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { useEffect } from "react";

import { authClient } from "@/lib/auth-client";

/** Send signed-in users away from login/register. */
export function GuestOnlyGate({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { data: session, isPending } = authClient.useSession();

  useEffect(() => {
    if (isPending) return;
    if (session?.user) router.replace("/dashboard");
  }, [isPending, session?.user, router]);

  if (isPending) {
    return (
      <div className="text-center text-sm text-muted-foreground">Loading…</div>
    );
  }

  if (session?.user) {
    return (
      <div className="text-center text-sm text-muted-foreground">
        Already signed in — taking you to the dashboard…
      </div>
    );
  }

  return <>{children}</>;
}
