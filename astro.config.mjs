// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://tools.kukirim.com',
  trailingSlash: 'always',
  build: {
    format: 'directory',
    // Inline stylesheets so they are not render-blocking requests
    // (allowed by style-src 'unsafe-inline' in public/_headers).
    inlineStylesheets: 'always',
  },
  integrations: [sitemap()],
});
