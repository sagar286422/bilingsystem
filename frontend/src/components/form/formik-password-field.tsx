"use client";

import { useField, type FieldHookConfig } from "formik";
import { Eye, EyeOff } from "lucide-react";
import { useState, type ComponentProps } from "react";

import { Button } from "@/components/ui/button";
import {
  Field,
  FieldContent,
  FieldError,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type FormikPasswordFieldProps = {
  label: string;
  id: string;
  className?: string;
  autoComplete?: string;
} & FieldHookConfig<string> &
  Omit<
    ComponentProps<typeof Input>,
    "name" | "value" | "onChange" | "type" | "autoComplete"
  >;

export function FormikPasswordField({
  label,
  id,
  className,
  autoComplete,
  ...fieldConfig
}: FormikPasswordFieldProps) {
  const [visible, setVisible] = useState(false);
  const [field, meta] = useField(fieldConfig);
  const invalid = meta.touched && Boolean(meta.error);

  return (
    <Field data-invalid={invalid}>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <FieldContent>
        <div className="relative">
          <Input
            id={id}
            type={visible ? "text" : "password"}
            className={cn("pr-10", className)}
            aria-invalid={invalid}
            aria-describedby={invalid ? `${id}-error` : undefined}
            autoComplete={autoComplete}
            {...field}
          />
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="absolute right-0.5 top-1/2 -translate-y-1/2 rounded-2xl text-muted-foreground hover:text-foreground"
            aria-label={visible ? "Hide password" : "Show password"}
            onClick={() => setVisible((v) => !v)}
          >
            {visible ? (
              <EyeOff className="size-4" aria-hidden />
            ) : (
              <Eye className="size-4" aria-hidden />
            )}
          </Button>
        </div>
        {invalid ? (
          <FieldError id={`${id}-error`}>{meta.error}</FieldError>
        ) : null}
      </FieldContent>
    </Field>
  );
}
