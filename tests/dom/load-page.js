/**
 * Helpers for DOM smoke tests: load a built page from dist/ into the
 * happy-dom document and run its page script fresh.
 *
 * These tests need `npm run build` first (`npm run verify` does this);
 * they are skipped when dist/ is missing.
 */
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { vi } from 'vitest';

// Node paths, not URL objects: happy-dom replaces the global URL.
export const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const pagePath = (/** @type {string} */ route) => join(ROOT, 'dist', route, 'index.html');

/** @param {string} route e.g. "kalkulator-keuntungan" */
export function builtPageExists(route) {
  return existsSync(pagePath(route));
}

/**
 * Replace the document body with the built page's body (scripts stripped),
 * then import the page script so it initialises against that markup.
 * @param {string} route
 * @param {() => Promise<unknown>} importScript
 */
export async function loadPage(route, importScript) {
  const html = readFileSync(pagePath(route), 'utf8');
  const body = html.match(/<body[^>]*>([\s\S]*)<\/body>/)?.[1] ?? '';
  document.body.innerHTML = body.replace(/<script\b[\s\S]*?<\/script>/g, '');
  vi.resetModules();
  await importScript();
}

/** Collapse whitespace (incl. the non-breaking space Intl puts after "Rp"). */
export const text = (/** @type {Element | null} */ el) => (el?.textContent ?? '').replace(/\s+/g, ' ').trim();

/** @param {string} selector */
export const $ = (selector) => /** @type {HTMLElement} */ (document.querySelector(selector));

/** Set an input's value and fire input + change, like a user edit. */
export function type(selector, value) {
  const el = /** @type {HTMLInputElement} */ ($(selector));
  el.value = value;
  el.dispatchEvent(new Event('input', { bubbles: true }));
  el.dispatchEvent(new Event('change', { bubbles: true }));
}

/** @param {string} selector form selector */
export function submit(selector) {
  $(selector).dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
}

export const tick = () => new Promise((r) => setTimeout(r, 0));
