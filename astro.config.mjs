// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import { SITE, PAGES } from './src/config.js';

/** Sitemap lastmod per path, from SITE.homeUpdated and PAGES[].updated in src/config.js. */
const lastmods = new Map([['/', SITE.homeUpdated], ...PAGES.map((p) => /** @type {[string, string]} */ ([p.path, p.updated]))]);

export default defineConfig({
  site: SITE.url,
  trailingSlash: 'always',
  build: {
    format: 'directory',
    // Inline stylesheets so they are not render-blocking requests
    // (allowed by style-src 'unsafe-inline' in public/_headers).
    inlineStylesheets: 'always',
  },
  integrations: [
    sitemap({
      // The 404 page (noindex) stays out of the sitemap.
      filter: (page) => !new URL(page).pathname.startsWith('/404'),
      serialize: (item) => {
        const lastmod = lastmods.get(new URL(item.url).pathname);
        return lastmod ? { ...item, lastmod } : item;
      },
    }),
  ],
});
