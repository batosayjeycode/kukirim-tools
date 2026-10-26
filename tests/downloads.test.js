import { describe, it, expect } from 'vitest';
import { formatFileSize, getDownload } from '../src/lib/downloads.js';

describe('formatFileSize', () => {
  it.each([
    [0, '1 KB'],
    [500, '1 KB'],
    [27037, '27 KB'],
    [1024 * 1024, '1,0 MB'],
    [1.25 * 1024 * 1024, '1,3 MB'],
  ])('%d bytes → %s', (bytes, expected) => {
    expect(formatFileSize(bytes)).toBe(expected);
  });
});

describe('getDownload', () => {
  it.each(['template-pembukuan-online-shop.xlsx', 'template-manajemen-order.xlsx', 'contoh-label.csv'])(
    'finds committed download %s',
    (name) => {
      expect(getDownload(name)).toMatchObject({ href: `/downloads/${name}`, size: expect.stringMatching(/ KB$/) });
    },
  );

  it('returns null for missing files', () => {
    expect(getDownload('tidak-ada.xlsx')).toBeNull();
  });

  it('rejects path traversal', () => {
    expect(getDownload('../package.json')).toBeNull();
    expect(getDownload('sub/file.xlsx')).toBeNull();
  });
});
