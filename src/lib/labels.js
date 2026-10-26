/**
 * Recipient/sender validation and label CSV import (PLAN.md §0.3, §0.4).
 * Pure functions only. Values are plain strings and must be rendered with
 * textContent; nothing here produces HTML.
 */
import { parseCsv } from './csv.js';

export const MAX_ROWS = 500;

/** CSV columns in display order. */
export const COLUMNS = /** @type {const} */ ([
  'nama_penerima',
  'no_hp',
  'alamat',
  'kelurahan',
  'kecamatan',
  'kota_kabupaten',
  'provinsi',
  'kode_pos',
  'catatan',
]);

export const REQUIRED_COLUMNS = /** @type {const} */ ([
  'nama_penerima',
  'no_hp',
  'alamat',
  'kecamatan',
  'kota_kabupaten',
  'provinsi',
]);

/** Human-readable field names for error messages. */
export const FIELD_LABELS = {
  nama_penerima: 'Nama penerima',
  no_hp: 'No. HP',
  alamat: 'Alamat',
  kelurahan: 'Kelurahan/desa',
  kecamatan: 'Kecamatan',
  kota_kabupaten: 'Kota/kabupaten',
  provinsi: 'Provinsi',
  kode_pos: 'Kode pos',
  catatan: 'Catatan',
  nama: 'Nama pengirim',
  nama_toko: 'Nama toko',
};

/** Maximum length per field, to keep labels printable. */
const MAX_LENGTH = {
  nama_penerima: 100,
  no_hp: 20,
  alamat: 300,
  kelurahan: 100,
  kecamatan: 100,
  kota_kabupaten: 100,
  provinsi: 100,
  kode_pos: 5,
  catatan: 200,
  nama: 100,
  nama_toko: 100,
};

const PHONE_PATTERN = /^(\+62|62|0)8\d{7,12}$/;
const POSTAL_CODE_PATTERN = /^\d{5}$/;

/**
 * @typedef {Object} Recipient
 * @property {string} nama_penerima
 * @property {string} no_hp
 * @property {string} alamat
 * @property {string} kelurahan
 * @property {string} kecamatan
 * @property {string} kota_kabupaten
 * @property {string} provinsi
 * @property {string} kode_pos
 * @property {string} catatan
 *
 * @typedef {Object} Sender
 * @property {string} nama
 * @property {string} no_hp
 * @property {string} alamat
 * @property {string} nama_toko
 *
 * @typedef {{ field: string, message: string }} FieldError
 */

/**
 * Trim, drop control characters, and collapse whitespace (including newlines).
 * @param {unknown} value
 */
export function cleanText(value) {
  if (typeof value !== 'string') return '';
  // eslint-disable-next-line no-control-regex
  return value.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '').replace(/\s+/g, ' ').trim();
}

/**
 * Remove spaces, dashes, dots and brackets from a phone number.
 * @param {string} value
 */
export function normalizePhone(value) {
  return cleanText(value).replace(/[\s\-.()]/g, '');
}

/** @param {string} phone normalized */
export function isValidPhone(phone) {
  return PHONE_PATTERN.test(phone);
}

/**
 * @param {Record<string, string>} values
 * @param {readonly string[]} fields
 * @param {readonly string[]} required
 * @returns {FieldError[]}
 */
function checkFields(values, fields, required) {
  /** @type {FieldError[]} */
  const errors = [];
  for (const field of fields) {
    const value = values[field];
    const label = FIELD_LABELS[field];
    if (value === '') {
      if (required.includes(field)) errors.push({ field, message: `${label} wajib diisi.` });
      continue;
    }
    if (field === 'no_hp' && !isValidPhone(value)) {
      errors.push({ field, message: `${label} tidak valid. Gunakan format 08xx, 628xx, atau +628xx.` });
    } else if (field === 'kode_pos' && !POSTAL_CODE_PATTERN.test(value)) {
      errors.push({ field, message: `${label} harus 5 digit angka.` });
    } else if (value.length > MAX_LENGTH[field]) {
      errors.push({ field, message: `${label} maksimal ${MAX_LENGTH[field]} karakter.` });
    }
  }
  return errors;
}

