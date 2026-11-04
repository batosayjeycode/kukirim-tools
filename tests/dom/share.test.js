// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { loadPage, builtPageExists, $, text, type, tick } from './load-page.js';

const CALC = 'kalkulator-keuntungan';
const TEMPLATE = 'template-pembukuan-online-shop';
const CANONICAL = 'https://tools.kukirim.com/kalkulator-keuntungan/';

/** @param {string} root share block selector */
const link = (root, platform) => /** @type {HTMLAnchorElement} */ ($(`${root} a[data-share-to="${platform}"]`));
const param = (href, name) => new URL(href).searchParams.get(name);

/** Record kukirim:share events until the returned function is called. */
function recordEvents() {
  /** @type {{ name: string, props: Record<string, string> }[]} */
  const events = [];
  const listener = (/** @type {Event} */ e) => events.push(/** @type {CustomEvent} */ (e).detail);
  window.addEventListener('kukirim:share', listener);
  return { events, stop: () => window.removeEventListener('kukirim:share', listener) };
}

/** @param {string} name @param {unknown} value */
function stubNavigator(name, value) {
  Object.defineProperty(navigator, name, { value, configurable: true, writable: true });
}

afterEach(() => {
  // @ts-ignore cleanup of test stubs
  delete navigator.share;
  // @ts-ignore
  delete navigator.canShare;
  vi.restoreAllMocks();
  history.replaceState(null, '', '/');
});

describe.skipIf(!builtPageExists(CALC))('share: calculator result', () => {
  beforeEach(async () => {
    history.replaceState(null, '', '/kalkulator-keuntungan/');
    await loadPage(CALC, () => import('../../src/scripts/profit-calculator.js'));
  });

  it('renders build-time platform links to the canonical page, in the planned order', () => {
    const order = [...document.querySelectorAll('#share a[data-share-to]')].map((a) => /** @type {HTMLElement} */ (a).dataset.shareTo);
    expect(order).toEqual(['whatsapp', 'telegram', 'facebook', 'x']);
    expect(param(link('#share', 'facebook').href, 'u')).toBe(CANONICAL);
    expect(link('#share', 'x').rel).toBe('noopener noreferrer');
    expect(link('#share', 'x').target).toBe('_blank');
  });

  it('shares a summary of the result plus a link that reproduces it', () => {
    $('#profit-example').click();
    const wa = param(link('#profit-share-box', 'whatsapp').href, 'text')?.replace(/\s/g, ' ');
    expect(wa).toContain('Estimasi saya di Kalkulator Keuntungan Kukirim: laba bersih Rp 17.800 per unit, margin 19,8%');
    const shared = param(link('#profit-share-box', 'telegram').href, 'url') ?? '';
    expect(shared.startsWith(`${CANONICAL}#`)).toBe(true);
    expect(shared).toContain('price=100.000');
    expect(new URL(shared).search).toBe('');
  });

  it('shares only the canonical URL when the inputs checkbox is cleared', () => {
    $('#profit-example').click();
    const box = /** @type {HTMLInputElement} */ ($('#profit-share-inputs'));
    box.checked = false;
    box.dispatchEvent(new Event('change', { bubbles: true }));
    expect(param(link('#profit-share-box', 'x').href, 'url')).toBe(CANONICAL);
    expect(param(link('#profit-share-box', 'x').href, 'text')).toContain('laba bersih'); // summary is still shared
  });

  it('copies the result link and reports events without values', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    stubNavigator('clipboard', { writeText });
    const { events, stop } = recordEvents();
    type('#price', '50.000');
    type('#cost', '30.000');
    $('#profit-share').click();
    await tick();
    stop();
    expect(writeText).toHaveBeenCalledWith(expect.stringMatching(/^https:\/\/tools\.kukirim\.com\/kalkulator-keuntungan\/#.*price=50\.000/));
    expect(text($('#profit-share-status'))).toContain('Tautan disalin');
    expect(events.map((e) => e.name)).toEqual(['share_click', 'share_copy_link', 'share_result']);
    for (const e of events) {
      expect(e.props.page_path).toBe('/kalkulator-keuntungan/');
      expect(JSON.stringify(e.props)).not.toMatch(/50\.000|30\.000|price/);
    }
  });

  it('shows the link for manual copying when the clipboard is unavailable', async () => {
    stubNavigator('clipboard', { writeText: vi.fn().mockRejectedValue(new Error('denied')) });
    document.execCommand = () => false;
    $('#share [data-share-copy]').click();
    await tick();
    expect(text($('#share [data-share-status]'))).toBe(`Tidak bisa menyalin otomatis. Salin tautan ini: ${CANONICAL}`);
  });

  it('tracks platform link clicks', () => {
    const { events, stop } = recordEvents();
    link('#share', 'whatsapp').addEventListener('click', (e) => e.preventDefault());
    link('#share', 'whatsapp').click();
    stop();
    expect(events.map((e) => e.name)).toEqual(['share_click', 'share_whatsapp']);
    expect(events[0].props).toMatchObject({ page_type: 'tool', tool_name: 'kalkulator-keuntungan', content_type: 'page' });
  });
});

describe.skipIf(!builtPageExists(TEMPLATE))('share: native Web Share API', () => {
  it('keeps the native button hidden and the copy button visible without support', async () => {
    await loadPage(TEMPLATE, () => import('../../src/scripts/share.js'));
    expect($('#share [data-share-native]').hidden).toBe(true);
    expect($('#share [data-share-copy]').hidden).toBe(false);
    expect($('#share').dataset.pageType).toBe('template');
  });

  it('uses navigator.share when available and reports success', async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    stubNavigator('share', share);
    await loadPage(TEMPLATE, () => import('../../src/scripts/share.js'));
    const { events, stop } = recordEvents();
    const button = $('#share [data-share-native]');
    expect(button.hidden).toBe(false);
    button.click();
    await tick();
    stop();
    expect(share).toHaveBeenCalledWith({
      title: 'Template Pembukuan Online Shop',
      text: expect.stringContaining('Template pembukuan online shop gratis'),
      url: 'https://tools.kukirim.com/template-pembukuan-online-shop/',
    });
    expect(events.map((e) => e.name)).toEqual(['share_click', 'share_success']);
  });

  it('stays silent when the user cancels the share sheet', async () => {
    stubNavigator('share', vi.fn().mockRejectedValue(Object.assign(new Error('cancel'), { name: 'AbortError' })));
    await loadPage(TEMPLATE, () => import('../../src/scripts/share.js'));
    $('#share [data-share-native]').click();
    await tick();
    expect(text($('#share [data-share-status]'))).toBe('');
  });
});
