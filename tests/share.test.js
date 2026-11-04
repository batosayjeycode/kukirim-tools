import { describe, it, expect } from 'vitest';
import {
  SHARE_PLATFORMS,
  buildShareLinks,
  cleanShareUrl,
  decodeShareState,
  encodeShareState,
  profitShareText,
  shareEvents,
} from '../src/lib/share.js';
import { calculateProfit } from '../src/lib/profit.js';

describe('shareable calculator links', () => {
  it('round-trips form values and drops empty ones', () => {
    const values = { price: '100.000', cost: '60.000', discountType: 'percent', discountFunder: 'seller', feePct: '8', other: '', qty: '2' };
    const hash = encodeShareState(values);
    expect(hash).not.toContain('other');
    expect(decodeShareState(`#${hash}`)).toEqual({ price: '100.000', cost: '60.000', discountType: 'percent', discountFunder: 'seller', feePct: '8', qty: '2' });
  });

  it('ignores unknown keys, invalid choices and non-numeric text', () => {
    expect(
      decodeShareState('#price=<img src=x>&feeBase=other&evil=1&cost=Rp%2050.000&qty=2&feePct=' + '9'.repeat(40)),
    ).toEqual({ cost: 'Rp 50.000', qty: '2' });
  });

  it('never encodes values that would be rejected on load', () => {
    expect(encodeShareState({ price: 'javascript:alert(1)', discountType: 'bogus', cost: '5' })).toBe('cost=5');
  });
});

describe('cleanShareUrl', () => {
  it('keeps https URLs and strips query strings (tracking parameters)', () => {
    expect(cleanShareUrl('https://tools.kukirim.com/kalkulator-keuntungan/?utm_source=x&fbclid=1')).toBe(
      'https://tools.kukirim.com/kalkulator-keuntungan/',
    );
  });

  it('drops the fragment unless asked to keep it', () => {
    const url = 'https://tools.kukirim.com/kalkulator-keuntungan/#price=1';
    expect(cleanShareUrl(url)).toBe('https://tools.kukirim.com/kalkulator-keuntungan/');
    expect(cleanShareUrl(url, { keepHash: true })).toBe(url);
    expect(cleanShareUrl(`https://tools.kukirim.com/#${'a'.repeat(2000)}`, { keepHash: true })).toBe('https://tools.kukirim.com/');
  });

  it('rejects non-https, relative, credentialed and malformed URLs', () => {
    for (const bad of ['http://tools.kukirim.com/', 'javascript:alert(1)', '/kalkulator-keuntungan/', 'https://a:b@kukirim.com/', 'not a url', '']) {
      expect(cleanShareUrl(bad)).toBeNull();
    }
  });
});

describe('buildShareLinks', () => {
  const url = 'https://tools.kukirim.com/kalkulator-keuntungan/#price=100.000&cost=60.000';
  const text = 'Laba Rp 17.800 & margin 19,8%: coba?';

  it('builds the official intent URL for every platform, in order', () => {
    const links = buildShareLinks({ text, url });
    expect(Object.keys(links ?? {})).toEqual(SHARE_PLATFORMS.map((p) => p.id));
    expect(links?.whatsapp.startsWith('https://wa.me/?text=')).toBe(true);
    expect(links?.telegram.startsWith('https://t.me/share/url?url=')).toBe(true);
    expect(links?.facebook.startsWith('https://www.facebook.com/sharer/sharer.php?u=')).toBe(true);
    expect(links?.x.startsWith('https://twitter.com/intent/tweet?url=')).toBe(true);
  });

  it('encodes text and URL so they round-trip exactly (incl. #, &, %)', () => {
    const links = /** @type {NonNullable<ReturnType<typeof buildShareLinks>>} */ (buildShareLinks({ text, url }));
    expect(new URL(links.whatsapp).searchParams.get('text')).toBe(`${text} ${url}`);
    expect(Object.fromEntries(new URL(links.telegram).searchParams)).toEqual({ url, text });
    expect(Object.fromEntries(new URL(links.facebook).searchParams)).toEqual({ u: url });
    expect(Object.fromEntries(new URL(links.x).searchParams)).toEqual({ url, text });
    for (const href of Object.values(links)) expect(new URL(href).hash).toBe('');
  });

  it('omits empty text', () => {
    const links = buildShareLinks({ text: '  ', url: 'https://kukirim.com/' });
    expect(new URL(links?.whatsapp ?? '').searchParams.get('text')).toBe('https://kukirim.com/');
    expect(new URL(links?.telegram ?? '').searchParams.has('text')).toBe(false);
  });

  it('refuses URLs that are not clean https URLs', () => {
    expect(buildShareLinks({ url: 'javascript:alert(1)' })).toBeNull();
    expect(buildShareLinks({ url: 'http://kukirim.com/' })).toBeNull();
    expect(buildShareLinks({ url: 'https://kukirim.com/?utm_source=x' })).toBeNull();
  });
});

describe('profitShareText', () => {
  it('summarises the result as an estimate without raw inputs', () => {
    const outcome = calculateProfit({
      price: '100.000', cost: '60.000', discount: { value: '10', type: 'percent', funder: 'seller' },
      feePct: '8', feeBase: 'revenue', feeFixed: '1.000', shipping: '5.000', packaging: '2.000', other: '1.000', qty: '2',
    });
    if (!outcome.ok) throw new Error('expected ok');
    const text = profitShareText(outcome.result).replace(/\s/g, ' ');
    expect(text).toBe(
      'Estimasi saya di Kalkulator Keuntungan Kukirim: laba bersih Rp 17.800 per unit, margin 19,8%, harga impas Rp 78.503. Coba hitung sendiri:',
    );
    expect(text).not.toContain('60.000'); // HPP is not in the message
  });

  it('leaves out the break-even price when none exists', () => {
    const outcome = calculateProfit({ price: '100', cost: '50', feePct: '100' });
    if (!outcome.ok) throw new Error('expected ok');
    expect(profitShareText(outcome.result)).not.toContain('impas');
  });
});

describe('shareEvents', () => {
  const ctx = { pageType: 'tool', pagePath: '/kalkulator-keuntungan/?price=1#cost=2', toolName: 'kalkulator-keuntungan', contentType: 'result' };

  it('reports a click, then the method-specific event and share_result for results', () => {
    expect(shareEvents('whatsapp', 'click', ctx).map((e) => e.name)).toEqual(['share_click']);
    expect(shareEvents('whatsapp', 'done', ctx).map((e) => e.name)).toEqual(['share_whatsapp', 'share_result']);
    expect(shareEvents('native', 'done', ctx).map((e) => e.name)).toEqual(['share_success', 'share_result']);
    expect(shareEvents('copy', 'done', { ...ctx, contentType: 'page' }).map((e) => e.name)).toEqual(['share_copy_link']);
  });

  it('never includes query strings, fragments or values in properties', () => {
    const [event] = shareEvents('x', 'done', ctx);
    expect(event.props).toEqual({
      page_type: 'tool',
      page_path: '/kalkulator-keuntungan/',
      tool_name: 'kalkulator-keuntungan',
      share_method: 'x',
      content_type: 'result',
    });
  });
});
