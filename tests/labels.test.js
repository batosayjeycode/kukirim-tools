import { describe, it, expect } from 'vitest';
import {
  importLabelCsv,
  validateRecipient,
  validateSender,
  serializeSender,
  parseStoredSender,
  normalizePhone,
  normalizeHeader,
  cleanText,
  addressLines,
  paginate,
  MAX_ROWS,
} from '../src/lib/labels.js';

const HEADER = 'nama_penerima,no_hp,alamat,kelurahan,kecamatan,kota_kabupaten,provinsi,kode_pos,catatan';
const ROW = 'Budi Santoso,0812-3456-7890,Jl. Melati No. 10,Sukamaju,Cibeunying,Kota Bandung,Jawa Barat,40123,Jangan dibanting';

const VALID = {
  nama_penerima: 'Budi Santoso',
  no_hp: '081234567890',
  alamat: 'Jl. Melati No. 10',
  kelurahan: 'Sukamaju',
  kecamatan: 'Cibeunying',
  kota_kabupaten: 'Kota Bandung',
  provinsi: 'Jawa Barat',
  kode_pos: '40123',
  catatan: 'Jangan dibanting',
};

/** @param {string} text */
function imported(text) {
  const out = importLabelCsv(text);
  if (!out.ok) throw new Error(`unexpected failure: ${out.message}`);
  return out;
}

/** @param {ReturnType<typeof validateRecipient>} out */
const fields = (out) => (out.ok ? [] : out.errors.map((e) => e.field));

describe('cleanText / normalizePhone / normalizeHeader', () => {
  it('trims and collapses whitespace, drops control characters', () => {
    expect(cleanText('  Jl.  Mawar\n\tNo. 5 \u0000')).toBe('Jl. Mawar No. 5');
    expect(cleanText(undefined)).toBe('');
    expect(cleanText(42)).toBe('');
  });

  it('removes phone separators', () => {
    expect(normalizePhone(' +62 812-3456.7890 ')).toBe('+6281234567890');
    expect(normalizePhone('(0812) 3456 7890')).toBe('081234567890');
  });

  it('normalizes headers case-insensitively', () => {
    expect(normalizeHeader('  Nama Penerima ')).toBe('nama_penerima');
    expect(normalizeHeader('KOTA-KABUPATEN')).toBe('kota_kabupaten');
  });
});

describe('validateRecipient', () => {
  it('accepts a complete recipient', () => {
    expect(validateRecipient(VALID)).toEqual({ ok: true, recipient: VALID });
  });

  it('kelurahan, kode_pos, and catatan are optional', () => {
    const out = validateRecipient({ ...VALID, kelurahan: '', kode_pos: '  ', catatan: undefined });
    expect(out.ok).toBe(true);
  });

  it('reports every missing required field', () => {
    expect(fields(validateRecipient({}))).toEqual(['nama_penerima', 'no_hp', 'alamat', 'kecamatan', 'kota_kabupaten', 'provinsi']);
  });

  it.each(['081234567', '6281234567890', '+6281234567890', '0812 3456 7890', '0812.3456.7890'])('accepts phone %s', (no_hp) => {
    expect(validateRecipient({ ...VALID, no_hp }).ok).toBe(true);
  });

  it.each(['12345', '0212345678', '0812345', '08123456789012345', '+1 812 3456 7890', '0812abc4567', '62 21 1234567'])(
    'rejects phone %s',
    (no_hp) => {
      expect(fields(validateRecipient({ ...VALID, no_hp }))).toEqual(['no_hp']);
    },
  );

  it.each(['4012', '401234', 'ABCDE', '40 12'])('rejects postal code %s', (kode_pos) => {
    expect(fields(validateRecipient({ ...VALID, kode_pos }))).toEqual(['kode_pos']);
  });

  it('enforces maximum lengths', () => {
    expect(fields(validateRecipient({ ...VALID, alamat: 'x'.repeat(301) }))).toEqual(['alamat']);
    expect(validateRecipient({ ...VALID, alamat: 'x'.repeat(300) }).ok).toBe(true);
  });

  it('keeps HTML-like text as plain text, unmodified', () => {
    const out = validateRecipient({ ...VALID, nama_penerima: '<img src=x onerror=alert(1)>', catatan: '<script>alert(1)</script>' });
    expect(out.ok).toBe(true);
    if (out.ok) {
      expect(out.recipient.nama_penerima).toBe('<img src=x onerror=alert(1)>');
      expect(out.recipient.catatan).toBe('<script>alert(1)</script>');
    }
  });

  it('errors use Indonesian field names', () => {
    const out = validateRecipient({ ...VALID, kecamatan: '' });
    expect(out.ok ? '' : out.errors[0].message).toBe('Kecamatan wajib diisi.');
  });
});

