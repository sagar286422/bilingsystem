"use client";

import { Check, Moon, RotateCcw, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  CUSTOM_COLOR_KEYS,
  CUSTOM_COLOR_META,
  type CustomColorKey,
  seedForKey,
} from "@/lib/theme-custom-colors";
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
  const customColors = useThemePaletteStore((s) => s.customColors);
  const setCustomColor = useThemePaletteStore((s) => s.setCustomColor);
  const resetCustomColors = useThemePaletteStore((s) => s.resetCustomColors);
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    queueMicrotask(() => setMounted(true));
  }, []);

  const mode = mounted && resolvedTheme === "dark" ? "dark" : "light";

  const customCount = useMemo(
    () => Object.keys(customColors).length,
    [customColors],
  );

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

      <Card className="border-border/80 shadow-sm">
        <CardHeader className="flex flex-col gap-4 space-y-0 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle className="text-lg">Custom colors</CardTitle>
            <CardDescription className="mt-1.5 max-w-2xl">
              Override backgrounds, text, borders, and primary tones. These
              sit on top of your palette and light/dark mode. Use{" "}
              <span className="font-medium text-foreground">Clear</span> on a
              row to fall back to the theme default for that token.
            </CardDescription>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="shrink-0 gap-2"
            disabled={customCount === 0}
            onClick={() => resetCustomColors()}
          >
            <RotateCcw className="size-4" aria-hidden />
            Reset all overrides
          </Button>
        </CardHeader>
        <CardContent className="max-h-[min(70vh,560px)] space-y-6 overflow-y-auto pr-1">
          {CUSTOM_COLOR_KEYS.map((key: CustomColorKey) => {
            const meta = CUSTOM_COLOR_META[key];
            const value = customColors[key];
            const seed = seedForKey(key, mode);

            return (
              <div
                key={key}
                className="grid gap-4 border-b border-border/50 pb-5 last:border-b-0 last:pb-0 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"
              >
                <div className="space-y-1">
                  <Label htmlFor={`custom-color-${key}`} className="text-base">
                    {meta.label}
                  </Label>
                  <p className="text-xs leading-relaxed text-muted-foreground">
                    {meta.description}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                  {value ? (
                    <>
                      <input
                        id={`custom-color-${key}`}
                        type="color"
                        value={value}
                        onChange={(e) =>
                          setCustomColor(key, e.target.value.toLowerCase())
                        }
                        className="h-10 w-14 shrink-0 cursor-pointer rounded-lg border border-input bg-background p-0.5 shadow-sm"
                        aria-label={`${meta.label} color`}
                      />
                      <span className="font-mono text-xs text-muted-foreground tabular-nums">
                        {value}
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="text-muted-foreground"
                        onClick={() => setCustomColor(key, null)}
                      >
                        Clear
                      </Button>
                    </>
                  ) : (
                    <>
                      <span className="text-xs text-muted-foreground">
                        Theme default
                      </span>
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => setCustomColor(key, seed)}
                      >
                        Customize
                      </Button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
