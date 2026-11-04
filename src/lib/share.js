/**
 * Shareable calculator links (SEO-P3-01). Form values are encoded in the URL
 * fragment (#…), which browsers never send to the server, so shared numbers
 * stay between the people who exchange the link. Also builds social share links,
 * share messages and analytics events. Pure functions only.
 */
import { formatBreakEven, formatIDR, formatPercent } from './format.js';

/** Calculator fields that may appear in a link, with allowed values for choice fields. */
export const SHARE_FIELDS = /** @type {const} */ ({
  price: null,
  cost: null,
  discountValue: null,
  discountType: ['fixed', 'percent'],
  discountFunder: ['seller', 'platform'],
  feePct: null,
  feeBase: ['revenue', 'listed'],
  feeFixed: null,
  shipping: null,
  packaging: null,
  other: null,
  qty: null,
  targetMarginPct: null,
});

const MAX_VALUE_LENGTH = 30;
/** Numbers as typed by users: digits, "." and "," separators, optional "Rp" and spaces. */
const NUMERIC = /^(rp\.?)?[\d.,\s]*$/i;

/**
 * @param {string} key
 * @param {string} value
 */
function isAllowed(key, value) {
  if (!Object.hasOwn(SHARE_FIELDS, key)) return false;
  if (value.length > MAX_VALUE_LENGTH) return false;
  const choices = SHARE_FIELDS[/** @type {keyof typeof SHARE_FIELDS} */ (key)];
  return choices ? /** @type {readonly string[]} */ (choices).includes(value) : NUMERIC.test(value);
}

/**
 * Fragment (without "#") for the given form values; empty values are left out.
 * @param {Record<string, string>} values
 * @returns {string}
 */
export function encodeShareState(values) {
  const params = new URLSearchParams();
  for (const key of Object.keys(SHARE_FIELDS)) {
    const value = (values[key] ?? '').trim();
    if (value !== '' && isAllowed(key, value)) params.set(key, value);
  }
  return params.toString();
}

/**
 * Known, well-formed values from a fragment ("#price=…" or "price=…"). Anything else is ignored.
 * @param {string} hash
 * @returns {Record<string, string>}
 */
export function decodeShareState(hash) {
  /** @type {Record<string, string>} */
  const values = {};
  for (const [key, raw] of new URLSearchParams(hash.replace(/^#/, ''))) {
    const value = raw.trim();
    if (value !== '' && isAllowed(key, value)) values[key] = value;
  }
  return values;
}

/* ---------- Social sharing (PLAN_SOCIAL_SHARING.md) ---------- */

/** Fallback destinations, in display order. Native share and copy link are handled by the page script. */
export const SHARE_PLATFORMS = /** @type {const} */ ([
  { id: 'whatsapp', label: 'WhatsApp' },
  { id: 'telegram', label: 'Telegram' },
  { id: 'facebook', label: 'Facebook' },
  { id: 'x', label: 'X' },
]);

const MAX_FRAGMENT_LENGTH = 1000;
const MAX_TEXT_LENGTH = 500;

/**
 * Public https URL suitable for sharing: the query string (tracking parameters) is always
 * removed; the fragment is kept only when `keepHash` is set and it is short. Returns null for
 * anything that is not an absolute https URL.
 * @param {string} input
 * @param {{ keepHash?: boolean }} [options]
 * @returns {string | null}
 */
export function cleanShareUrl(input, { keepHash = false } = {}) {
  let url;
  try {
    url = new URL(String(input));
  } catch {
    return null;
  }
  if (url.protocol !== 'https:' || url.username || url.password) return null;
  url.search = '';
  if (!keepHash || url.hash.length > MAX_FRAGMENT_LENGTH) url.hash = '';
  return url.href;
}

/**
 * Official share-intent URLs for each fallback platform, or null when `url` is not shareable.
 * @param {{ text?: string, url: string }} data `url` must already be cleaned.
 * @returns {Record<(typeof SHARE_PLATFORMS)[number]['id'], string> | null}
 */
export function buildShareLinks({ text = '', url }) {
  if (cleanShareUrl(url, { keepHash: true }) !== url) return null;
  const t = text.trim().slice(0, MAX_TEXT_LENGTH);
  const u = encodeURIComponent(url);
  const e = encodeURIComponent;
  return {
    whatsapp: `https://wa.me/?text=${e(t ? `${t} ${url}` : url)}`,
    telegram: `https://t.me/share/url?url=${u}${t ? `&text=${e(t)}` : ''}`,
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${u}`,
    x: `https://twitter.com/intent/tweet?url=${u}${t ? `&text=${e(t)}` : ''}`,
  };
}

/**
 * Message for sharing a profit calculation (summary text, no raw inputs).
 * @param {import('./profit.js').ProfitResult} r a successful calculateProfit() result
 */
export function profitShareText(r) {
  const parts = [`laba bersih ${formatIDR(r.profit)} per unit`, `margin ${formatPercent(r.margin)}`];
  if (r.breakEven.ok) parts.push(`harga impas ${formatBreakEven(r.breakEven)}`);
  return `Estimasi saya di Kalkulator Keuntungan Kukirim: ${parts.join(', ')}. Coba hitung sendiri:`;
}

/**
 * Analytics events for one share action. Properties never include the shared text, the
 * fragment, or any calculation value.
 * @param {'native' | 'copy' | (typeof SHARE_PLATFORMS)[number]['id']} method
 * @param {'click' | 'done'} stage "click" when the user picks a method; "done" once it succeeded
 *   (native share resolved, link copied, or platform link opened).
 * @param {{ pageType?: string, pagePath?: string, toolName?: string, contentType?: string }} context
 * @returns {{ name: string, props: Record<string, string> }[]}
 */
export function shareEvents(method, stage, { pageType = '', pagePath = '', toolName = '', contentType = 'page' } = {}) {
  const props = {
    page_type: pageType,
    page_path: pagePath.split(/[?#]/)[0],
    tool_name: toolName,
    share_method: method,
    content_type: contentType,
  };
  if (stage === 'click') return [{ name: 'share_click', props }];
  const name = method === 'native' ? 'share_success' : method === 'copy' ? 'share_copy_link' : `share_${method}`;
  const events = [{ name, props }];
  if (contentType === 'result') events.push({ name: 'share_result', props });
  return events;
}
