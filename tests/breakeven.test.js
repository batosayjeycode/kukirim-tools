import { describe, it, expect } from 'vitest';
import { calculateBreakEven } from '../src/lib/breakeven.js';

/** @param {Parameters<typeof calculateBreakEven>[0]} input */
function calc(input) {
  const out = calculateBreakEven(input);
  if (!out.ok) throw new Error(`unexpected errors: ${JSON.stringify(out.errors)}`);
  return out.result;
}

/** @param {Parameters<typeof calculateBreakEven>[0]} input */
function errorFields(input) {
  const out = calculateBreakEven(input);
  expect(out.ok).toBe(false);
  return out.ok ? [] : out.errors.map((e) => e.field);
}

/** Worked example from the page and the kukirim.com BEP guide. */
const EXAMPLE = {
  price: '75.000',
  cost: '40.000',
  feePct: '8',
  feeFixed: '1.000',
  unitOther: '3.000',
  salaries: '1.500.000',
  ads: '1.000.000',
  overhead: '500.000',
};

describe('calculateBreakEven', () => {
  it('matches the worked example', () => {
    const r = calc(EXAMPLE);
    expect(r.fee).toBe(7000);
    expect(r.variableCost).toBe(50000);
    expect(r.contribution).toBe(25000);
    expect(r.contributionPct).toBeCloseTo(33.333, 3);
    expect(r.fixedCosts).toBe(3000000);
    expect(r.days).toBe(30);
    expect(r.breakEven).toEqual({ units: 120, revenue: 9000000, perDay: 4 });
    expect(r.target).toBeNull();
  });

  it('adds a monthly profit target to the fixed costs', () => {
    const r = calc({ ...EXAMPLE, targetProfit: '2.000.000' });
    expect(r.target).toEqual({ profit: 2000000, sales: { units: 200, revenue: 15000000, perDay: 7 } });
  });

  it('rounds units up and derives revenue from whole units', () => {
    // Guide example: 10% discount → price 67.500, profit per unit 18.100 → 165,7 → 166 units.
    const r = calc({ ...EXAMPLE, price: '67.500' });
    expect(r.contribution).toBeCloseTo(18100, 6);
    expect(r.breakEven).toEqual({ units: 166, revenue: 166 * 67500, perDay: 6 });
  });

  it('does not round up float noise on exact results', () => {
    const r = calc({ price: '0,3', cost: '0,1', salaries: '0,2' });
    expect(r.breakEven?.units).toBe(1);
  });

  it('uses the given selling days for the daily figure', () => {
    expect(calc({ ...EXAMPLE, days: '26' }).breakEven?.perDay).toBe(5);
  });

  it('needs zero units when there are no fixed costs', () => {
    const r = calc({ price: '10000', cost: '5000' });
    expect(r.breakEven).toEqual({ units: 0, revenue: 0, perDay: 0 });
  });

  it('reports no break-even when profit per unit is zero or negative', () => {
    expect(calc({ ...EXAMPLE, cost: '65.000' }).breakEven).toBeNull();
    expect(calc({ ...EXAMPLE, cost: '70.000' }).breakEven).toBeNull();
    const r = calc({ ...EXAMPLE, cost: '70.000', targetProfit: '1' });
    expect(r.target).toEqual({ profit: 1, sales: null });
  });

  it('handles an empty price', () => {
    const r = calc({});
    expect(r.contributionPct).toBeNull();
    expect(r.breakEven).toBeNull();
  });

  it('treats an empty target as no target and 0 as a target', () => {
    expect(calc({ ...EXAMPLE, targetProfit: '  ' }).target).toBeNull();
    expect(calc({ ...EXAMPLE, targetProfit: '0' }).target?.sales?.units).toBe(120);
  });

  it('rejects invalid input', () => {
    expect(errorFields({ price: 'abc' })).toEqual(['price']);
    expect(errorFields({ cost: '-1' })).toEqual(['cost']);
    expect(errorFields({ feePct: '101' })).toEqual(['feePct']);
    expect(errorFields({ targetProfit: '-5' })).toEqual(['targetProfit']);
    expect(errorFields({ days: '0' })).toEqual(['days']);
    expect(errorFields({ days: '32' })).toEqual(['days']);
    expect(errorFields({ days: '2,5' })).toEqual(['days']);
  });
});
