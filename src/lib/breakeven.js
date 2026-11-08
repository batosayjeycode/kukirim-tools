/**
 * Monthly break-even (BEP) for a shop selling one product, or an average product.
 *
 * Profit per unit (contribution) = price − HPP − marketplace fee − other per-unit costs,
 * where the marketplace fee = feePct % × price + feeFixed. Monthly fixed costs are covered
 * once enough units are sold:
 *
 *   BEP units  = ceil(fixed costs ÷ profit per unit)
 *   BEP rupiah = BEP units × price
 *   Target     = ceil((fixed costs + target profit) ÷ profit per unit)
 *
 * All money values are IDR. Pure functions only — no DOM access.
 */
import { MAX_AMOUNT, readField } from './profit.js';

export const MAX_DAYS = 31;

/**
 * @typedef {Object} BreakEvenInput
 * @property {number | string | null} [price]        Selling price per unit (after any seller discount).
 * @property {number | string | null} [cost]         Product cost (HPP) per unit.
 * @property {number | string | null} [feePct]       Marketplace fee percentage (0–100) of the price.
 * @property {number | string | null} [feeFixed]     Fixed marketplace fee per unit.
 * @property {number | string | null} [unitOther]    Packaging, shipping subsidy and other costs per unit.
 * @property {number | string | null} [salaries]     Monthly salaries, including the owner's own.
 * @property {number | string | null} [ads]          Monthly fixed advertising budget.
 * @property {number | string | null} [overhead]     Rent, internet, apps and other monthly fixed costs.
 * @property {number | string | null} [targetProfit] Optional monthly profit target.
 * @property {number | string | null} [days]         Selling days per month (1–31, default 30).
 *
 * @typedef {{ units: number, revenue: number, perDay: number }} SalesNeeded
 *
 * @typedef {Object} BreakEvenResult
 * @property {number} price
 * @property {number} fee              Marketplace fee per unit.
 * @property {number} variableCost     cost + fee + unitOther.
 * @property {number} contribution     Profit per unit before fixed costs.
 * @property {number | null} contributionPct Contribution ÷ price × 100; null when price is 0.
 * @property {number} fixedCosts       Total monthly fixed costs.
 * @property {number} days
 * @property {SalesNeeded | null} breakEven Null when contribution ≤ 0 (never breaks even).
 * @property {{ profit: number, sales: SalesNeeded | null } | null} target Null when no target is set.
 *
 * @typedef {import('./profit.js').FieldError} FieldError
 */

/** Round up to a whole number ≥ 0, ignoring float noise (e.g. 120.00000000001 → 120). */
const ceilUnits = (/** @type {number} */ n) => Math.max(0, Math.ceil(n - 1e-9));

/**
 * @param {number} amount   Amount to cover each month.
 * @param {number} contribution
 * @param {number} price
 * @param {number} days
 * @returns {SalesNeeded | null}
 */
function salesNeeded(amount, contribution, price, days) {
  if (!(contribution > 0)) return null;
  const units = ceilUnits(amount / contribution);
  return { units, revenue: units * price, perDay: ceilUnits(units / days) };
}

/** @param {unknown} raw */
const isBlank = (raw) => raw === null || raw === undefined || (typeof raw === 'string' && raw.trim() === '');

/**
 * Validate input and calculate the monthly break-even point.
 *
 * @param {BreakEvenInput} input
 * @returns {{ ok: true, result: BreakEvenResult } | { ok: false, errors: FieldError[] }}
 */
export function calculateBreakEven(input = {}) {
  /** @type {FieldError[]} */
  const errors = [];

  const price = readField(errors, 'price', input.price);
  const cost = readField(errors, 'cost', input.cost);
  const feePct = readField(errors, 'feePct', input.feePct, { max: 100 });
  const feeFixed = readField(errors, 'feeFixed', input.feeFixed);
  const unitOther = readField(errors, 'unitOther', input.unitOther);
  const salaries = readField(errors, 'salaries', input.salaries);
  const ads = readField(errors, 'ads', input.ads);
  const overhead = readField(errors, 'overhead', input.overhead);
  const targetProfit = isBlank(input.targetProfit) ? null : readField(errors, 'targetProfit', input.targetProfit);
  const days = readField(errors, 'days', input.days, { fallback: 30, max: MAX_DAYS, integer: true, min: 1 });

  if (errors.length > 0) return { ok: false, errors };

  const fee = (price * feePct) / 100 + feeFixed;
  const variableCost = cost + fee + unitOther;
  const contribution = price - variableCost;
  const fixedCosts = Math.min(salaries + ads + overhead, MAX_AMOUNT * 3);

  return {
    ok: true,
    result: {
      price,
      fee,
      variableCost,
      contribution,
      contributionPct: price > 0 ? (contribution / price) * 100 : null,
      fixedCosts,
      days,
      breakEven: salesNeeded(fixedCosts, contribution, price, days),
      target:
        targetProfit === null
          ? null
          : { profit: targetProfit, sales: salesNeeded(fixedCosts + targetProfit, contribution, price, days) },
    },
  };
}
