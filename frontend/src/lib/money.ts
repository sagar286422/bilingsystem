/**
 * Display helper: `amount` is in minor units per ISO 4217 (e.g. cents for USD, whole yen for JPY).
 * Pass `minor_units` from the currency catalog (default 2 for backward compatibility).
 */
export function formatMoneyMinor(
  amount: number,
  currency: string,
  minorUnits: number = 2,
): string {
  const exp = Math.min(10, Math.max(0, Math.floor(minorUnits)));
  const divisor = 10 ** exp;
  const major = amount / divisor;
  const formatted = major.toFixed(exp);
  return `${formatted} ${currency.toUpperCase()}`;
}
