/**
 * Profit calculation for a single product line (PLAN.md §0.2).
 *
 * All money values are IDR. `price`, `cost`, `feeFixed` and the discount are
 * per unit; `shipping`, `packaging` and `other` are per order and are divided
 * by `qty`. Pure functions only — no DOM access.
 */

/** Largest accepted money value (1 trillion IDR); keeps results well inside float precision. */
export const MAX_AMOUNT = 1e12;
export const MAX_QTY = 100000;

/**
 * @typedef {'fixed' | 'percent'} DiscountType
 * @typedef {'seller' | 'platform'} DiscountFunder
 * @typedef {'revenue' | 'listed'} FeeBase
 *
 * @typedef {Object} ProfitInput
 * @property {number | string | null} [price]     Listed selling price per unit.
 * @property {number | string | null} [cost]      Product cost (HPP) per unit.
 * @property {{ value?: number | string | null, type?: DiscountType, funder?: DiscountFunder }} [discount]
 * @property {number | string | null} [feePct]    Marketplace fee percentage (0–100) of the fee base.
 * @property {FeeBase} [feeBase]                  'revenue' (default) or 'listed'.
 * @property {number | string | null} [feeFixed]  Fixed marketplace fee per unit.
 * @property {number | string | null} [shipping]  Seller-paid shipping subsidy per order.
 * @property {number | string | null} [packaging] Packaging cost per order.
 * @property {number | string | null} [other]     Other costs per order.
 * @property {number | string | null} [qty]       Units per order (integer ≥ 1, default 1).
 *
 * @typedef {{ ok: true, price: number } | { ok: false, reason: 'no-finite-break-even' }} BreakEven
 *
 * @typedef {Object} ProfitResult
 * @property {number} price
 * @property {number} sellerDiscount   Per unit; deducted from revenue.
 * @property {number} platformDiscount Per unit; informational only, not deducted.
 * @property {number} revenue          price − sellerDiscount.
 * @property {FeeBase} feeBase
 * @property {number} feeBaseAmount    Amount the percentage fee is applied to.
 * @property {number} feePercentAmount
 * @property {number} feeFixed
 * @property {number} fee              feePercentAmount + feeFixed.
 * @property {number} cost
 * @property {number} orderCosts       Per-order costs per unit.
 * @property {number} orderCostsTotal  Per-order costs for the whole order.
 * @property {number} profit           Per unit.
 * @property {number | null} margin    Percent of revenue; null when revenue is 0.
 * @property {number} qty
 * @property {number} totalRevenue
 * @property {number} totalProfit
 * @property {BreakEven} breakEven     Listed price at which profit = 0.
 *
 * @typedef {{ field: string, message: string }} FieldError
 */

/**
 * Parse a user-entered number. Empty values become `fallback`.
 * Accepts numbers and strings such as "15000", "15.000", "Rp 15.000", "2,5", "2.5".
 * Returns NaN for malformed input.
 *
 * @param {unknown} value
 * @param {number} [fallback]
 * @returns {number}
 */
export function parseNumber(value, fallback = 0) {
  if (value === null || value === undefined) return fallback;
  if (typeof value === 'number') return value;
  if (typeof value !== 'string') return NaN;

  let s = value.replace(/\s+/g, '').replace(/^rp\.?/i, '');
  if (s === '') return fallback;

  if (s.includes(',')) {
    // Indonesian format: "." thousands, "," decimal.
    if (!/^-?\d{1,3}(\.\d{3})*(,\d+)?$/.test(s) && !/^-?\d+(,\d+)?$/.test(s)) return NaN;
    s = s.replace(/\./g, '').replace(',', '.');
  } else if (/^-?\d{1,3}(\.\d{3})+$/.test(s)) {
    // "15.000" / "1.500.000" — dot as thousands separator.
    s = s.replace(/\./g, '');
  }

  if (!/^-?\d+(\.\d+)?$/.test(s)) return NaN;
  return Number(s);
}

/**
 * @param {FieldError[]} errors
 * @param {string} field
 * @param {unknown} raw
 * @param {{ fallback?: number, max?: number, integer?: boolean, min?: number }} [opts]
 */
function readField(errors, field, raw, { fallback = 0, max = MAX_AMOUNT, integer = false, min = 0 } = {}) {
  const n = parseNumber(raw, fallback);
  if (!Number.isFinite(n)) {
    errors.push({ field, message: 'Masukkan angka yang valid.' });
  } else if (n < min) {
    errors.push({ field, message: min > 0 ? `Nilai minimal ${min}.` : 'Nilai tidak boleh negatif.' });
  } else if (n > max) {
    errors.push({ field, message: `Nilai maksimal ${max.toLocaleString('id-ID')}.` });
  } else if (integer && !Number.isInteger(n)) {
    errors.push({ field, message: 'Masukkan bilangan bulat.' });
  } else {
    return n;
  }
  return NaN;
}

