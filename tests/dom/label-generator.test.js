// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { loadPage, builtPageExists, ROOT, $, text, type, submit, tick } from './load-page.js';

const ROUTE = 'generator-label-paket';
const KEY = 'kukirim:pengirim';
const SAMPLE_CSV = readFileSync(join(ROOT, 'public', 'downloads', 'contoh-label.csv'), 'utf8');

const load = () => loadPage(ROUTE, () => import('../../src/scripts/label-generator.js'));

/** @param {Record<string, string>} fields */
function addRecipient(fields) {
  for (const [k, v] of Object.entries(fields)) type(`#penerima_${k}`, v);
  submit('#recipient-form');
}

const VALID = {
  nama_penerima: 'Budi',
  no_hp: '081234567890',
  alamat: 'Jl. Uji No. 1',
  kecamatan: 'Coblong',
  kota_kabupaten: 'Kota Bandung',
  provinsi: 'Jawa Barat',
};

/** Simulate choosing a file in the CSV input. */
async function importCsv(content) {
  const input = /** @type {HTMLInputElement} */ ($('#csv-file'));
  Object.defineProperty(input, 'files', { configurable: true, value: [new File([content], 'uji.csv', { type: 'text/csv' })] });
  input.dispatchEvent(new Event('change', { bubbles: true }));
  for (let i = 0; i < 5; i++) await tick();
}

