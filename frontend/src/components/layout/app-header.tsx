"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { ThemeToggle } from "@/components/layout/theme-toggle";
import { Button } from "@/components/ui/button";
import { signOut } from "@/lib/api/auth";
import { authClient } from "@/lib/auth-client";

const marketingNav = [
  { href: "/", label: "Home" },
  { href: "/dashboard", label: "Dashboard" },
] as const;

const authedMarketingNav = [{ href: "/dashboard", label: "Dashboard" }] as const;

export function AppHeader() {
  const router = useRouter();
  const { data: session, isPending } = authClient.useSession();
  const user = session?.user;
  const navItems = user ? authedMarketingNav : marketingNav;

  async function handleSignOut() {
    await signOut();
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-40 border-b border-border/80 bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link
          href={user ? "/dashboard" : "/"}
          className="font-semibold tracking-tight text-foreground"
        >
          Billing
        </Link>
        <nav className="hidden items-center gap-1 sm:flex">
          {navItems.map((item) => (
            <Button key={item.href} variant="ghost" size="sm" asChild>
              <Link href={item.href}>{item.label}</Link>
            </Button>
          ))}
        </nav>
        <div className="flex min-w-0 items-center gap-2">
          <ThemeToggle />
          {isPending ? (
            <span
              className="h-9 w-28 shrink-0 animate-pulse rounded-md bg-muted"
              aria-hidden
            />
          ) : user ? (
            <>
              <span
                className="hidden max-w-40 truncate text-sm text-muted-foreground sm:inline"
                title={user.email ?? user.name ?? undefined}
              >
                {user.name ?? user.email ?? "Account"}
              </span>
              <Button
                variant="outline"
                size="sm"
                type="button"
                onClick={() => void handleSignOut()}
              >
                Sign out
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" size="sm" asChild>
                <Link href="/login">Sign in</Link>
              </Button>
              <Button size="sm" className="hidden sm:inline-flex" asChild>
                <Link href="/register">Get started</Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
