"use client";

import type { ComponentProps } from "react";
import { useField, type FieldHookConfig } from "formik";

import {
  Field,
  FieldContent,
  FieldError,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type FormikTextFieldProps = {
  label: string;
  id: string;
  className?: string;
} & FieldHookConfig<string> &
  Omit<ComponentProps<typeof Input>, "name" | "value" | "onChange">;

export function FormikTextField({
  label,
  id,
  className,
  type = "text",
  ...fieldConfig
}: FormikTextFieldProps) {
  const [field, meta] = useField({ ...fieldConfig, type });
  const invalid = meta.touched && Boolean(meta.error);

  return (
    <Field data-invalid={invalid}>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <FieldContent>
        <Input
          id={id}
          type={type}
          className={cn(className)}
          aria-invalid={invalid}
          aria-describedby={invalid ? `${id}-error` : undefined}
          {...field}
        />
        {invalid ? (
          <FieldError id={`${id}-error`}>{meta.error}</FieldError>
        ) : null}
      </FieldContent>
    </Field>
  );
}
