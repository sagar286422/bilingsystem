import { create } from "zustand";
import { persist } from "zustand/middleware";

import {
  CUSTOM_COLOR_CSS_VARS,
  CUSTOM_COLOR_KEYS,
  type CustomColorKey,
  type CustomColors,
} from "@/lib/theme-custom-colors";
import type { ThemePaletteId } from "@/lib/theme-palettes";

type ThemeAppearanceState = {
  palette: ThemePaletteId;
  customColors: CustomColors;
  setPalette: (palette: ThemePaletteId) => void;
  setCustomColor: (key: CustomColorKey, value: string | null) => void;
  resetCustomColors: () => void;
};

export const useThemePaletteStore = create<ThemeAppearanceState>()(
  persist(
    (set) => ({
      palette: "teal",
      customColors: {},
      setPalette: (palette) => set({ palette }),
      setCustomColor: (key, value) =>
        set((state) => {
          const next = { ...state.customColors };
          if (value == null || value === "") {
            delete next[key];
          } else {
            next[key] = value;
          }
          return { customColors: next };
        }),
      resetCustomColors: () => set({ customColors: {} }),
    }),
    {
      name: "billing-palette",
      onRehydrateStorage: () => (state) => {
        if (state) {
          applyAppearanceToDocument({
            palette: state.palette ?? "teal",
            customColors: state.customColors ?? {},
          });
        }
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

export function applyCustomColorsToDocument(colors: CustomColors) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  for (const key of CUSTOM_COLOR_KEYS) {
    const prop = CUSTOM_COLOR_CSS_VARS[key];
    const val = colors[key];
    if (val) {
      root.style.setProperty(prop, val);
    } else {
      root.style.removeProperty(prop);
    }
  }
}

export function applyAppearanceToDocument(state: {
  palette: ThemePaletteId;
  customColors: CustomColors;
}) {
  applyPaletteToDocument(state.palette);
  applyCustomColorsToDocument(state.customColors);
}
