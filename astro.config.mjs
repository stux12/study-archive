import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

const base = process.env.BASE_PATH || '/';

export default defineConfig({
  site: process.env.SITE_URL || 'https://example.github.io',
  base,
  output: 'static',
  integrations: [sitemap()],
});
