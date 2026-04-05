import type { Metadata } from "next";

import { DashboardPageHeader } from "@/components/layout/dashboard-page-header";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const metadata: Metadata = {
  title: "Profile",
};

export default function ProfileSettingsPage() {
  return (
    <>
      <DashboardPageHeader
        title="Profile"
        description="Personal account details — separate from organization and company settings."
      />
      <div className="space-y-8 px-4 py-8 sm:px-8">
        <Card className="border-border/80 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Public profile</CardTitle>
            <CardDescription>
              Shown where your name appears in the workspace and audit logs.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-6 sm:flex-row sm:items-start">
            <div
              className="flex size-24 shrink-0 items-center justify-center rounded-2xl border border-dashed border-border/80 bg-muted/40 text-sm text-muted-foreground"
              aria-hidden
            >
              Photo
            </div>
            <div className="grid w-full max-w-md gap-4">
              <div className="space-y-2">
                <Label htmlFor="profile-name">Full name</Label>
                <Input
                  id="profile-name"
                  name="name"
                  placeholder="Your name"
                  disabled
                  className="rounded-xl"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="profile-email">Email</Label>
                <Input
                  id="profile-email"
                  name="email"
                  type="email"
                  placeholder="you@company.com"
                  disabled
                  className="rounded-xl"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Hook these fields to your user API and Better Auth session when
                ready.
              </p>
              <Button type="button" className="w-fit rounded-xl" disabled>
                Save profile
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/80 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Security</CardTitle>
            <CardDescription>
              Password and session management for your login.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            <Button type="button" variant="outline" className="rounded-xl" disabled>
              Change password
            </Button>
            <Button type="button" variant="outline" className="rounded-xl" disabled>
              Sign out other sessions
            </Button>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
