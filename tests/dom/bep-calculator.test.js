// @vitest-environment happy-dom
import { describe, it, expect, beforeEach } from 'vitest';
import { loadPage, builtPageExists, $, text, type, tick } from './load-page.js';

const ROUTE = 'kalkulator-bep';

describe.skipIf(!builtPageExists(ROUTE))('BEP calculator page', () => {
  beforeEach(async () => {
    await loadPage(ROUTE, () => import('../../src/scripts/bep-calculator.js'));
  });

  it('asks for a price before showing results', () => {
    expect(text($('#bep-status'))).toBe('Isi harga jual untuk melihat hasil.');
    expect($('#bep-results').hidden).toBe(true);
  });

  it('fills the worked example and shows the expected results', () => {
    $('#bep-example').click();
    expect($('#bep-results').hidden).toBe(false);
    expect(text($('[data-out="bepUnits"]'))).toBe('120 unit');
    expect(text($('[data-out="bepRevenue"]'))).toBe('Rp 9.000.000');
    expect(text($('[data-out="bepPerDay"]'))).toBe('4 unit per hari');
    expect(text($('[data-out="contribution"]'))).toBe('Rp 25.000');
    expect(text($('[data-out="contributionPct"]'))).toBe('33,3% dari harga jual');
    expect(text($('[data-out="bepNote"]'))).toBe('Rp 3.000.000 ÷ Rp 25.000');
    expect($('[data-row="target"]').hidden).toBe(true);
    expect($('[data-row="noBreakEven"]').hidden).toBe(true);
  });

  it('shows the sales needed for a monthly profit target', () => {
    $('#bep-example').click();
    type('#targetProfit', '2.000.000');
    expect($('[data-row="target"]').hidden).toBe(false);
    expect(text($('[data-out="targetProfit"]'))).toBe('Rp 2.000.000');
    expect(text($('[data-out="targetSales"]'))).toBe('200 unit (Rp 15.000.000), 7 unit per hari');
  });

  it('explains when profit per unit does not cover costs', () => {
    $('#bep-example').click();
    type('#cost', '70.000');
    expect(text($('[data-out="bepUnits"]'))).toBe('Tidak tercapai');
    expect($('[data-row="noBreakEven"]').hidden).toBe(false);
  });

  it('shows field errors and hides results for invalid input', () => {
    type('#price', '75000');
    type('#days', '40');
    expect($('#bep-results').hidden).toBe(true);
    expect(text($('#bep-status'))).toBe('Periksa kembali isian yang ditandai.');
    expect($('#days').getAttribute('aria-invalid')).toBe('true');
    expect(text($('#days-error'))).toBe('Nilai maksimal 31.');
  });

  it('clears results on reset', async () => {
    $('#bep-example').click();
    /** @type {HTMLFormElement} */ ($('#bep-form')).reset();
    await tick();
    expect($('#bep-results').hidden).toBe(true);
  });
});
