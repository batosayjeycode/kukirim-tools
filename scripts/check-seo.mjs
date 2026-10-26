// Checks SEO basics and internal links in the production build (dist/).
// Usage: npm run build && npm run check:seo   — exits 1 on any error.
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, relative } from 'node:path';

const DIST = new URL('../dist/', import.meta.url).pathname;
const SITE = 'https://tools.kukirim.com';
const TITLE_MAX = 65;
const DESC_MIN = 70;
const DESC_MAX = 160;

/** @param {string} dir @returns {string[]} */
function htmlFiles(dir) {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return htmlFiles(path);
    return name.endsWith('.html') ? [path] : [];
  });
}

/** @param {string} html @param {RegExp} re */
const all = (html, re) => [...html.matchAll(re)].map((m) => m[1]);
/** @param {string} html @param {RegExp} re */
const one = (html, re) => html.match(re)?.[1];
/** Decode the few entities Astro emits in attributes/text. */
const decode = (s = '') => s.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>');

/** URL path for a built file: dist/a/index.html → /a/, dist/404.html → /404 */
function routeOf(file) {
  const rel = relative(DIST, file).replace(/\\/g, '/');
  if (rel === 'index.html') return '/';
  if (rel.endsWith('/index.html')) return `/${rel.slice(0, -'index.html'.length)}`;
  return `/${rel.replace(/\.html$/, '')}`;
}

/** Does an internal href resolve to a file in dist? */
function resolves(href) {
  const path = decodeURI(href.split(/[?#]/)[0]);
  if (path.endsWith('/')) return existsSync(join(DIST, path, 'index.html'));
  return existsSync(join(DIST, path));
}

const errors = [];
const warnings = [];
const titles = new Map();
const descriptions = new Map();
const sitemap = existsSync(join(DIST, 'sitemap-0.xml')) ? readFileSync(join(DIST, 'sitemap-0.xml'), 'utf8') : '';

for (const file of htmlFiles(DIST)) {
  const route = routeOf(file);
  const html = readFileSync(file, 'utf8');
  const err = (msg) => errors.push(`${route}: ${msg}`);
  const warn = (msg) => warnings.push(`${route}: ${msg}`);
  const noindex = /<meta name="robots" content="[^"]*noindex/.test(html);

  if (!/<html lang="id"/.test(html)) err('missing <html lang="id">');

  const title = decode(one(html, /<title>([^<]*)<\/title>/));
  if (!title) err('missing <title>');
  else {
    if (title.length > TITLE_MAX) warn(`title is ${title.length} chars (>${TITLE_MAX}): ${title}`);
    if (titles.has(title)) err(`duplicate title with ${titles.get(title)}`);
    titles.set(title, route);
  }

  const desc = decode(one(html, /<meta name="description" content="([^"]*)"/));
  if (!desc) err('missing meta description');
  else {
    if (!noindex && (desc.length < DESC_MIN || desc.length > DESC_MAX)) warn(`description is ${desc.length} chars (${DESC_MIN}–${DESC_MAX})`);
    if (descriptions.has(desc)) err(`duplicate description with ${descriptions.get(desc)}`);
    descriptions.set(desc, route);
  }

  const h1s = all(html, /<h1[\s>]/g);
  if (h1s.length !== 1) err(`expected 1 <h1>, found ${h1s.length}`);

  const canonical = one(html, /<link rel="canonical" href="([^"]*)"/);
  if (noindex) {
    if (canonical) err('noindex page should not declare a canonical URL');
    if (route !== '/404') err('unexpected noindex');
    if (sitemap.includes(`<loc>${SITE}${route}</loc>`)) err('noindex page is in the sitemap');
  } else {
    if (canonical !== `${SITE}${route}`) err(`canonical ${canonical} ≠ ${SITE}${route}`);
    if (!sitemap.includes(`<loc>${SITE}${route}</loc>`)) err('missing from sitemap');
    for (const prop of ['og:title', 'og:description', 'og:url', 'og:image', 'og:image:alt']) {
      if (!new RegExp(`<meta property="${prop}" content="[^"]+"`).test(html)) err(`missing ${prop}`);
    }
    const ogImage = one(html, /<meta property="og:image" content="([^"]*)"/);
    if (ogImage && (!ogImage.startsWith(`${SITE}/`) || !resolves(ogImage.slice(SITE.length)))) err(`og:image not found: ${ogImage}`);
    if (one(html, /<meta property="og:url" content="([^"]*)"/) !== canonical) err('og:url ≠ canonical');
  }

  for (const json of all(html, /<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
    try {
      JSON.parse(json);
    } catch {
      err('invalid JSON-LD');
    }
  }

  // Astro can drop the line break between text and a following link ("gunakan<a…>").
  for (const glued of all(html, /([A-Za-z0-9,.:;]<a [^>]*>[^<]{0,20})/g)) warn(`missing space before link: ${glued}`);

  for (const href of all(html, /<a [^>]*href="([^"]*)"/g).map(decode)) {
    if (/^(https?:|mailto:|tel:)/.test(href)) continue;
    if (href.startsWith('#')) {
      if (href.length > 1 && !html.includes(`id="${href.slice(1)}"`)) err(`broken anchor ${href}`);
      continue;
    }
    if (!href.startsWith('/')) err(`relative link ${href}`);
    else if (!/\.[a-z0-9]+$/i.test(href.split(/[?#]/)[0]) && !href.split(/[?#]/)[0].endsWith('/')) err(`link without trailing slash ${href}`);
    else if (!resolves(href)) err(`broken link ${href}`);
  }
}

const pages = titles.size;
for (const w of warnings) console.warn(`warn  ${w}`);
for (const e of errors) console.error(`error ${e}`);
console.log(`${pages} pages checked: ${errors.length} errors, ${warnings.length} warnings.`);
if (errors.length > 0) process.exitCode = 1;
