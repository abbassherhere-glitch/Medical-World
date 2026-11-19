import type { APIRoute } from 'astro';
import { settings } from '../settings';

/** While indexing is off, ask every crawler to stay away. */
export const GET: APIRoute = ({ site }) => {
  const body = settings.allowIndexing
    ? `User-agent: *\nAllow: /\n\nSitemap: ${new URL('/sitemap.xml', site).href}\n`
    : 'User-agent: *\nDisallow: /\n';
  return new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
};
