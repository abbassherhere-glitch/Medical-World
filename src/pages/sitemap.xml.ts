import type { APIRoute } from 'astro';
import { getPublicRoutes } from '../data/routes';
import { escapeHtml } from '../lib/text';

export const GET: APIRoute = async ({ site }) => {
  const routes = await getPublicRoutes();
  const urls = routes
    .map((path) => `  <url><loc>${escapeHtml(new URL(path, site).href)}</loc></url>`)
    .join('\n');

  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`;
  return new Response(body, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
};