describe('importLabelCsv', () => {
  it('imports a valid file', () => {
    const out = imported(`${HEADER}\n${ROW}\n`);
    expect(out.total).toBe(1);
    expect(out.invalid).toEqual([]);
    expect(out.recipients).toEqual([{ ...VALID, row: 2 }]);
    expect(out.delimiter).toBe(',');
  });

  it('imports semicolon files with a BOM and CRLF (Excel export)', () => {
    const out = imported(`﻿${HEADER.replaceAll(',', ';')}\r\n${ROW.replaceAll(',', ';')}\r\n`);
    expect(out.recipients).toHaveLength(1);
    expect(out.delimiter).toBe(';');
  });

  it('accepts headers in any case and order, with only required columns', () => {
    const out = imported('PROVINSI, Kota_Kabupaten ,kecamatan,alamat,No_HP,Nama_Penerima\nBali,Kota Denpasar,Denpasar Barat,Jl. Kenanga 3,081299998888,Ketut');
    expect(out.recipients[0]).toMatchObject({ nama_penerima: 'Ketut', provinsi: 'Bali', kelurahan: '', kode_pos: '' });
  });

  it('handles quoted fields containing commas', () => {
    const out = imported(`${HEADER}\nAni,081234567890,"Jl. Kenari No. 7, RT 03/RW 05",,Coblong,Kota Bandung,Jawa Barat,,`);
    expect(out.recipients[0].alamat).toBe('Jl. Kenari No. 7, RT 03/RW 05');
  });

  it('handles Unicode names and addresses', () => {
    const out = imported(`${HEADER}\nSiti Ñurhaliza 🙂,081234567890,Jl. Café Ünïcode,,Kec. Ubud,Kab. Gianyar,Bali,,`);
    expect(out.recipients[0].nama_penerima).toBe('Siti Ñurhaliza 🙂');
  });

  it('reports invalid rows with row number and field, keeping valid rows', () => {
    const out = imported(`${HEADER}\n${ROW}\nTanpa HP,,Jl. A,,Kec,Kota,Prov,123,\n${ROW}`);
    expect(out.total).toBe(3);
    expect(out.recipients.map((r) => r.row)).toEqual([2, 4]);
    expect(out.invalid).toEqual([
      {
        row: 3,
        errors: [
          { field: 'no_hp', message: 'No. HP wajib diisi.' },
          { field: 'kode_pos', message: 'Kode pos harus 5 digit angka.' },
        ],
      },
    ]);
  });

  it('flags rows with more cells than headers (unquoted comma)', () => {
    const out = imported(`${HEADER}\nAni,081234567890,Jl. Kenari No. 7, RT 03,,Coblong,Kota Bandung,Jawa Barat,,`);
    expect(out.recipients).toEqual([]);
    expect(out.invalid[0].row).toBe(2);
    expect(out.invalid[0].errors[0].message).toMatch(/tanda kutip/);
  });

  it('treats short rows as missing values', () => {
    const out = imported(`${HEADER}\nAni,081234567890`);
    expect(out.invalid[0].errors.map((e) => e.field)).toEqual(['alamat', 'kecamatan', 'kota_kabupaten', 'provinsi']);
  });

  it('skips blank lines but keeps spreadsheet row numbers', () => {
    const out = imported(`\n${HEADER}\n\n${ROW}\n,,,,,,,,\n`);
    expect(out.total).toBe(1);
    expect(out.recipients[0].row).toBe(4);
  });

  it('lists unknown columns as ignored', () => {
    const out = imported(`${HEADER},berat\n${ROW},1kg`);
    expect(out.ignoredColumns).toEqual(['berat']);
    expect(out.recipients[0]).not.toHaveProperty('berat');
  });

  it('keeps HTML-like CSV content as plain text', () => {
    const out = imported(`${HEADER}\n"<b onmouseover=alert(1)>Budi</b>",081234567890,<script>x</script>,,Kec,Kota,Prov,,`);
    expect(out.recipients[0].nama_penerima).toBe('<b onmouseover=alert(1)>Budi</b>');
    expect(out.recipients[0].alamat).toBe('<script>x</script>');
  });

  describe('file-level failures', () => {
    it.each(['', '﻿', '\n\n', ' , \n'])('empty file %j', (text) => {
      expect(importLabelCsv(text)).toMatchObject({ ok: false, code: 'empty' });
    });

    it('header without data', () => {
      expect(importLabelCsv(`${HEADER}\n`)).toMatchObject({ ok: false, code: 'empty' });
    });

    it('missing required columns', () => {
      expect(importLabelCsv('nama_penerima,alamat\nA,B')).toEqual({
        ok: false,
        code: 'missing-columns',
        message: 'Kolom wajib tidak ditemukan: no_hp, kecamatan, kota_kabupaten, provinsi.',
        columns: ['no_hp', 'kecamatan', 'kota_kabupaten', 'provinsi'],
      });
    });

    it('duplicate columns', () => {
      expect(importLabelCsv(`${HEADER},No HP\n${ROW},0811`)).toMatchObject({ ok: false, code: 'duplicate-columns', columns: ['no_hp'] });
    });

    it('unterminated quote', () => {
      expect(importLabelCsv(`${HEADER}\n"Budi,0812`)).toMatchObject({ ok: false, code: 'unterminated-quote' });
    });

    it(`more than ${MAX_ROWS} rows`, () => {
      const body = Array.from({ length: MAX_ROWS + 1 }, () => ROW).join('\n');
      expect(importLabelCsv(`${HEADER}\n${body}`)).toMatchObject({ ok: false, code: 'too-many-rows' });
      expect(imported(`${HEADER}\n${body.slice(0, body.lastIndexOf('\n'))}`).recipients).toHaveLength(MAX_ROWS);
    });
  });
});

