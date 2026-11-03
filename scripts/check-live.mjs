// Read-only post-deployment checks. Sends GET requests only; changes nothing.
//   npm run check:live                                          # https://tools.kukirim.com
//   npm run check:live -- https://<hash>.kukirim-tools.pages.dev   # deployment URL (checks X-Robots-Tag: noindex)
import { readdirSync } from 'node:fs';
import { PAGES } from '../src/config.js';

const SITE = 'https://tools.kukirim.com';
const base = new URL(process.argv[2] ?? SITE).origin;
const isProduction = new URL(base).hostname === 'tools.kukirim.com';
const results = [];

const get = (path, redirect = 'manual') => fetch(new URL(path, base), { redirect });
const check = async (name, fn) => {
  try {
    const detail = await fn();
    results.push({ ok: true, name, detail });
  } catch (error) {
    results.push({ ok: false, name, detail: error.message });
  }
};
const expect = (condition, message) => {
  if (!condition) throw new Error(message);
};

await check('GET / returns 200 with correct canonical', async () => {
  const res = await get('/');
  const html = await res.text();
  expect(res.status === 200, `status ${res.status}`);
  expect(html.includes(`<link rel="canonical" href="${SITE}/"`), 'canonical missing or wrong');
  return '200';
});

await check('Security headers on /', async () => {
  const res = await get('/');
  const missing = ['x-content-type-options', 'content-security-policy', 'referrer-policy', 'x-frame-options'].filter(
    (h) => !res.headers.has(h),
  );
  if (isProduction && !res.headers.has('strict-transport-security')) missing.push('strict-transport-security');
  expect(missing.length === 0, `missing: ${missing.join(', ')}`);
  if (new URL(base).hostname.endsWith('.pages.dev')) {
    expect(/noindex/.test(res.headers.get('x-robots-tag') ?? ''), 'pages.dev host should send X-Robots-Tag: noindex');
  }
  return 'present';
});

await check('Path without trailing slash redirects', async () => {
  const res = await get('/kalkulator-keuntungan');
  const location = res.headers.get('location') ?? '';
  expect([301, 308].includes(res.status) && location.endsWith('/kalkulator-keuntungan/'), `${res.status} -> ${location}`);
  return `${res.status} -> ${location}`;
});

await check('Unknown path returns 404 page', async () => {
  const res = await get('/halaman-yang-tidak-ada-xyz/');
  const html = await res.text();
  expect(res.status === 404, `status ${res.status}`);
  expect(/Halaman tidak ditemukan/i.test(html), 'custom 404 page not served');
  return '404';
});

await check('robots.txt and sitemap URLs', async () => {
  const robots = await get('/robots.txt');
  expect(robots.status === 200, `robots.txt ${robots.status}`);
  expect((await robots.text()).includes(`Sitemap: ${SITE}/sitemap-index.xml`), 'robots.txt sitemap line');
  const index = await get('/sitemap-index.xml');
  expect(index.status === 200, `sitemap-index.xml ${index.status}`);
  const sitemap = await (await get('/sitemap-0.xml')).text();
  const urls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  expect(urls.length > 0, 'sitemap-0.xml has no URLs');
  for (const url of urls) {
    const res = await get(new URL(url).pathname);
    const html = await res.text();
    expect(res.status === 200, `${url} ${res.status}`);
    expect(!html.includes('content="noindex'), `${url} is noindex but in sitemap`);
  }
  return `${urls.length} sitemap URLs OK`;
});

await check('Hashed /_astro/ scripts are cached immutably', async () => {
  const html = await (await get('/kalkulator-keuntungan/')).text();
  const asset = html.match(/(?:href|src)="(\/_astro\/[^"]+)"/)?.[1];
  expect(asset, 'no /_astro/ asset found on /kalkulator-keuntungan/');
  const cache = (await get(asset)).headers.get('cache-control') ?? '';
  expect(cache.includes('immutable'), `${asset} cache-control: ${cache}`);
  return asset;
});

await check('Downloads return 200', async () => {
  const files = readdirSync(new URL('../public/downloads/', import.meta.url));
  for (const file of files) {
    const res = await get(`/downloads/${file}`);
    expect(res.status === 200, `/downloads/${file} ${res.status}`);
  }
  return `${files.length} files OK`;
});

await check('Companion guide links on kukirim.com resolve', async () => {
  const urls = [...new Set(PAGES.flatMap((p) => p.guides ?? []).map((g) => g.url))];
  for (const url of urls) {
    const res = await fetch(url, { redirect: 'manual' });
    expect(res.status === 200, `${url} ${res.status}`);
  }
  return `${urls.length} links OK`;
});

if (isProduction) {
  await check('http:// redirects to https://', async () => {
    const res = await fetch('http://tools.kukirim.com/', { redirect: 'manual' });
    const location = res.headers.get('location') ?? '';
    expect([301, 308].includes(res.status) && location.startsWith(`${SITE}/`), `${res.status} -> ${location}`);
    return `${res.status} -> ${location}`;
  });
}

for (const { ok, name, detail } of results) console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
const failed = results.filter((r) => !r.ok).length;
console.log(`\n${results.length - failed}/${results.length} checks passed for ${base}`);
if (failed) process.exit(1);
