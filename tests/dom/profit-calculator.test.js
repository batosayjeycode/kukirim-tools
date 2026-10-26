// @vitest-environment happy-dom
import { describe, it, expect, beforeEach } from 'vitest';
import { loadPage, builtPageExists, $, text, type, submit, tick } from './load-page.js';

const ROUTE = 'kalkulator-keuntungan';

describe.skipIf(!builtPageExists(ROUTE))('profit calculator page', () => {
  beforeEach(async () => {
    await loadPage(ROUTE, () => import('../../src/scripts/profit-calculator.js'));
  });

  it('asks for a price before showing results', () => {
    expect(text($('#profit-status'))).toBe('Isi harga jual untuk melihat hasil.');
    expect($('#profit-results').hidden).toBe(true);
  });

  it('fills the worked example and shows the expected breakdown', () => {
    $('#profit-example').click();
    expect($('#profit-results').hidden).toBe(false);
    expect(text($('[data-out="profit"]'))).toBe('Rp 17.800');
    expect(text($('[data-out="totalProfit"]'))).toBe('Rp 35.600');
    expect(text($('[data-out="margin"]'))).toBe('19,8%');
    expect(text($('[data-out="breakEven"]'))).toBe('Rp 78.503');
    expect(text($('[data-out="feePercentNote"]'))).toBe('8% × harga setelah diskon penjual (Rp 90.000)');
    expect($('[data-row="platformDiscount"]').hidden).toBe(true);
  });

  it('updates live as the user types', () => {
    type('#price', '50.000');
    type('#cost', '30.000');
    expect(text($('[data-out="profit"]'))).toBe('Rp 20.000');
    expect($('[data-row="sellerDiscount"]').hidden).toBe(true);
  });

  it('shows field errors and hides results for invalid input', () => {
    type('#price', '100000');
    type('#discountValue', '150');
    type('#discountType', 'percent');
    expect($('#profit-results').hidden).toBe(true);
    expect(text($('#profit-status'))).toBe('Periksa kembali isian yang ditandai.');
    expect($('#discountValue').getAttribute('aria-invalid')).toBe('true');
    expect($('#discountValue-error').hidden).toBe(false);
    expect(text($('#discountValue-error'))).toBe('Nilai maksimal 100.');
  });

  it('explains when no break-even price exists', () => {
    type('#price', '100000');
    type('#feePct', '100');
    expect(text($('[data-out="breakEven"]'))).toBe('Tidak ada harga impas yang memungkinkan');
  });

  it('renders HTML-like input as text only', () => {
    type('#price', '<img src=x onerror=alert(1)>');
    expect(document.querySelectorAll('main img').length).toBe(0);
    expect($('#price').getAttribute('aria-invalid')).toBe('true');
  });

  it('reset clears results and errors', async () => {
    type('#price', 'abc');
    /** @type {HTMLFormElement} */ ($('#profit-form')).reset();
    await tick();
    expect(document.querySelectorAll('[aria-invalid="true"]').length).toBe(0);
    expect($('#profit-results').hidden).toBe(true);
    expect(/** @type {HTMLInputElement} */ ($('#qty')).value).toBe('1');
  });

  it('submit shows results without reloading', () => {
    type('#price', '10000');
    submit('#profit-form');
    expect($('#profit-results').hidden).toBe(false);
  });
});
