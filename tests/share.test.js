import { describe, it, expect } from 'vitest';
import { decodeShareState, encodeShareState } from '../src/lib/share.js';

describe('shareable calculator links', () => {
  it('round-trips form values and drops empty ones', () => {
    const values = { price: '100.000', cost: '60.000', discountType: 'percent', discountFunder: 'seller', feePct: '8', other: '', qty: '2' };
    const hash = encodeShareState(values);
    expect(hash).not.toContain('other');
    expect(decodeShareState(`#${hash}`)).toEqual({ price: '100.000', cost: '60.000', discountType: 'percent', discountFunder: 'seller', feePct: '8', qty: '2' });
  });

  it('ignores unknown keys, invalid choices and non-numeric text', () => {
    expect(
      decodeShareState('#price=<img src=x>&feeBase=other&evil=1&cost=Rp%2050.000&qty=2&feePct=' + '9'.repeat(40)),
    ).toEqual({ cost: 'Rp 50.000', qty: '2' });
  });

  it('never encodes values that would be rejected on load', () => {
    expect(encodeShareState({ price: 'javascript:alert(1)', discountType: 'bogus', cost: '5' })).toBe('cost=5');
  });
});