describe('sender', () => {
  const SENDER = { nama: 'Toko Contoh', no_hp: '081200001111', alamat: '', nama_toko: '' };

  it('requires name and phone; address and shop name are optional', () => {
    expect(validateSender({ nama: ' Toko Contoh ', no_hp: '0812-0000-1111' })).toEqual({ ok: true, sender: SENDER });
    const out = validateSender({});
    expect(out.ok ? [] : out.errors.map((e) => e.field)).toEqual(['nama', 'no_hp']);
  });

  it('round-trips through storage', () => {
    expect(parseStoredSender(serializeSender(SENDER))).toEqual(SENDER);
  });

  it.each([
    null,
    '',
    'not json',
    '{}',
    '{"v":2,"sender":{"nama":"A","no_hp":"081200001111"}}',
    '{"v":1,"sender":null}',
    '{"v":1,"sender":{"nama":"A","no_hp":"123"}}',
    '[1,2]',
  ])('rejects stored value %j', (raw) => {
    expect(parseStoredSender(raw)).toBeNull();
  });

  it('drops unknown stored properties', () => {
    const raw = JSON.stringify({ v: 1, sender: { ...SENDER, evil: '<script>' } });
    expect(parseStoredSender(raw)).toEqual(SENDER);
  });
});

describe('addressLines', () => {
  it('formats a full address', () => {
    expect(addressLines(VALID)).toEqual(['Jl. Melati No. 10', 'Kel. Sukamaju, Kec. Cibeunying', 'Kota Bandung, Jawa Barat 40123']);
  });

  it('omits optional parts and avoids double prefixes', () => {
    expect(addressLines({ ...VALID, kelurahan: '', kode_pos: '' })).toEqual(['Jl. Melati No. 10', 'Kec. Cibeunying', 'Kota Bandung, Jawa Barat']);
    expect(addressLines({ ...VALID, kelurahan: 'Desa Mekar', kecamatan: 'Kecamatan Lembang' })[1]).toBe('Desa Mekar, Kecamatan Lembang');
    expect(addressLines({ ...VALID, kelurahan: 'kel. Sukamaju', kecamatan: 'Kec. Cibeunying' })[1]).toBe('kel. Sukamaju, Kec. Cibeunying');
  });

  it('does not treat a name that merely starts with the prefix letters as prefixed', () => {
    expect(addressLines({ ...VALID, kelurahan: 'Kelapa Gading', kecamatan: 'Kecapi' })[1]).toBe('Kel. Kelapa Gading, Kec. Kecapi');
  });
});

describe('paginate', () => {
  it('splits into pages', () => {
    expect(paginate([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
    expect(paginate([], 4)).toEqual([]);
    expect(paginate([1, 2], 0)).toEqual([[1], [2]]);
  });
});

describe('sample CSV (public/downloads/contoh-label.csv)', () => {
  it('imports without errors', async () => {
    const { readFile } = await import('node:fs/promises');
    const text = await readFile(new URL('../public/downloads/contoh-label.csv', import.meta.url), 'utf8');
    const out = imported(text);
    expect(out.invalid).toEqual([]);
    expect(out.ignoredColumns).toEqual([]);
    expect(out.recipients).toHaveLength(3);
  });
});
