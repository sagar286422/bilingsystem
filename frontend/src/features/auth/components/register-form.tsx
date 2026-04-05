"use client";

import { useMutation } from "@tanstack/react-query";
import { Form, Formik } from "formik";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toFormikValidationSchema } from "zod-formik-adapter";

import { FormikTextField } from "@/components/form/formik-text-field";
import { FormikPasswordField } from "@/components/form/formik-password-field";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { FieldSeparator } from "@/components/ui/field";
import { GoogleAuthButton } from "@/features/auth/components/google-auth-button";
import {
  registerSchema,
  type RegisterFormInput,
} from "@/features/auth/validation/register-schema.zod";
import { signUpWithEmail } from "@/lib/api/auth";
import { createOrganization } from "@/lib/api/organizations";
import { isGoogleAuthEnabled } from "@/lib/env-public";
import { useWorkspaceStore } from "@/stores/workspace-store";

const initialValues: RegisterFormInput = {
  name: "",
  organizationName: "",
  email: "",
  password: "",
  confirmPassword: "",
};

export function RegisterForm() {
  const router = useRouter();
  const setActiveOrganizationId = useWorkspaceStore(
    (s) => s.setActiveOrganizationId,
  );

  const registerMutation = useMutation({
    mutationFn: async (values: RegisterFormInput) => {
      await signUpWithEmail(values.name, values.email, values.password);
      return createOrganization(values.organizationName);
    },
  });

  return (
    <Card className="w-full max-w-md border-border/60 shadow-lg">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl font-semibold tracking-tight">
          Create account
        </CardTitle>
        <CardDescription>
          Start with your profile and organization name.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        {isGoogleAuthEnabled ? (
          <>
            <GoogleAuthButton label="Sign up with Google" />
            <p className="text-center text-xs text-muted-foreground">
              With Google you can create an organization from the dashboard
              after first sign-in.
            </p>
            <FieldSeparator className="my-0">
              <span className="bg-card">or email</span>
            </FieldSeparator>
          </>
        ) : null}

        <Formik
          initialValues={initialValues}
          validationSchema={toFormikValidationSchema(registerSchema)}
          validateOnMount={false}
          validateOnBlur
          validateOnChange={false}
          onSubmit={async (values, { setSubmitting, setStatus }) => {
            setStatus(undefined);
            try {
              const org = await registerMutation.mutateAsync(values);
              setActiveOrganizationId(org.id);
              router.refresh();
              router.push("/dashboard");
            } catch (e) {
              setStatus(
                e instanceof Error ? e.message : "Something went wrong",
              );
            } finally {
              setSubmitting(false);
            }
          }}
        >
          {({ isSubmitting, status }) => (
            <Form className="flex flex-col gap-5">
              {status ? (
                <p
                  role="alert"
                  className="rounded-2xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
                >
                  {status}
                </p>
              ) : null}
              <FormikTextField id="name" name="name" label="Full name" />
              <FormikTextField
                id="organizationName"
                name="organizationName"
                label="Organization"
              />
              <FormikTextField
                id="reg-email"
                name="email"
                label="Email"
                type="email"
                autoComplete="email"
              />
              <FormikPasswordField
                id="reg-password"
                name="password"
                label="Password"
                autoComplete="new-password"
              />
              <FormikPasswordField
                id="confirmPassword"
                name="confirmPassword"
                label="Confirm password"
                autoComplete="new-password"
              />
              <Button
                type="submit"
                className="w-full"
                disabled={isSubmitting || registerMutation.isPending}
              >
                {isSubmitting || registerMutation.isPending
                  ? "Creating…"
                  : "Create account"}
              </Button>
              <p className="text-center text-sm text-muted-foreground">
                Already have an account?{" "}
                <Link
                  href="/login"
                  className="font-medium text-primary underline-offset-4 hover:underline"
                >
                  Sign in
                </Link>
              </p>
            </Form>
          )}
        </Formik>
      </CardContent>
    </Card>
  );
}
