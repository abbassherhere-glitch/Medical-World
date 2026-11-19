import { writeFile } from 'node:fs/promises';
import { defineConfig, fontProviders } from 'astro/config';
import type { AstroIntegration } from 'astro';
import { settings, siteOrigin } from './src/settings';

/**
 * While indexing is switched off, also send an "X-Robots-Tag: noindex" header
 * with every response from Cloudflare, as a second safeguard next to the
 * robots meta tag and robots.txt.
 */
function robotsHeader(): AstroIntegration {
  return {
    name: 'robots-header',
    hooks: {
      'astro:build:done': async ({ dir }) => {
        const body = settings.allowIndexing ? '' : '/*\n  X-Robots-Tag: noindex, nofollow\n';
        await writeFile(new URL('_headers', dir), body);
      },
    },
  };
}

export default defineConfig({
  site: siteOrigin(),
  trailingSlash: 'always',
  build: { format: 'directory' },
  integrations: [robotsHeader()],
  fonts: [
    {
      provider: fontProviders.local(),
      name: 'Lato',
      cssVariable: '--font-lato',
      fallbacks: ['system-ui', 'sans-serif'],
      options: {
        variants: [
          { src: ['./src/assets/fonts/lato/lato-latin-400-normal.woff2'], weight: 400, style: 'normal' },
          { src: ['./src/assets/fonts/lato/lato-latin-700-normal.woff2'], weight: 700, style: 'normal' },
          { src: ['./src/assets/fonts/lato/lato-latin-900-normal.woff2'], weight: 900, style: 'normal' },
        ],
      },
    },
  ],
});
