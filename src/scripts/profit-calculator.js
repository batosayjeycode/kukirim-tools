/**
 * Browser glue for /kalkulator-keuntungan/. All calculation lives in src/lib/profit.js.
 * Output is written with textContent only; nothing is stored or sent anywhere.
 */
import { calculateProfit, parseNumber } from '../lib/profit.js';
import { formatIDR, formatPercent, formatBreakEven } from '../lib/format.js';

/** Worked example shown on the page (fictitious numbers). */
const EXAMPLE = {
  price: '100.000',
  cost: '60.000',
  discountValue: '10',
  discountType: 'percent',
  discountFunder: 'seller',
  feePct: '8',
  feeBase: 'revenue',
  feeFixed: '1.000',
  shipping: '5.000',
  packaging: '2.000',
  other: '1.000',
  qty: '2',
};

const FEE_BASE_TEXT = {
  revenue: 'harga setelah diskon penjual',
  listed: 'harga jual awal',
};

const form = /** @type {HTMLFormElement | null} */ (document.getElementById('profit-form'));
if (form) init(form);

/** @param {HTMLFormElement} form */
function init(form) {
  const results = /** @type {HTMLElement} */ (document.getElementById('profit-results'));
  const status = /** @type {HTMLElement} */ (document.getElementById('profit-status'));
  const exampleButton = document.getElementById('profit-example');

  /** @param {string} name */
  const out = (name) => /** @type {HTMLElement} */ (results.querySelector(`[data-out="${name}"]`));
  /** @param {string} name */
  const row = (name) => /** @type {HTMLElement} */ (results.querySelector(`[data-row="${name}"]`));
  /** @param {string} name */
  const value = (name) => String(new FormData(form).get(name) ?? '');

  /** Map a lib field name (e.g. "discount.value") to its input id ("discountValue"). */
  const inputId = (/** @type {string} */ field) => field.replace(/\.(\w)/, (_, c) => c.toUpperCase());

  function clearErrors() {
    for (const el of form.querySelectorAll('[aria-invalid="true"]')) el.removeAttribute('aria-invalid');
    for (const el of form.querySelectorAll('.field-error')) {
      el.textContent = '';
      el.hidden = true;
    }
  }

  /** @param {import('../lib/profit.js').FieldError[]} errors */
  function showErrors(errors) {
    for (const { field, message } of errors) {
      const id = inputId(field);
      const input = document.getElementById(id);
      const msg = document.getElementById(`${id}-error`);
      input?.setAttribute('aria-invalid', 'true');
      if (msg && msg.hidden) {
        msg.textContent = message;
        msg.hidden = false;
      }
    }
  }

  function update() {
    clearErrors();
    const outcome = calculateProfit({
      price: value('price'),
      cost: value('cost'),
      discount: {
        value: value('discountValue'),
        type: /** @type {any} */ (value('discountType')),
        funder: /** @type {any} */ (value('discountFunder')),
      },
      feePct: value('feePct'),
      feeBase: /** @type {any} */ (value('feeBase')),
      feeFixed: value('feeFixed'),
      shipping: value('shipping'),
      packaging: value('packaging'),
      other: value('other'),
      qty: value('qty'),
    });

    if (!outcome.ok) {
      showErrors(outcome.errors);
      results.hidden = true;
      status.textContent = 'Periksa kembali isian yang ditandai.';
      return;
    }
    if (value('price').trim() === '') {
      results.hidden = true;
      status.textContent = 'Isi harga jual untuk melihat hasil.';
      return;
    }

    const r = outcome.result;
    status.textContent = '';
    results.hidden = false;

    out('profit').textContent = formatIDR(r.profit);
    out('profit').dataset.sign = r.profit < 0 ? 'negative' : 'positive';
    out('totalProfit').textContent = formatIDR(r.totalProfit);
    out('qty').textContent = String(r.qty);
    out('margin').textContent = formatPercent(r.margin);
    out('breakEven').textContent = formatBreakEven(r.breakEven);

    out('price').textContent = formatIDR(r.price);
    out('sellerDiscount').textContent = `−${formatIDR(r.sellerDiscount)}`;
    row('sellerDiscount').hidden = r.sellerDiscount === 0;
    out('revenue').textContent = formatIDR(r.revenue);
    out('feePercent').textContent = `−${formatIDR(r.feePercentAmount)}`;
    out('feePercentNote').textContent = `${formatPercent(parseNumber(value('feePct')))} × ${FEE_BASE_TEXT[r.feeBase]} (${formatIDR(r.feeBaseAmount)})`;
    out('feeFixed').textContent = `−${formatIDR(r.feeFixed)}`;
    row('feeFixed').hidden = r.feeFixed === 0;
    out('cost').textContent = `−${formatIDR(r.cost)}`;
    out('orderCosts').textContent = `−${formatIDR(r.orderCosts)}`;
    out('orderCostsNote').textContent = `${formatIDR(r.orderCostsTotal)} per pesanan ÷ ${r.qty} unit`;
    row('orderCosts').hidden = r.orderCostsTotal === 0;
    out('profitRow').textContent = formatIDR(r.profit);
    out('platformDiscount').textContent = formatIDR(r.platformDiscount);
    row('platformDiscount').hidden = r.platformDiscount === 0;
  }

  form.addEventListener('input', update);
  form.addEventListener('change', update);
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    update();
    results.hidden || results.focus();
  });
  // The reset event fires before fields are cleared.
  form.addEventListener('reset', () => setTimeout(update, 0));

  exampleButton?.addEventListener('click', () => {
    for (const [name, v] of Object.entries(EXAMPLE)) {
      for (const field of form.querySelectorAll(`[name="${name}"]`)) {
        if (field instanceof HTMLInputElement && field.type === 'radio') field.checked = field.value === v;
        else /** @type {HTMLInputElement | HTMLSelectElement} */ (field).value = v;
      }
    }
    update();
    form.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  update();
}
