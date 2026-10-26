import { describe, it, expect } from 'vitest';
import { calculateProfit, breakEvenPrice, parseNumber, MAX_AMOUNT } from '../src/lib/profit.js';

/** @param {Parameters<typeof calculateProfit>[0]} input */
function calc(input) {
  const out = calculateProfit(input);
  if (!out.ok) throw new Error(`unexpected errors: ${JSON.stringify(out.errors)}`);
  return out.result;
}

/** @param {Parameters<typeof calculateProfit>[0]} input */
function errorFields(input) {
  const out = calculateProfit(input);
  expect(out.ok).toBe(false);
  return out.ok ? [] : out.errors.map((e) => e.field);
}

/** Assert every number in the result is finite (or null margin). */
function expectAllFinite(result) {
  for (const [k, v] of Object.entries(result)) {
    if (typeof v === 'number') expect(Number.isFinite(v), k).toBe(true);
  }
}

describe('parseNumber', () => {
  it.each([
    [null, 0],
    [undefined, 0],
    ['', 0],
    ['   ', 0],
    [15000, 15000],
    ['15000', 15000],
    ['15.000', 15000],
    ['1.500.000', 1500000],
    ['Rp 15.000', 15000],
    ['Rp15.000,50', 15000.5],
    ['2,5', 2.5],
    ['2.5', 2.5],
    ['-5', -5],
  ])('%j → %d', (input, expected) => {
    expect(parseNumber(input)).toBe(expected);
  });

  it.each(['abc', '1,2,3', '12..5', '1.2.3', '1e5', '0x10', {}, true])('rejects %j', (input) => {
    expect(parseNumber(input)).toBeNaN();
  });

  it('uses the fallback for empty input', () => {
    expect(parseNumber('', 1)).toBe(1);
  });
});

describe('calculateProfit — basic cases', () => {
  it('no fees and no extra costs', () => {
    const r = calc({ price: 100000, cost: 60000 });
    expect(r.revenue).toBe(100000);
    expect(r.fee).toBe(0);
    expect(r.profit).toBe(40000);
    expect(r.margin).toBe(40);
    expect(r.totalProfit).toBe(40000);
    expect(r.breakEven).toEqual({ ok: true, price: 60000 });
  });

  it('all-empty input gives zero revenue and null margin without NaN', () => {
    const r = calc({});
    expect(r.revenue).toBe(0);
    expect(r.profit).toBe(0);
    expect(r.margin).toBeNull();
    expect(r.qty).toBe(1);
    expectAllFinite(r);
  });

  it('percentage platform fee on revenue', () => {
    const r = calc({ price: 100000, cost: 50000, feePct: 10 });
    expect(r.fee).toBe(10000);
    expect(r.profit).toBe(40000);
  });

  it('fixed marketplace fee and per-order costs', () => {
    const r = calc({ price: 50000, cost: 30000, feeFixed: 1000, shipping: 5000, packaging: 2000, other: 1000 });
    expect(r.orderCosts).toBe(8000);
    expect(r.profit).toBe(50000 - 30000 - 1000 - 8000);
  });

  it('per-order costs are spread over quantity', () => {
    const r = calc({ price: 50000, cost: 30000, shipping: 6000, packaging: 3000, qty: 3 });
    expect(r.orderCostsTotal).toBe(9000);
    expect(r.orderCosts).toBe(3000);
    expect(r.profit).toBe(17000);
    expect(r.totalProfit).toBe(51000);
    expect(r.totalRevenue).toBe(150000);
  });

  it('zero price with costs gives negative profit and null margin', () => {
    const r = calc({ price: 0, cost: 10000 });
    expect(r.profit).toBe(-10000);
    expect(r.margin).toBeNull();
  });

  it('100% seller discount gives zero revenue and null margin', () => {
    const r = calc({ price: 50000, cost: 10000, discount: { value: 100, type: 'percent', funder: 'seller' } });
    expect(r.revenue).toBe(0);
    expect(r.margin).toBeNull();
    expect(r.breakEven).toEqual({ ok: false, reason: 'no-finite-break-even' });
  });
});