/**
 * Listed price at which per-unit profit is zero (PLAN.md §0.2 table).
 *
 * @param {{ cost: number, feeFixed: number, orderCosts: number, feePct: number, feeBase: FeeBase,
 *           sellerDiscount: { type: DiscountType, value: number } | null }} p
 * @returns {BreakEven}
 */
export function breakEvenPrice({ cost, feeFixed, orderCosts, feePct, feeBase, sellerDiscount }) {
  const C = cost + feeFixed + orderCosts;
  const f = feePct / 100;

  let numerator = C;
  let denominator = 1 - f;
  let offset = 0;

  if (sellerDiscount && sellerDiscount.value > 0) {
    if (sellerDiscount.type === 'percent') {
      const p = sellerDiscount.value / 100;
      denominator = feeBase === 'listed' ? 1 - p - f : (1 - f) * (1 - p);
    } else if (feeBase === 'listed') {
      numerator = C + sellerDiscount.value;
    } else {
      offset = sellerDiscount.value;
    }
  }

  if (!(denominator > 0)) return { ok: false, reason: 'no-finite-break-even' };
  const price = numerator / denominator + offset;
  if (!Number.isFinite(price) || price < 0) return { ok: false, reason: 'no-finite-break-even' };
  return { ok: true, price };
}

/**
 * Validate input and calculate profit.
 *
 * @param {ProfitInput} input
 * @returns {{ ok: true, result: ProfitResult } | { ok: false, errors: FieldError[] }}
 */
export function calculateProfit(input = {}) {
  /** @type {FieldError[]} */
  const errors = [];

  const price = readField(errors, 'price', input.price);
  const cost = readField(errors, 'cost', input.cost);
  const feePct = readField(errors, 'feePct', input.feePct, { max: 100 });
  const feeFixed = readField(errors, 'feeFixed', input.feeFixed);
  const shipping = readField(errors, 'shipping', input.shipping);
  const packaging = readField(errors, 'packaging', input.packaging);
  const other = readField(errors, 'other', input.other);
  const qty = readField(errors, 'qty', input.qty, { fallback: 1, max: MAX_QTY, integer: true, min: 1 });

  const feeBase = input.feeBase ?? 'revenue';
  if (feeBase !== 'revenue' && feeBase !== 'listed') {
    errors.push({ field: 'feeBase', message: 'Dasar biaya tidak dikenal.' });
  }

  const discountType = input.discount?.type ?? 'fixed';
  const discountFunder = input.discount?.funder ?? 'seller';
  if (discountType !== 'fixed' && discountType !== 'percent') {
    errors.push({ field: 'discount.type', message: 'Jenis diskon tidak dikenal.' });
  }
  if (discountFunder !== 'seller' && discountFunder !== 'platform') {
    errors.push({ field: 'discount.funder', message: 'Penanggung diskon tidak dikenal.' });
  }
  const discountValue = readField(errors, 'discount.value', input.discount?.value, {
    max: discountType === 'percent' ? 100 : MAX_AMOUNT,
  });
  if (discountType === 'fixed' && Number.isFinite(price) && discountValue > price) {
    errors.push({ field: 'discount.value', message: 'Diskon tidak boleh melebihi harga jual.' });
  }

  if (errors.length > 0) return { ok: false, errors };

  const discountAmount = discountType === 'percent' ? (price * discountValue) / 100 : discountValue;
  const sellerDiscount = discountFunder === 'seller' ? discountAmount : 0;
  const platformDiscount = discountFunder === 'platform' ? discountAmount : 0;

  const revenue = price - sellerDiscount;
  const feeBaseAmount = feeBase === 'listed' ? price : revenue;
  const feePercentAmount = (feeBaseAmount * feePct) / 100;
  const fee = feePercentAmount + feeFixed;
  const orderCostsTotal = shipping + packaging + other;
  const orderCosts = orderCostsTotal / qty;
  const profit = revenue - cost - fee - orderCosts;
  const margin = revenue > 0 ? (profit / revenue) * 100 : null;

  /** @type {ProfitResult} */
  const result = {
    price,
    sellerDiscount,
    platformDiscount,
    revenue,
    feeBase,
    feeBaseAmount,
    feePercentAmount,
    feeFixed,
    fee,
    cost,
    orderCosts,
    orderCostsTotal,
    profit,
    margin,
    qty,
    totalRevenue: revenue * qty,
    totalProfit: profit * qty,
    breakEven: breakEvenPrice({
      cost,
      feeFixed,
      orderCosts,
      feePct,
      feeBase,
      sellerDiscount: discountFunder === 'seller' ? { type: discountType, value: discountValue } : null,
    }),
  };

  return { ok: true, result };
}
