export const THEME_PALETTE_IDS = [
  "teal",
  "emerald",
  "orange",
  "purple",
  "rose",
  "blue",
  "amber",
  "cyan",
  "indigo",
  "fuchsia",
  "slate",
] as const;

export type ThemePaletteId = (typeof THEME_PALETTE_IDS)[number];

export type ThemePaletteMeta = {
  id: ThemePaletteId;
  name: string;
  description: string;
  /** Approximate hue (degrees) for preview swatches in the picker. */
  hue: number;
  /** Lower chroma for neutral “slate” style presets. */
  lowChroma?: boolean;
};

export const THEME_PALETTES: readonly ThemePaletteMeta[] = [
  {
    id: "teal",
    name: "Teal & cream",
    description: "Default — soft cream canvas with a calm teal accent.",
    hue: 175,
  },
  {
    id: "emerald",
    name: "Emerald & white",
    description: "Fresh green on a bright neutral base.",
    hue: 158,
  },
  {
    id: "orange",
    name: "Orange & white",
    description: "Warm citrus accent for energetic dashboards.",
    hue: 58,
  },
  {
    id: "purple",
    name: "Purple & white",
    description: "Violet primary with a clean light background.",
    hue: 290,
  },
  {
    id: "rose",
    name: "Rose & white",
    description: "Soft rose highlights with high readability.",
    hue: 12,
  },
  {
    id: "blue",
    name: "Blue & white",
    description: "Classic blue accent for trust and clarity.",
    hue: 250,
  },
  {
    id: "amber",
    name: "Amber & white",
    description: "Golden highlights — comfortable for long sessions.",
    hue: 78,
  },
  {
    id: "cyan",
    name: "Cyan & white",
    description: "Crisp aqua accent on off‑white surfaces.",
    hue: 200,
  },
  {
    id: "indigo",
    name: "Indigo & white",
    description: "Deep indigo for a focused console feel.",
    hue: 275,
  },
  {
    id: "fuchsia",
    name: "Fuchsia & white",
    description: "Bold magenta accent with stronger visual pop.",
    hue: 310,
  },
  {
    id: "slate",
    name: "Slate & white",
    description: "Neutral primary — understated icons and buttons.",
    hue: 260,
    lowChroma: true,
  },
];
