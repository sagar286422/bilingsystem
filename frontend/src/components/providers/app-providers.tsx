"use client";

import type { ReactNode } from "react";

import { QueryProvider } from "@/components/providers/query-provider";
import { ThemePaletteSync } from "@/components/providers/theme-palette-sync";
import { ThemeProvider } from "@/components/providers/theme-provider";

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <QueryProvider>
      <ThemeProvider
        attribute="class"
        defaultTheme="system"
        enableSystem
        disableTransitionOnChange
      >
        <ThemePaletteSync />
        {children}
      </ThemeProvider>
    </QueryProvider>
  );
}
