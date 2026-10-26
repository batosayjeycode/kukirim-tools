import { describe, it, expect } from 'vitest';
import { formatIDR, formatPercent, formatBreakEven, NO_BREAK_EVEN_TEXT } from '../src/lib/format.js';

/** Normalise the non-breaking space Intl inserts after "Rp". */
const plain = (s) => s.replace(/\s/g, ' ');

describe('formatIDR', () => {
  it.each([
    [15000, 'Rp 15.000'],
    [1500000, 'Rp 1.500.000'],
    [0, 'Rp 0'],
    [-5000, '-Rp 5.000'],
    [-0.4, 'Rp 0'],
    [17799.5, 'Rp 17.800'],
  ])('%d → %s', (value, expected) => {
    expect(plain(formatIDR(value))).toBe(expected);
  });

  it('rounds up in ceil mode', () => {
    expect(plain(formatIDR(78502.0001, 'ceil'))).toBe('Rp 78.503');
  });

  it('shows a dash for non-finite values', () => {
    expect(formatIDR(NaN)).toBe('—');
    expect(formatIDR(Infinity)).toBe('—');
  });
});

describe('formatPercent', () => {
  it.each([
    [19.7778, '19,8%'],
    [40, '40%'],
    [-12.25, '-12,3%'],
    [-0.01, '0%'],
    [null, '—'],
    [NaN, '—'],
  ])('%j → %s', (value, expected) => {
    expect(formatPercent(value)).toBe(expected);
  });
});

describe('formatBreakEven', () => {
  it('rounds a finite break-even up to whole rupiah', () => {
    expect(plain(formatBreakEven({ ok: true, price: 78502.4155 }))).toBe('Rp 78.503');
  });

  it('explains when there is no finite break-even', () => {
    expect(formatBreakEven({ ok: false, reason: 'no-finite-break-even' })).toBe(NO_BREAK_EVEN_TEXT);
  });
});
