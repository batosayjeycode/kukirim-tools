/**
 * Browser glue for <Share> blocks ([data-share]). Link building and validation live in
 * src/lib/share.js. Nothing is sent anywhere: analytics are only announced as a local
 * `kukirim:share` DOM event (no analytics service is installed; see /privasi/).
 */
import { buildShareLinks, cleanShareUrl, shareEvents } from '../lib/share.js';

/** @typedef {'native' | 'copy' | 'whatsapp' | 'telegram' | 'facebook' | 'x'} Method */

/** @param {HTMLElement} root */
function shareData(root) {
  const { title = '', text = '', url = '' } = root.dataset;
  return { title, text, url };
}

/**
 * @param {HTMLElement} root
 * @param {Method} method
 * @param {'click' | 'done'} stage
 */
function track(root, method, stage) {
  const { pageType, toolName, contentType } = root.dataset;
  for (const detail of shareEvents(method, stage, { pageType, toolName, contentType, pagePath: location.pathname })) {
    window.dispatchEvent(new CustomEvent('kukirim:share', { detail }));
  }
}

/** @param {HTMLElement} root @param {string} message */
function announce(root, message) {
  const status = root.querySelector('[data-share-status]');
  if (status) status.textContent = message;
}

/** @param {HTMLElement} root */
function refreshLinks(root) {
  const links = buildShareLinks(shareData(root));
  for (const a of root.querySelectorAll('a[data-share-to]')) {
    const href = links?.[/** @type {keyof NonNullable<typeof links>} */ (/** @type {HTMLElement} */ (a).dataset.shareTo)];
    if (href) a.setAttribute('href', href);
  }
}

/**
 * Update what a share block shares (e.g. a calculation result). `url` is validated; an invalid
 * URL leaves the block unchanged.
 * @param {HTMLElement} root
 * @param {{ text?: string, url?: string, keepHash?: boolean }} data
 */
export function setShareData(root, { text, url, keepHash = false }) {
  if (url !== undefined) {
    const clean = cleanShareUrl(url, { keepHash });
    if (!clean) return;
    root.dataset.url = clean;
  }
  if (text !== undefined) root.dataset.text = text;
  refreshLinks(root);
}

/** @param {string} value */
async function copyText(value) {
  try {
    await navigator.clipboard.writeText(value);
    return true;
  } catch {
    // Older browsers or no clipboard permission: fall back to a temporary selection.
    const area = document.createElement('textarea');
    area.value = value;
    area.setAttribute('readonly', '');
    area.style.position = 'fixed';
    area.style.opacity = '0';
    document.body.append(area);
    area.select();
    let ok = false;
    try {
      ok = document.execCommand('copy');
    } catch {
      ok = false;
    }
    area.remove();
    return ok;
  }
}

/** @param {HTMLElement} root */
function init(root) {
  if (root.dataset.shareReady) return;
  root.dataset.shareReady = 'true';

  const nativeButton = /** @type {HTMLButtonElement | null} */ (root.querySelector('[data-share-native]'));
  const copyButton = /** @type {HTMLButtonElement | null} */ (root.querySelector('[data-share-copy]'));

  if (nativeButton && typeof navigator.share === 'function') {
    nativeButton.hidden = false;
    nativeButton.addEventListener('click', async () => {
      const data = shareData(root);
      track(root, 'native', 'click');
      if (typeof navigator.canShare === 'function' && !navigator.canShare(data)) {
        announce(root, 'Perangkat ini tidak bisa membagikan halaman ini. Gunakan tombol lain di bawah.');
        return;
      }
      try {
        await navigator.share(data);
        track(root, 'native', 'done');
      } catch (error) {
        // AbortError: the user closed the share sheet; nothing to report.
        if (!(error instanceof Error && error.name === 'AbortError')) {
          announce(root, 'Gagal membuka menu bagikan. Gunakan tombol lain di bawah.');
        }
      }
    });
  }

  if (copyButton) {
    copyButton.hidden = false;
    copyButton.addEventListener('click', async () => {
      const { url } = shareData(root);
      track(root, 'copy', 'click');
      if (await copyText(url)) {
        announce(root, 'Tautan disalin. Tempel di chat atau media sosial untuk membagikannya.');
        track(root, 'copy', 'done');
      } else {
        announce(root, `Tidak bisa menyalin otomatis. Salin tautan ini: ${url}`);
      }
    });
  }

  for (const a of root.querySelectorAll('a[data-share-to]')) {
    a.addEventListener('click', () => {
      const method = /** @type {Method} */ (/** @type {HTMLElement} */ (a).dataset.shareTo);
      track(root, method, 'click');
      track(root, method, 'done');
    });
  }
}

for (const root of document.querySelectorAll('[data-share]')) init(/** @type {HTMLElement} */ (root));
