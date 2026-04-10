"use client";

import { useLayoutEffect } from "react";

import {
  applyPaletteToDocument,
  useThemePaletteStore,
} from "@/stores/theme-palette-store";

/** Keeps `<html data-palette>` in sync with persisted accent preset. */
export function ThemePaletteSync() {
  const palette = useThemePaletteStore((s) => s.palette);

  useLayoutEffect(() => {
    applyPaletteToDocument(palette);
  }, [palette]);

  return null;
}
