/**
 * Browser glue for /kalkulator-bep/. All calculation lives in src/lib/breakeven.js.
 * Output is written with textContent only; nothing is stored or sent anywhere.
 */
import { calculateBreakEven } from '../lib/breakeven.js';
import { formatIDR, formatPercent } from '../lib/format.js';

/** Worked example shown on the page (fictitious numbers, same as the kukirim.com BEP guide). */
const EXAMPLE = {
  price: '75.000',
  cost: '40.000',
  feePct: '8',
  feeFixed: '1.000',
  unitOther: '3.000',
  salaries: '1.500.000',
  ads: '1.000.000',
  overhead: '500.000',
  targetProfit: '',
  days: '30',
};

const FIELDS = /** @type {const} */ ([
  'price',
  'cost',
  'feePct',
  'feeFixed',
  'unitOther',
  'salaries',
  'ads',
  'overhead',
  'targetProfit',
  'days',
]);

const count = new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 });
const units = (/** @type {number} */ n) => `${count.format(n)} unit`;
const NO_BEP = 'Tidak tercapai';

const form = /** @type {HTMLFormElement | null} */ (document.getElementById('bep-form'));
if (form) init(form);

/** @param {HTMLFormElement} form */
function init(form) {
  const results = /** @type {HTMLElement} */ (document.getElementById('bep-results'));
  const status = /** @type {HTMLElement} */ (document.getElementById('bep-status'));

  /** @param {string} name */
  const out = (name) => /** @type {HTMLElement} */ (results.querySelector(`[data-out="${name}"]`));
  /** @param {string} name */
  const row = (name) => /** @type {HTMLElement} */ (results.querySelector(`[data-row="${name}"]`));
  /** @param {string} name */
  const value = (name) => String(new FormData(form).get(name) ?? '');

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
      document.getElementById(field)?.setAttribute('aria-invalid', 'true');
      const msg = document.getElementById(`${field}-error`);
      if (msg && msg.hidden) {
        msg.textContent = message;
        msg.hidden = false;
      }
    }
  }

  function update() {
    clearErrors();
    const outcome = calculateBreakEven(Object.fromEntries(FIELDS.map((name) => [name, value(name)])));

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
    const bep = r.breakEven;
    status.textContent = '';
    results.hidden = false;

    out('bepUnits').textContent = bep ? units(bep.units) : NO_BEP;
    out('bepUnits').dataset.sign = bep ? 'positive' : 'negative';
    out('bepRevenue').textContent = bep ? formatIDR(bep.revenue) : NO_BEP;
    out('bepPerDay').textContent = bep ? `${units(bep.perDay)} per hari` : NO_BEP;
    out('contribution').textContent = formatIDR(r.contribution);
    out('contribution').dataset.sign = r.contribution > 0 ? 'positive' : 'negative';
    row('noBreakEven').hidden = bep !== null;

    row('target').hidden = r.target === null;
    if (r.target) {
      out('targetProfit').textContent = formatIDR(r.target.profit);
      const s = r.target.sales;
      out('targetSales').textContent = s ? `${units(s.units)} (${formatIDR(s.revenue)}), ${units(s.perDay)} per hari` : NO_BEP;
    }

    out('price').textContent = formatIDR(r.price);
    out('variableCost').textContent = `−${formatIDR(r.variableCost)}`;
    out('contributionRow').textContent = formatIDR(r.contribution);
    out('contributionPct').textContent = `${formatPercent(r.contributionPct)} dari harga jual`;
    out('fixedCosts').textContent = formatIDR(r.fixedCosts);
    out('bepNote').textContent = bep ? `${formatIDR(r.fixedCosts)} ÷ ${formatIDR(r.contribution)}` : 'laba per unit tidak positif';
    out('bepUnitsRow').textContent = bep ? units(bep.units) : NO_BEP;
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

  document.getElementById('bep-example')?.addEventListener('click', () => {
    for (const [name, v] of Object.entries(EXAMPLE)) {
      const field = /** @type {HTMLInputElement | null} */ (form.elements.namedItem(name));
      if (field) field.value = v;
    }
    update();
    form.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  update();
}
