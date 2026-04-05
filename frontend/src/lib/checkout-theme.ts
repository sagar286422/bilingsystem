/** Merges API `customization` with defaults for the public checkout page. */

export type ResolvedCheckoutTheme = {
  accent: string;
  page_bg: string;
  card_bg: string;
  text: string;
  text_muted: string;
  border: string;
  logo_url: string;
  hero_subtitle: string;
  footer_note: string;
  checkout_button_label: string;
  success_title: string;
  success_message: string;
  theme: "light" | "dark";
  card_radius: "sm" | "md" | "lg" | "xl";
  show_fee_disclosure: boolean;
  font_sans: string;
};

const LIGHT: ResolvedCheckoutTheme = {
  accent: "#4f46e5",
  page_bg: "#f4f4f5",
  card_bg: "#ffffff",
  text: "#18181b",
  text_muted: "#71717a",
  border: "#e4e4e7",
  logo_url: "",
  hero_subtitle: "",
  footer_note: "",
  checkout_button_label: "Pay securely",
  success_title: "You're all set",
  success_message: "Thank you — your payment was recorded.",
  theme: "light",
  card_radius: "xl",
  show_fee_disclosure: true,
  font_sans:
    'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
};

const DARK: ResolvedCheckoutTheme = {
  ...LIGHT,
  page_bg: "#09090b",
  card_bg: "#18181b",
  text: "#fafafa",
  text_muted: "#a1a1aa",
  border: "#27272a",
  accent: "#818cf8",
  theme: "dark",
};

const RADIUS: Record<ResolvedCheckoutTheme["card_radius"], string> = {
  sm: "0.375rem",
  md: "0.75rem",
  lg: "1rem",
  xl: "1.25rem",
};

export function resolveCheckoutTheme(
  raw: Record<string, unknown> | undefined | null,
  platformFeeBps: number,
): ResolvedCheckoutTheme {
  const base = raw?.theme === "dark" ? DARK : LIGHT;
  const merged = { ...base } as ResolvedCheckoutTheme;
  if (!raw) return merged;

  const str = (k: keyof ResolvedCheckoutTheme): string | undefined =>
    typeof raw[k] === "string" ? (raw[k] as string).trim() || undefined : undefined;
  const bool = (k: "show_fee_disclosure"): boolean | undefined =>
    typeof raw[k] === "boolean" ? raw[k] : undefined;

  if (str("accent")) merged.accent = str("accent")!;
  if (str("page_bg")) merged.page_bg = str("page_bg")!;
  if (str("card_bg")) merged.card_bg = str("card_bg")!;
  if (str("text")) merged.text = str("text")!;
  if (str("text_muted")) merged.text_muted = str("text_muted")!;
  if (str("border")) merged.border = str("border")!;
  if (str("logo_url")) merged.logo_url = str("logo_url")!;
  if (str("hero_subtitle")) merged.hero_subtitle = str("hero_subtitle")!;
  if (str("footer_note")) merged.footer_note = str("footer_note")!;
  if (str("checkout_button_label"))
    merged.checkout_button_label = str("checkout_button_label")!;
  if (str("success_title")) merged.success_title = str("success_title")!;
  if (str("success_message")) merged.success_message = str("success_message")!;
  if (str("font_sans")) merged.font_sans = str("font_sans")!;
  if (raw.theme === "light" || raw.theme === "dark") merged.theme = raw.theme;
  if (
    raw.card_radius === "sm" ||
    raw.card_radius === "md" ||
    raw.card_radius === "lg" ||
    raw.card_radius === "xl"
  ) {
    merged.card_radius = raw.card_radius;
  }
  if (bool("show_fee_disclosure") !== undefined) {
    merged.show_fee_disclosure = bool("show_fee_disclosure")!;
  }

  merged.show_fee_disclosure =
    merged.show_fee_disclosure && platformFeeBps > 0;

  return merged;
}

export function cardRadiusCss(r: ResolvedCheckoutTheme["card_radius"]): string {
  return RADIUS[r] ?? RADIUS.xl;
}