describe('calculateProfit — discounts', () => {
  it('seller-funded percent discount reduces revenue and fee base', () => {
    const r = calc({ price: 100000, cost: 50000, feePct: 10, discount: { value: 10, type: 'percent', funder: 'seller' } });
    expect(r.sellerDiscount).toBe(10000);
    expect(r.revenue).toBe(90000);
    expect(r.fee).toBe(9000);
    expect(r.profit).toBe(31000);
  });

  it('seller-funded fixed discount', () => {
    const r = calc({ price: 100000, cost: 50000, discount: { value: 15000, type: 'fixed', funder: 'seller' } });
    expect(r.revenue).toBe(85000);
    expect(r.profit).toBe(35000);
  });

  it('platform-funded discount is not deducted from revenue', () => {
    const r = calc({ price: 100000, cost: 50000, feePct: 10, discount: { value: 20, type: 'percent', funder: 'platform' } });
    expect(r.platformDiscount).toBe(20000);
    expect(r.sellerDiscount).toBe(0);
    expect(r.revenue).toBe(100000);
    expect(r.profit).toBe(40000);
    expect(r.breakEven.ok && r.breakEven.price).toBeCloseTo(50000 / 0.9, 6);
  });

  it('defaults to a fixed seller-funded discount', () => {
    const r = calc({ price: 100000, discount: { value: 5000 } });
    expect(r.sellerDiscount).toBe(5000);
  });
});

describe('calculateProfit — feeBase', () => {
  // Worked example: price 100.000, cost 60.000, seller discount 10%, fee 8% + 1.000,
  // per-order shipping 5.000 + packaging 2.000 + other 1.000, qty 2.
  const base = {
    price: 100000,
    cost: 60000,
    discount: { value: 10, type: 'percent', funder: 'seller' },
    feePct: 8,
    feeFixed: 1000,
    shipping: 5000,
    packaging: 2000,
    other: 1000,
    qty: 2,
  };

  it('revenue (default): fee on price after seller discount', () => {
    const r = calc(base);
    expect(r.feeBase).toBe('revenue');
    expect(r.feeBaseAmount).toBe(90000);
    expect(r.fee).toBe(8200);
    expect(r.orderCosts).toBe(4000);
    expect(r.profit).toBe(17800);
    expect(r.totalProfit).toBe(35600);
    expect(r.margin).toBeCloseTo(19.7778, 4);
    // C = 65.000; 65.000 / (0,92 × 0,90)
    expect(r.breakEven.ok && r.breakEven.price).toBeCloseTo(78502.4155, 3);
  });

  it('listed: fee on price before seller discount', () => {
    const r = calc({ ...base, feeBase: 'listed' });
    expect(r.feeBaseAmount).toBe(100000);
    expect(r.fee).toBe(9000);
    expect(r.profit).toBe(17000);
    // 65.000 / (1 − 0,10 − 0,08)
    expect(r.breakEven.ok && r.breakEven.price).toBeCloseTo(79268.2927, 3);
  });

  it('fixed seller discount break-even for both fee bases', () => {
    const input = { price: 80000, cost: 50000, feePct: 10, discount: { value: 5000, type: 'fixed', funder: 'seller' } };
    const rev = calc(input);
    const listed = calc({ ...input, feeBase: 'listed' });
    expect(rev.breakEven.ok && rev.breakEven.price).toBeCloseTo(50000 / 0.9 + 5000, 6);
    expect(listed.breakEven.ok && listed.breakEven.price).toBeCloseTo(55000 / 0.9, 6);
  });

  it('feeBase does not matter without a seller discount', () => {
    const input = { price: 100000, cost: 40000, feePct: 12 };
    expect(calc(input).profit).toBe(calc({ ...input, feeBase: 'listed' }).profit);
  });

  it('rejects an unknown fee base', () => {
    expect(errorFields({ feeBase: 'gross' })).toContain('feeBase');
  });
});

describe('break-even consistency', () => {
  const cases = [
    { name: 'no discount', discount: undefined },
    { name: 'seller fixed', discount: { value: 7500, type: 'fixed', funder: 'seller' } },
    { name: 'seller percent', discount: { value: 15, type: 'percent', funder: 'seller' } },
    { name: 'platform percent', discount: { value: 30, type: 'percent', funder: 'platform' } },
  ];

  for (const feeBase of ['revenue', 'listed']) {
    for (const c of cases) {
      it(`${feeBase} / ${c.name}: profit at break-even price is zero`, () => {
        const input = { price: 100000, cost: 42000, feePct: 9.5, feeFixed: 1250, shipping: 4000, packaging: 1500, qty: 3, feeBase, discount: c.discount };
        const be = calc(input).breakEven;
        expect(be.ok).toBe(true);
        if (!be.ok) return;
        expect(calc({ ...input, price: be.price }).profit).toBeCloseTo(0, 6);
      });
    }
  }
});

