import { create } from "zustand";
import { persist } from "zustand/middleware";

import type { ThemePaletteId } from "@/lib/theme-palettes";

type ThemePaletteState = {
  palette: ThemePaletteId;
  setPalette: (palette: ThemePaletteId) => void;
};

export const useThemePaletteStore = create<ThemePaletteState>()(
  persist(
    (set) => ({
      palette: "teal",
      setPalette: (palette) => {
        applyPaletteToDocument(palette);
        set({ palette });
      },
    }),
    {
      name: "billing-palette",
      onRehydrateStorage: () => (state) => {
        if (state?.palette) applyPaletteToDocument(state.palette);
      },
    },
  ),
);

export function applyPaletteToDocument(palette: ThemePaletteId) {
  if (typeof document === "undefined") return;
  if (palette === "teal") {
    document.documentElement.removeAttribute("data-palette");
  } else {
    document.documentElement.dataset.palette = palette;
  }
}
