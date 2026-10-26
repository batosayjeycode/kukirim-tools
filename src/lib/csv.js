/**
 * Minimal RFC 4180-style CSV parser (PLAN.md §0.3). Pure functions only.
 *
 * - Delimiter `,` or `;`, auto-detected from the header line.
 * - UTF-8 BOM stripped.
 * - Quoted fields may contain delimiters, newlines, and `""` escaped quotes.
 * - Line endings: \r\n, \n, or \r.
 */

/** @typedef {',' | ';'} Delimiter */

/**
 * Pick `,` or `;` by counting occurrences outside quotes on the first line.
 * Ties (including neither) default to `,`.
 *
 * @param {string} text
 * @returns {Delimiter}
 */
export function detectDelimiter(text) {
  let commas = 0;
  let semicolons = 0;
  let inQuotes = false;
  for (const ch of text) {
    if (ch === '"') inQuotes = !inQuotes;
    else if (!inQuotes && (ch === '\n' || ch === '\r')) break;
    else if (!inQuotes && ch === ',') commas++;
    else if (!inQuotes && ch === ';') semicolons++;
  }
  return semicolons > commas ? ';' : ',';
}

/**
 * Parse CSV text into records of raw string fields.
 * Records keep their position (blank lines become `['']`) so record index + 1
 * matches the row number a spreadsheet shows.
 *
 * @param {string} text
 * @param {{ delimiter?: Delimiter }} [options]
 * @returns {{ ok: true, records: string[][], delimiter: Delimiter }
 *         | { ok: false, error: 'unterminated-quote', row: number }}
 */
export function parseCsv(text, options = {}) {
  const input = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
  const delimiter = options.delimiter ?? detectDelimiter(input);

  /** @type {string[][]} */
  const records = [];
  /** @type {string[]} */
  let record = [];
  let field = '';
  let inQuotes = false;
  let i = 0;

  const endField = () => {
    record.push(field);
    field = '';
  };
  const endRecord = () => {
    endField();
    records.push(record);
    record = [];
  };

  while (i < input.length) {
    const ch = input[i];
    if (inQuotes) {
      if (ch === '"') {
        if (input[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
      } else {
        field += ch;
      }
      i++;
      continue;
    }

    if (ch === '"' && field === '') {
      inQuotes = true;
    } else if (ch === delimiter) {
      endField();
    } else if (ch === '\r' || ch === '\n') {
      endRecord();
      if (ch === '\r' && input[i + 1] === '\n') i++;
    } else {
      // A quote inside an unquoted field is kept literally.
      field += ch;
    }
    i++;
  }

  if (inQuotes) return { ok: false, error: 'unterminated-quote', row: records.length + 1 };

  // Final record unless the text ended with a newline.
  if (field !== '' || record.length > 0) endRecord();

  return { ok: true, records, delimiter };
}
