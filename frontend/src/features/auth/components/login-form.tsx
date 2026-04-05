"use client";

import { useMutation } from "@tanstack/react-query";
import { Form, Formik } from "formik";
import Link from "next/link";
import { useRouter } from "next/navigation";

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
  loginValidationSchema,
  type LoginFormValues,
} from "@/features/auth/validation/login-schema.yup";
import { signInWithEmail } from "@/lib/api/auth";
import { isGoogleAuthEnabled } from "@/lib/env-public";

const initialValues: LoginFormValues = {
  email: "",
  password: "",
};

export function LoginForm() {
  const router = useRouter();
  const signInMutation = useMutation({
    mutationFn: ({ email, password }: LoginFormValues) =>
      signInWithEmail(email, password),
    onSuccess: () => {
      router.refresh();
      router.push("/dashboard");
    },
  });

  return (
    <Card className="w-full max-w-md border-border/60 shadow-lg">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl font-semibold tracking-tight">
          Sign in
        </CardTitle>
        <CardDescription>
          Use your work email to access the dashboard.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        {isGoogleAuthEnabled ? (
          <>
            <GoogleAuthButton label="Sign in with Google" />
            <FieldSeparator className="my-0">
              <span className="bg-card">or email</span>
            </FieldSeparator>
          </>
        ) : null}

        <Formik
          initialValues={initialValues}
          validationSchema={loginValidationSchema}
          validateOnMount={false}
          validateOnBlur
          validateOnChange={false}
          onSubmit={async (values, { setSubmitting, setStatus }) => {
            setStatus(undefined);
            try {
              await signInMutation.mutateAsync(values);
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
              <FormikTextField
                id="email"
                name="email"
                label="Email"
                type="email"
                autoComplete="email"
              />
              <FormikPasswordField
                id="password"
                name="password"
                label="Password"
                autoComplete="current-password"
              />
              <Button
                type="submit"
                className="w-full"
                disabled={isSubmitting || signInMutation.isPending}
              >
                {isSubmitting || signInMutation.isPending
                  ? "Signing in…"
                  : "Continue"}
              </Button>
              <p className="text-center text-sm text-muted-foreground">
                No account?{" "}
                <Link
                  href="/register"
                  className="font-medium text-primary underline-offset-4 hover:underline"
                >
                  Create one
                </Link>
              </p>
            </Form>
          )}
        </Formik>
      </CardContent>
    </Card>
  );
}