/**
 * Clean and validate one recipient (manual entry or CSV row).
 * @param {Partial<Record<keyof Recipient, unknown>>} input
 * @returns {{ ok: true, recipient: Recipient } | { ok: false, errors: FieldError[] }}
 */
export function validateRecipient(input) {
  /** @type {Record<string, string>} */
  const values = {};
  for (const col of COLUMNS) {
    values[col] = col === 'no_hp' ? normalizePhone(input[col]) : cleanText(input[col]);
  }
  const errors = checkFields(values, COLUMNS, REQUIRED_COLUMNS);
  return errors.length > 0 ? { ok: false, errors } : { ok: true, recipient: /** @type {Recipient} */ (values) };
}

const SENDER_FIELDS = /** @type {const} */ (['nama', 'no_hp', 'alamat', 'nama_toko']);

/**
 * Clean and validate sender details. Name and phone are required.
 * @param {Partial<Record<keyof Sender, unknown>>} input
 * @returns {{ ok: true, sender: Sender } | { ok: false, errors: FieldError[] }}
 */
export function validateSender(input) {
  /** @type {Record<string, string>} */
  const values = {};
  for (const f of SENDER_FIELDS) {
    values[f] = f === 'no_hp' ? normalizePhone(input[f]) : cleanText(input[f]);
  }
  const fieldErrors = checkFields(values, SENDER_FIELDS, ['nama', 'no_hp']);
  return fieldErrors.length > 0 ? { ok: false, errors: fieldErrors } : { ok: true, sender: /** @type {Sender} */ (values) };
}

/** Storage format version for sender details saved with explicit opt-in. */
const SENDER_STORAGE_VERSION = 1;

/**
 * @param {Sender} sender a validated sender
 * @returns {string}
 */
export function serializeSender(sender) {
  return JSON.stringify({ v: SENDER_STORAGE_VERSION, sender });
}

/**
 * Read sender details from storage. Stored data is untrusted: anything
 * malformed, outdated, or invalid returns null.
 * @param {string | null} raw
 * @returns {Sender | null}
 */
export function parseStoredSender(raw) {
  if (typeof raw !== 'string' || raw === '') return null;
  try {
    const data = JSON.parse(raw);
    if (!data || data.v !== SENDER_STORAGE_VERSION || typeof data.sender !== 'object' || data.sender === null) return null;
    const result = validateSender(data.sender);
    return result.ok ? result.sender : null;
  } catch {
    return null;
  }
}

/**
 * Normalize a header cell: trim, lowercase, spaces/dashes → underscore.
 * @param {string} header
 */
export function normalizeHeader(header) {
  return header.trim().toLowerCase().replace(/[\s-]+/g, '_');
}

/**
 * @typedef {{ row: number, errors: FieldError[] }} RowError
 *
 * @typedef {{ ok: false, code: 'empty' | 'unterminated-quote' | 'missing-columns' | 'duplicate-columns' | 'too-many-rows',
 *             message: string, columns?: string[] }} ImportFailure
 *
 * @typedef {{ ok: true, recipients: (Recipient & { row: number })[], invalid: RowError[],
 *             total: number, ignoredColumns: string[], delimiter: ',' | ';' }} ImportSuccess
 */

/**
 * Parse and validate a label CSV. Invalid rows are reported with their
 * spreadsheet row number (header = row 1); valid rows can still be printed.
 *
 * @param {string} text
 * @returns {ImportSuccess | ImportFailure}
 */
