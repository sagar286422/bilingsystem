"use client";

import { useLayoutEffect } from "react";

import {
  applyAppearanceToDocument,
  useThemePaletteStore,
} from "@/stores/theme-palette-store";

/** Keeps `<html data-palette>` and optional custom color CSS variables in sync. */
export function ThemePaletteSync() {
  const palette = useThemePaletteStore((s) => s.palette);
  const customColors = useThemePaletteStore((s) => s.customColors);

  useLayoutEffect(() => {
    applyAppearanceToDocument({ palette, customColors });
  }, [palette, customColors]);

  return null;
}