describe.skipIf(!builtPageExists(ROUTE))('label generator page', () => {
  beforeEach(async () => {
    localStorage.clear();
    await load();
  });

  it('starts empty with printing disabled', () => {
    expect(text($('#list-status'))).toBe('Belum ada label. Tambahkan penerima atau impor CSV.');
    expect(/** @type {HTMLButtonElement} */ ($('#print-labels')).disabled).toBe(true);
  });

  describe('manual entry', () => {
    it('flags every missing required field', () => {
      submit('#recipient-form');
      const shown = [...document.querySelectorAll('#recipient-form .field-error:not([hidden])')].map((e) => e.id);
      expect(shown).toEqual([
        'penerima_nama_penerima-error',
        'penerima_no_hp-error',
        'penerima_alamat-error',
        'penerima_kecamatan-error',
        'penerima_kota_kabupaten-error',
        'penerima_provinsi-error',
      ]);
    });

    it('adds a valid recipient, clears the form, and enables printing', () => {
      addRecipient(VALID);
      expect(text($('#list-status'))).toBe('1 label siap dicetak.');
      expect(/** @type {HTMLInputElement} */ ($('#penerima_alamat')).value).toBe('');
      expect(/** @type {HTMLButtonElement} */ ($('#print-labels')).disabled).toBe(false);
      expect(text($('#label-preview .label-name'))).toBe('Budi');
    });

    it('renders HTML-like text literally', () => {
      addRecipient({ ...VALID, nama_penerima: '<img src=x onerror=alert(1)>', catatan: '<script>alert(1)</script>' });
      expect(document.querySelectorAll('#label-preview img, #label-preview script, #print-area img').length).toBe(0);
      expect(text($('#label-preview .label-name'))).toBe('<img src=x onerror=alert(1)>');
    });

    it('removes a label from the list', () => {
      addRecipient(VALID);
      addRecipient({ ...VALID, nama_penerima: 'Ani' });
      /** @type {HTMLElement} */ (document.querySelector('[data-remove="0"]')).click();
      expect(text($('#list-status'))).toBe('1 label siap dicetak.');
      expect(text($('#label-preview .label-name'))).toBe('Ani');
    });
  });

  describe('CSV import', () => {
    it('imports valid rows and reports invalid ones with row numbers', async () => {
      await importCsv(`${SAMPLE_CSV}Baris Rusak,123,,,,,,,\n`);
      expect(text($('#import-report'))).toContain('3 dari 4 baris berhasil ditambahkan.');
      expect(text($('#import-report'))).toContain('Baris 5: No. HP tidak valid.');
      expect(text($('#list-status'))).toBe('3 label siap dicetak.');
    });

    it('rejects a file with missing columns', async () => {
      await importCsv('nama_penerima,alamat\nA,B');
      expect(text($('#import-report'))).toBe('Kolom wajib tidak ditemukan: no_hp, kecamatan, kota_kabupaten, provinsi.');
      expect(text($('#list-status'))).toBe('Belum ada label. Tambahkan penerima atau impor CSV.');
    });
  });

  describe('sender details', () => {
    const fillSender = () => {
      type('#pengirim_nama', 'Toko Uji');
      type('#pengirim_no_hp', '0812-0000-9999');
    };
    const optIn = () => {
      const box = /** @type {HTMLInputElement} */ ($('#sender-save'));
      box.checked = true;
      box.dispatchEvent(new Event('change', { bubbles: true }));
    };

    it('is not stored without opt-in', () => {
      fillSender();
      expect(localStorage.getItem(KEY)).toBeNull();
    });

    it('is stored after opt-in and restored on the next visit', async () => {
      fillSender();
      optIn();
      expect(JSON.parse(String(localStorage.getItem(KEY))).sender).toMatchObject({ nama: 'Toko Uji', no_hp: '081200009999' });
      await load();
      expect(/** @type {HTMLInputElement} */ ($('#pengirim_nama')).value).toBe('Toko Uji');
      expect(/** @type {HTMLInputElement} */ ($('#sender-save')).checked).toBe(true);
    });

    it('is deleted by "Hapus data pengirim"', () => {
      fillSender();
      optIn();
      $('#sender-delete').click();
      expect(localStorage.getItem(KEY)).toBeNull();
      expect(/** @type {HTMLInputElement} */ ($('#pengirim_nama')).value).toBe('');
      expect(/** @type {HTMLInputElement} */ ($('#sender-save')).checked).toBe(false);
    });

    it('is deleted when the opt-in is unticked', () => {
      fillSender();
      optIn();
      const box = /** @type {HTMLInputElement} */ ($('#sender-save'));
      box.checked = false;
      box.dispatchEvent(new Event('change', { bubbles: true }));
      expect(localStorage.getItem(KEY)).toBeNull();
    });

    it('discards malformed stored data', async () => {
      localStorage.setItem(KEY, '{"v":1,"sender":{"nama":"<b>x</b>","no_hp":"123"}}');
      await load();
      expect(localStorage.getItem(KEY)).toBeNull();
      expect(/** @type {HTMLInputElement} */ ($('#pengirim_nama')).value).toBe('');
    });

    it('appears on labels when valid', () => {
      fillSender();
      addRecipient(VALID);
      expect(text($('#print-area .label-from'))).toContain('Toko Uji');
    });

    it('blocks printing while partly filled and invalid', () => {
      const print = vi.fn();
      window.print = print; // happy-dom has no print()
      addRecipient(VALID);
      type('#pengirim_nama', 'Toko Uji');
      $('#print-labels').click();
      expect(print).not.toHaveBeenCalled();
      expect($('#pengirim_no_hp').getAttribute('aria-invalid')).toBe('true');
      type('#pengirim_no_hp', '081200009999');
      $('#print-labels').click();
      expect(print).toHaveBeenCalledOnce();
    });
  });

  describe('print layout', () => {
    it('thermal: one label per sheet with 100 × 150 mm page size', async () => {
      await importCsv(SAMPLE_CSV);
      expect($('#print-area').className).toBe('print-area print-thermal');
      expect(document.querySelectorAll('#print-area .sheet').length).toBe(3);
      expect(text($('#label-page-style'))).toBe('@page { size: 100mm 150mm; margin: 0; }');
    });

    it('A4: 8 labels per sheet', async () => {
      await importCsv(SAMPLE_CSV + SAMPLE_CSV.split('\n').slice(1).join('\n') + SAMPLE_CSV.split('\n').slice(1).join('\n'));
      const a4 = /** @type {HTMLInputElement} */ (document.querySelector('input[name="ukuran"][value="a4"]'));
      a4.checked = true;
      a4.dispatchEvent(new Event('change', { bubbles: true }));
      const sheets = [...document.querySelectorAll('#print-area .sheet')].map((s) => s.children.length);
      expect(sheets).toEqual([8, 1]);
      expect(text($('#label-page-style'))).toBe('@page { size: A4; margin: 8mm; }');
    });
  });
});
