/**
 * Shareable calculator links (SEO-P3-01). Form values are encoded in the URL
 * fragment (#…), which browsers never send to the server, so shared numbers
 * stay between the people who exchange the link. Pure functions only.
 */

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
