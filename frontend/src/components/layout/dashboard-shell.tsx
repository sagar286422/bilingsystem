"use client";

import Link from "next/link";
import { Menu, Settings, X } from "lucide-react";
import type { ReactNode } from "react";
import { Fragment, useState } from "react";

import { AuthedGate } from "@/components/auth/authed-gate";
import { Button } from "@/components/ui/button";

import { WorkspaceOrgSync } from "@/features/workspace/components/workspace-org-sync";

import { DashboardSidebar } from "./dashboard-sidebar";
import { DashboardTopBar } from "./dashboard-top-bar";

export function DashboardShell({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);

  return (
    <AuthedGate>
      <Fragment>
        <WorkspaceOrgSync />
        <div className="flex min-h-screen flex-col bg-background md:flex-row">
      {/* Mobile top bar */}
      <div className="sticky top-0 z-50 flex h-14 items-center justify-between border-b border-border/80 bg-sidebar px-4 md:hidden">
        <span className="font-semibold tracking-tight">Billing</span>
        <div className="flex items-center gap-1.5">
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="size-9 rounded-xl"
          asChild
        >
          <Link href="/dashboard/settings" title="Settings">
            <Settings className="size-4" aria-hidden />
            <span className="sr-only">Settings</span>
          </Link>
        </Button>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="size-9"
          aria-expanded={open}
          aria-controls="dashboard-sidebar-drawer"
          onClick={() => setOpen((v) => !v)}
        >
          {open ? (
            <X className="size-4" aria-hidden />
          ) : (
            <Menu className="size-4" aria-hidden />
          )}
          <span className="sr-only">
            {open ? "Close navigation" : "Open navigation"}
          </span>
        </Button>
        </div>
      </div>

      {/* Mobile overlay sidebar */}
      {open ? (
        <div
          className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm md:hidden"
          aria-hidden
          onClick={() => setOpen(false)}
        />
      ) : null}
      <div
        id="dashboard-sidebar-drawer"
        className={`fixed inset-y-0 left-0 z-50 w-[min(100vw,18rem)] transform border-r border-border/80 bg-sidebar shadow-lg transition-transform duration-200 ease-out md:relative md:z-0 md:flex md:w-64 md:translate-x-0 md:border-r md:shadow-none ${
          open ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        }`}
      >
        <DashboardSidebar onNavigate={() => setOpen(false)} />
      </div>

      <div className="flex min-w-0 flex-1 flex-col bg-background">
        <DashboardTopBar />
        <main className="flex-1">{children}</main>
      </div>
        </div>
      </Fragment>
    </AuthedGate>
  );
}
