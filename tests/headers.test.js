import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DIST = join(ROOT, 'dist');

/** Parse Cloudflare's _headers into { pattern: { name: value } }. */
function parseHeaders(text) {
  /** @type {Record<string, Record<string, string>>} */
  const rules = {};
  let current = null;
  for (const line of text.split('\n')) {
    if (!line.trim() || line.trim().startsWith('#')) continue;
    if (!/^\s/.test(line)) rules[(current = line.trim())] = {};
    else if (current) {
      const i = line.indexOf(':');
      rules[current][line.slice(0, i).trim()] = line.slice(i + 1).trim();
    }
  }
  return rules;
}

const rules = parseHeaders(readFileSync(join(ROOT, 'public', '_headers'), 'utf8'));
const all = rules['/*'] ?? {};
const csp = Object.fromEntries(
  (all['Content-Security-Policy'] ?? '').split(';').map((d) => {
    const [name, ...values] = d.trim().split(/\s+/);
    return [name, values.join(' ')];
  }),
);

describe('security headers', () => {
  it('sets the baseline headers on every path', () => {
    expect(all).toMatchObject({
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
    });
    expect(all['Strict-Transport-Security']).toMatch(/^max-age=\d+/);
  });

  it('allows only same-origin scripts and requests', () => {
    expect(csp['default-src']).toBe("'self'");
    expect(csp['script-src']).toBe("'self'");
    expect(csp['connect-src']).toBe("'self'");
    expect(csp['object-src']).toBe("'none'");
    expect(csp['frame-ancestors']).toBe("'none'");
  });

  it('keeps noindex on pages.dev hosts', () => {
    expect(rules['https://:project.pages.dev/*']).toEqual({ 'X-Robots-Tag': 'noindex' });
  });
});

/** @param {string} dir @returns {string[]} */
const htmlFiles = (dir) =>
  readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return htmlFiles(path);
    return name.endsWith('.html') ? [path] : [];
  });

describe.skipIf(!existsSync(DIST))('built pages work under the CSP', () => {
  const pages = existsSync(DIST) ? htmlFiles(DIST) : [];

  it.each(pages.map((p) => [p.slice(DIST.length)]))('%s has no inline scripts, handlers or external assets', (rel) => {
    const html = readFileSync(join(DIST, rel), 'utf8');
    const inlineScripts = [...html.matchAll(/<script\b([^>]*)>/g)].filter(
      ([, attrs]) => !/\bsrc=/.test(attrs) && !/type="application\/ld\+json"/.test(attrs),
    );
    expect(inlineScripts).toEqual([]);
    expect(html).not.toMatch(/\son[a-z]+=/i);
    expect(html).not.toMatch(/javascript:/i);
    // Scripts, stylesheets and images must be same-origin (links to other sites are fine).
    expect(html).not.toMatch(/<(script|img|iframe)\b[^>]*\ssrc="(https?:)?\/\//);
    expect(html).not.toMatch(/<link\b[^>]*rel="stylesheet"[^>]*href="(https?:)?\/\//);
  });
});
