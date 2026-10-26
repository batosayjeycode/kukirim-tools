import { describe, it, expect } from 'vitest';
import { parseCsv, detectDelimiter } from '../src/lib/csv.js';

/** @param {string} text */
function records(text, options) {
  const out = parseCsv(text, options);
  if (!out.ok) throw new Error(`unexpected error: ${JSON.stringify(out)}`);
  return out.records;
}

describe('detectDelimiter', () => {
  it('defaults to comma', () => {
    expect(detectDelimiter('')).toBe(',');
    expect(detectDelimiter('a')).toBe(',');
    expect(detectDelimiter('a,b')).toBe(',');
  });

  it('picks semicolon when it dominates the first line', () => {
    expect(detectDelimiter('a;b;c\n1,2;3;4')).toBe(';');
  });

  it('ignores delimiters inside quotes and on later lines', () => {
    expect(detectDelimiter('"a,b,c";d;e')).toBe(';');
    expect(detectDelimiter('a;b\n1,2,3,4,5')).toBe(';');
  });
});

describe('parseCsv', () => {
  it('parses simple records', () => {
    expect(records('a,b,c\n1,2,3')).toEqual([['a', 'b', 'c'], ['1', '2', '3']]);
  });

  it('handles CRLF, CR, and a trailing newline', () => {
    expect(records('a,b\r\n1,2\r\n')).toEqual([['a', 'b'], ['1', '2']]);
    expect(records('a,b\r1,2')).toEqual([['a', 'b'], ['1', '2']]);
  });

  it('strips a UTF-8 BOM', () => {
    expect(records('﻿nama,no_hp\nA,1')[0]).toEqual(['nama', 'no_hp']);
  });

  it('parses semicolon files', () => {
    const out = parseCsv('a;b\n"x;y";2');
    expect(out).toEqual({ ok: true, records: [['a', 'b'], ['x;y', '2']], delimiter: ';' });
  });

  it('supports quoted fields with commas, escaped quotes, and newlines', () => {
    expect(records('alamat,catatan\n"Jl. Mawar No. 5, RT 01/RW 02","Titip ""satpam"""\n"baris 1\nbaris 2",x')).toEqual([
      ['alamat', 'catatan'],
      ['Jl. Mawar No. 5, RT 01/RW 02', 'Titip "satpam"'],
      ['baris 1\nbaris 2', 'x'],
    ]);
  });

  it('keeps empty fields', () => {
    expect(records('a,,c\n,,')).toEqual([['a', '', 'c'], ['', '', '']]);
  });

  it('keeps blank lines as records so row numbers stay aligned', () => {
    expect(records('a\n\nb')).toEqual([['a'], [''], ['b']]);
  });

  it('keeps Unicode text intact', () => {
    expect(records('nama\nSiti Nurhaliza Ñoño 李雷 🙂')[1]).toEqual(['Siti Nurhaliza Ñoño 李雷 🙂']);
  });

  it('keeps a stray quote inside an unquoted field', () => {
    expect(records('a,b\n12" TV,2')[1]).toEqual(['12" TV', '2']);
  });

  it('reports an unterminated quote with its row', () => {
    expect(parseCsv('a,b\n1,2\n"open,3')).toEqual({ ok: false, error: 'unterminated-quote', row: 3 });
  });

  it('returns no records for empty text', () => {
    expect(records('')).toEqual([]);
  });

  it('honours an explicit delimiter', () => {
    expect(records('a;b,c', { delimiter: ',' })).toEqual([['a;b', 'c']]);
  });
});