describe('no finite break-even', () => {
  const none = { ok: false, reason: 'no-finite-break-even' };

  it('fee of 100% (revenue base)', () => {
    expect(calc({ price: 100000, cost: 10000, feePct: 100 }).breakEven).toEqual(none);
  });

  it('fee of 100% (listed base)', () => {
    expect(calc({ price: 100000, cost: 10000, feePct: 100, feeBase: 'listed' }).breakEven).toEqual(none);
  });

  it('listed base where discount% + fee% ≥ 100', () => {
    const input = { price: 100000, cost: 10000, feePct: 40, feeBase: 'listed', discount: { value: 60, type: 'percent', funder: 'seller' } };
    expect(calc(input).breakEven).toEqual(none);
    expect(calc({ ...input, discount: { ...input.discount, value: 70 } }).breakEven).toEqual(none);
  });

  it('revenue base with the same rates still has a finite break-even', () => {
    const r = calc({ price: 100000, cost: 10000, feePct: 40, discount: { value: 60, type: 'percent', funder: 'seller' } });
    expect(r.breakEven.ok).toBe(true);
  });

  it('never returns Infinity, NaN, or a negative price', () => {
    for (const feePct of [0, 50, 99.99, 100]) {
      for (const pct of [0, 50, 99.99, 100]) {
        for (const feeBase of ['revenue', 'listed']) {
          const be = breakEvenPrice({ cost: 1000, feeFixed: 0, orderCosts: 0, feePct, feeBase, sellerDiscount: { type: 'percent', value: pct } });
          if (be.ok) {
            expect(Number.isFinite(be.price)).toBe(true);
            expect(be.price).toBeGreaterThanOrEqual(0);
          } else {
            expect(be).toEqual(none);
          }
        }
      }
    }
  });
});

describe('calculateProfit — validation', () => {
  it('rejects negative values', () => {
    expect(errorFields({ price: -1, cost: -1, feeFixed: -1, shipping: -1, packaging: -1, other: -1 })).toEqual([
      'price', 'cost', 'feeFixed', 'shipping', 'packaging', 'other',
    ]);
  });

  it('rejects malformed and non-finite values', () => {
    expect(errorFields({ price: 'abc', cost: NaN, feeFixed: Infinity, other: -Infinity })).toEqual([
      'price', 'cost', 'feeFixed', 'other',
    ]);
  });

  it('rejects values above the maximum', () => {
    expect(errorFields({ price: MAX_AMOUNT + 1 })).toEqual(['price']);
  });

  it('fee percentage must be 0–100', () => {
    expect(errorFields({ feePct: 101 })).toEqual(['feePct']);
    expect(errorFields({ feePct: -1 })).toEqual(['feePct']);
    expect(calculateProfit({ feePct: 100 }).ok).toBe(true);
  });

  it('quantity must be a whole number ≥ 1', () => {
    expect(errorFields({ qty: 0 })).toEqual(['qty']);
    expect(errorFields({ qty: 1.5 })).toEqual(['qty']);
    expect(errorFields({ qty: 'dua' })).toEqual(['qty']);
    expect(calc({ qty: '' }).qty).toBe(1);
  });

  it('percent discount above 100 is rejected', () => {
    expect(errorFields({ price: 1000, discount: { value: 101, type: 'percent' } })).toEqual(['discount.value']);
  });

  it('fixed discount above price is rejected', () => {
    expect(errorFields({ price: 1000, discount: { value: 1001, type: 'fixed' } })).toEqual(['discount.value']);
    expect(calculateProfit({ price: 1000, discount: { value: 1000, type: 'fixed' } }).ok).toBe(true);
  });

  it('rejects unknown discount type and funder', () => {
    expect(errorFields({ discount: { type: 'bogo', funder: 'courier' } })).toEqual(['discount.type', 'discount.funder']);
  });

  it('reports errors with Indonesian messages', () => {
    const out = calculateProfit({ price: -5 });
    expect(out.ok).toBe(false);
    if (!out.ok) expect(out.errors[0].message).toBe('Nilai tidak boleh negatif.');
  });

  it('accepts formatted strings from text inputs', () => {
    const r = calc({ price: 'Rp 100.000', cost: '60.000', feePct: '2,5' });
    expect(r.fee).toBe(2500);
    expect(r.profit).toBe(37500);
  });
});
