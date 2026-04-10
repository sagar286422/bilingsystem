import type { CustomColors } from "@/lib/theme-custom-colors";

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

function rand(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

/** HSL (h 0–360, s/l 0–100) → #rrggbb */
export function hslToHex(h: number, s: number, l: number): string {
  const hh = ((h % 360) + 360) % 360;
  const ss = clamp(s, 0, 100) / 100;
  const ll = clamp(l, 0, 100) / 100;
  const c = (1 - Math.abs(2 * ll - 1)) * ss;
  const x = c * (1 - Math.abs(((hh / 60) % 2) - 1));
  const m = ll - c / 2;
  let r = 0;
  let g = 0;
  let b = 0;
  if (hh < 60) {
    r = c;
    g = x;
  } else if (hh < 120) {
    r = x;
    g = c;
  } else if (hh < 180) {
    g = c;
    b = x;
  } else if (hh < 240) {
    g = x;
    b = c;
  } else if (hh < 300) {
    r = x;
    b = c;
  } else {
    r = c;
    b = x;
  }
  const toHex = (v: number) =>
    Math.round((v + m) * 255)
      .toString(16)
      .padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toLowerCase();
}

/** Random but readable full UI tokens for the current light/dark mode. */
export function generateShuffledAppearance(mode: "light" | "dark"): CustomColors {
  const baseHue = Math.random() * 360;
  const accentHue = (baseHue + 25 + Math.random() * 110) % 360;

  if (mode === "light") {
    const bgS = rand(5, 16);
    const bgL = rand(91, 97.5);
    const fg = hslToHex(baseHue, rand(14, 28), rand(11, 20));
    return {
      background: hslToHex(baseHue, bgS, bgL),
      foreground: fg,
      mutedForeground: hslToHex(baseHue, rand(7, 14), rand(40, 54)),
      card: hslToHex(baseHue, bgS * 0.85, clamp(bgL + rand(0.5, 2.5), 92, 99)),
      cardForeground: fg,
      border: hslToHex(baseHue, rand(8,18), rand(82, 90)),
      primary: hslToHex(accentHue, rand(50, 72), rand(36, 50)),
      primaryForeground: hslToHex(0, 0, rand(97, 100)),
      accent: hslToHex(baseHue, rand(18, 32), rand(86, 93)),
      sidebar: hslToHex(baseHue, bgS * 0.95, rand(92.5, 97)),
      sidebarForeground: hslToHex(baseHue, rand(14, 26), rand(12, 22)),
    };
  }

  const bgS = rand(14, 30);
  const bgL = rand(7, 13.5);
  const fg = hslToHex(baseHue, rand(6, 14), rand(89, 97));
  return {
    background: hslToHex(baseHue, bgS, bgL),
    foreground: fg,
    mutedForeground: hslToHex(baseHue, rand(6, 12), rand(56, 74)),
    card: hslToHex(baseHue, clamp(bgS + 2, 10, 35), clamp(bgL + rand(2.5, 6), 10, 20)),
    cardForeground: fg,
    border: hslToHex(baseHue, rand(12, 22), rand(22, 32)),
    primary: hslToHex(accentHue, rand(55, 75), rand(50, 66)),
    primaryForeground: hslToHex(baseHue, rand(18, 32), rand(5, 12)),
    accent: hslToHex(baseHue, rand(18, 28), clamp(bgL + rand(4, 10), 12, 24)),
    sidebar: hslToHex(baseHue, clamp(bgS + 1, 10, 32), Math.max(5.5, bgL - rand(0.5, 2.5))),
    sidebarForeground: hslToHex(baseHue, rand(8, 14), rand(86, 95)),
  };
}
