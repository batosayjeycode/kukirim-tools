/**
 * Display formatting with Indonesian locale conventions. Pure functions only.
 */

const idr = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 });
const pct = new Intl.NumberFormat('id-ID', { style: 'percent', maximumFractionDigits: 1 });

export const NO_BREAK_EVEN_TEXT = 'Tidak ada harga impas yang memungkinkan';
const EMPTY = '—';

/**
 * Format a value as whole rupiah, e.g. "Rp 15.000" or "-Rp 5.000".
 * @param {number} value
 * @param {'round' | 'ceil'} [mode] 'ceil' for minimum prices.
 */
export function formatIDR(value, mode = 'round') {
  if (!Number.isFinite(value)) return EMPTY;
  const whole = mode === 'ceil' ? Math.ceil(value) : Math.round(value);
  return idr.format(whole === 0 ? 0 : whole); // avoid "-Rp 0"
}

/**
 * Format a percentage value (19.78 → "19,8%"). null/non-finite → "—".
 * @param {number | null} value
 */
export function formatPercent(value) {
  if (value === null || !Number.isFinite(value)) return EMPTY;
  const s = pct.format(value / 100);
  return /^-0(,0)?%$/.test(s) ? '0%' : s;
}

/**
 * Break-even price rounded up to whole rupiah, or an explanation when none exists.
 * @param {import('./profit.js').BreakEven} breakEven
 */
export function formatBreakEven(breakEven) {
  return breakEven.ok ? formatIDR(breakEven.price, 'ceil') : NO_BREAK_EVEN_TEXT;
}
