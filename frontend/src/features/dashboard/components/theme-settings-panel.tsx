"use client";

import { Check, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { THEME_PALETTES, type ThemePaletteId } from "@/lib/theme-palettes";
import { useThemePaletteStore } from "@/stores/theme-palette-store";

function previewSwatchStyle(meta: (typeof THEME_PALETTES)[number]) {
  const c = meta.lowChroma ? "0.04" : "0.14";
  return {
    background: `oklch(0.52 ${c} ${meta.hue})`,
  } as const;
}

export function ThemeSettingsPanel() {
  const palette = useThemePaletteStore((s) => s.palette);
  const setPalette = useThemePaletteStore((s) => s.setPalette);
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    queueMicrotask(() => setMounted(true));
  }, []);

  function select(id: ThemePaletteId) {
    setPalette(id);
  }

  const isDark = mounted && resolvedTheme === "dark";

  return (
    <div className="space-y-8">
      <Card className="border-border/80 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg">Appearance mode</CardTitle>
          <CardDescription>
            Light or dark surfaces. Accent colors below apply in both modes.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {!mounted ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : (
            <>
              <Button
                type="button"
                variant={!isDark ? "default" : "outline"}
                size="sm"
                className="gap-2"
                onClick={() => setTheme("light")}
              >
                <Sun className="size-4" aria-hidden />
                Light
              </Button>
              <Button
                type="button"
                variant={isDark ? "default" : "outline"}
                size="sm"
                className="gap-2"
                onClick={() => setTheme("dark")}
              >
                <Moon className="size-4" aria-hidden />
                Dark
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      <div>
        <h2 className="text-lg font-semibold tracking-tight text-foreground">
          Color theme
        </h2>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          Pick an accent palette. Primary buttons, sidebar highlights, focus
          rings, and chart tints follow your choice. Saved on this device only.
        </p>

        <ul className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {THEME_PALETTES.map((meta) => {
            const selected = palette === meta.id;
            return (
              <li key={meta.id}>
                <button
                  type="button"
                  onClick={() => select(meta.id)}
                  className={`group flex w-full flex-col gap-3 rounded-2xl border bg-card p-4 text-left shadow-sm transition-[box-shadow,transform,border-color] hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                    selected
                      ? "border-primary ring-2 ring-primary/25"
                      : "border-border/80 hover:border-primary/35"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <span
                      className="mt-0.5 size-10 shrink-0 rounded-xl shadow-inner ring-1 ring-black/5 dark:ring-white/10"
                      style={previewSwatchStyle(meta)}
                      aria-hidden
                    />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2 font-medium text-foreground group-hover:text-primary">
                        {meta.name}
                        {selected ? (
                          <Check
                            className="size-4 shrink-0 text-primary"
                            aria-label="Selected"
                          />
                        ) : null}
                      </span>
                      <span className="mt-1 block text-pretty text-xs leading-relaxed text-muted-foreground">
                        {meta.description}
                      </span>
                    </span>
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
