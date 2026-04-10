/** Keys for user overrides stored in appearance settings (maps to CSS variables on `<html>`). */
export const CUSTOM_COLOR_KEYS = [
  "background",
  "foreground",
  "mutedForeground",
  "card",
  "cardForeground",
  "border",
  "primary",
  "primaryForeground",
  "accent",
  "sidebar",
  "sidebarForeground",
] as const;

export type CustomColorKey = (typeof CUSTOM_COLOR_KEYS)[number];

export type CustomColors = Partial<Record<CustomColorKey, string>>;

/** CSS custom property name for each key (shadcn / globals tokens). */
export const CUSTOM_COLOR_CSS_VARS: Record<CustomColorKey, string> = {
  background: "--background",
  foreground: "--foreground",
  mutedForeground: "--muted-foreground",
  card: "--card",
  cardForeground: "--card-foreground",
  border: "--border",
  primary: "--primary",
  primaryForeground: "--primary-foreground",
  accent: "--accent",
  sidebar: "--sidebar",
  sidebarForeground: "--sidebar-foreground",
};

export const CUSTOM_COLOR_META: Record<
  CustomColorKey,
  { label: string; description: string }
> = {
  background: {
    label: "App background",
    description: "Main page canvas behind content.",
  },
  foreground: {
    label: "Primary text",
    description: "Headings and main body text.",
  },
  mutedForeground: {
    label: "Secondary text",
    description: "Captions, hints, de-emphasized copy.",
  },
  card: {
    label: "Card / panel background",
    description: "Surfaces for cards and elevated panels.",
  },
  cardForeground: {
    label: "Text on cards",
    description: "Text color on card surfaces.",
  },
  border: {
    label: "Borders & dividers",
    description: "Default border color across the UI.",
  },
  primary: {
    label: "Primary / accent actions",
    description: "Buttons, links, and key highlights (overrides palette tone).",
  },
  primaryForeground: {
    label: "Text on primary",
    description: "Label color on primary buttons and badges.",
  },
  accent: {
    label: "Accent surface",
    description: "Subtle highlights and hover surfaces.",
  },
  sidebar: {
    label: "Sidebar background",
    description: "Navigation rail behind the menu.",
  },
  sidebarForeground: {
    label: "Sidebar text",
    description: "Labels and icons in the sidebar.",
  },
};

/** Starting hex values when enabling an override (aligned with default light theme). */
export const CUSTOM_COLOR_SEED_LIGHT: Record<CustomColorKey, string> = {
  background: "#fcfaf1",
  foreground: "#2f2016",
  mutedForeground: "#695b4b",
  card: "#fffdf8",
  cardForeground: "#2f2016",
  border: "#e2ded0",
  primary: "#007c65",
  primaryForeground: "#fefcf4",
  accent: "#d1f5ea",
  sidebar: "#faf8f1",
  sidebarForeground: "#2f2016",
};

/** Starting hex values when enabling an override (aligned with default dark theme). */
export const CUSTOM_COLOR_SEED_DARK: Record<CustomColorKey, string> = {
  background: "#0d1721",
  foreground: "#f5f2e7",
  mutedForeground: "#aaa590",
  card: "#172029",
  cardForeground: "#f5f2e7",
  border: "#ffffff1f",
  primary: "#21bfa0",
  primaryForeground: "#021611",
  accent: "#1a3a32",
  sidebar: "#101c27",
  sidebarForeground: "#f1efe4",
};

export function seedForKey(
  key: CustomColorKey,
  mode: "light" | "dark",
): string {
  return mode === "dark"
    ? CUSTOM_COLOR_SEED_DARK[key]
    : CUSTOM_COLOR_SEED_LIGHT[key];
}