export function importLabelCsv(text) {
  const parsed = parseCsv(text);
  if (!parsed.ok) {
    return { ok: false, code: 'unterminated-quote', message: `Tanda kutip (") di baris ${parsed.row} tidak ditutup.` };
  }

  const isBlank = (/** @type {string[]} */ r) => r.every((cell) => cell.trim() === '');
  const headerIndex = parsed.records.findIndex((r) => !isBlank(r));
  if (headerIndex === -1) return { ok: false, code: 'empty', message: 'File CSV kosong.' };

  const headers = parsed.records[headerIndex].map(normalizeHeader);

  const duplicates = [...new Set(headers.filter((h, i) => h !== '' && headers.indexOf(h) !== i))];
  if (duplicates.length > 0) {
    return { ok: false, code: 'duplicate-columns', message: `Kolom ganda: ${duplicates.join(', ')}.`, columns: duplicates };
  }

  const missing = REQUIRED_COLUMNS.filter((c) => !headers.includes(c));
  if (missing.length > 0) {
    return { ok: false, code: 'missing-columns', message: `Kolom wajib tidak ditemukan: ${missing.join(', ')}.`, columns: missing };
  }

  const dataRows = parsed.records
    .map((cells, index) => ({ cells, row: index + 1 }))
    .slice(headerIndex + 1)
    .filter((r) => !isBlank(r.cells));

  if (dataRows.length === 0) return { ok: false, code: 'empty', message: 'File CSV tidak berisi data penerima.' };
  if (dataRows.length > MAX_ROWS) {
    return { ok: false, code: 'too-many-rows', message: `Maksimal ${MAX_ROWS} baris data per file. File ini berisi ${dataRows.length} baris.` };
  }

  const known = /** @type {readonly string[]} */ (COLUMNS);
  const ignoredColumns = headers.filter((h) => h !== '' && !known.includes(h));

  /** @type {ImportSuccess['recipients']} */
  const recipients = [];
  /** @type {RowError[]} */
  const invalid = [];

  for (const { cells, row } of dataRows) {
    if (cells.length > headers.length) {
      invalid.push({
        row,
        errors: [{ field: '', message: `Jumlah kolom (${cells.length}) lebih banyak dari judul kolom (${headers.length}). Gunakan tanda kutip untuk teks yang berisi ${parsed.delimiter === ',' ? 'koma' : 'titik koma'}.` }],
      });
      continue;
    }
    /** @type {Record<string, string>} */
    const values = {};
    headers.forEach((h, i) => {
      if (known.includes(h)) values[h] = cells[i] ?? '';
    });
    const result = validateRecipient(values);
    if (result.ok) recipients.push({ ...result.recipient, row });
    else invalid.push({ row, errors: result.errors });
  }

  return { ok: true, recipients, invalid, total: dataRows.length, ignoredColumns, delimiter: parsed.delimiter };
}

/**
 * Prefix a region name unless the user already wrote a prefix.
 * @param {string} value
 * @param {string} prefix e.g. "Kec."
 * @param {RegExp} existing pattern for prefixes already present
 */
function withPrefix(value, prefix, existing) {
  return existing.test(value) ? value : `${prefix} ${value}`;
}

/**
 * Address lines for printing a recipient label.
 * @param {Recipient} r a validated recipient
 * @returns {string[]}
 */
export function addressLines(r) {
  const area = [
    r.kelurahan && withPrefix(r.kelurahan, 'Kel.', /^(kel(urahan)?|desa|ds)\.?\s/i),
    withPrefix(r.kecamatan, 'Kec.', /^kec(amatan)?\.?\s/i),
  ]
    .filter(Boolean)
    .join(', ');
  const region = `${r.kota_kabupaten}, ${r.provinsi}${r.kode_pos ? ` ${r.kode_pos}` : ''}`;
  return [r.alamat, area, region];
}

/**
 * Split items into pages (e.g. labels per A4 sheet).
 * @template T
 * @param {T[]} items
 * @param {number} perPage integer ≥ 1
 * @returns {T[][]}
 */
export function paginate(items, perPage) {
  const size = Math.max(1, Math.floor(perPage));
  /** @type {T[][]} */
  const pages = [];
  for (let i = 0; i < items.length; i += size) pages.push(items.slice(i, i + size));
  return pages;
}
