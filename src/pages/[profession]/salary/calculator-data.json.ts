/**
 * The pay calculator's data, for example /dental-hygienist/salary/calculator-data.json.
 * Only the calculator page loads it. It holds only what the calculator shows:
 * national, state and area figures for published states, with overrides applied.
 */
import type { APIRoute, GetStaticPaths } from 'astro';
import { getCollection } from 'astro:content';
import { getPublishedStatePages } from '../../../data/state-pages';
import { getPublishedAreaPages } from '../../../data/area-pages';
import { getPayData, releaseName } from '../../../lib/pay';
import { buildCalculatorData, buildCalculatorOutlook } from '../../../lib/pay/calculator';
import { getOutlook } from '../../../lib/outlook';

export const getStaticPaths = (async () => {
  const guides = await getCollection('salaryGuides');
  return guides.map((g) => ({ params: { profession: g.data.profession.id } }));
}) satisfies GetStaticPaths;

export const GET: APIRoute = async ({ params }) => {
  const profession = params.profession!;
  const pay = getPayData(profession);
  const published = (await getPublishedStatePages())
    .filter((p) => p.profession === profession)
    .map((p) => ({ name: p.state, slug: p.slug }));
  const areaPages = new Map((await getPublishedAreaPages(profession)).map((p) => [p.area.code, p.path]));
  const data = buildCalculatorData(pay, published, releaseName(pay), areaPages);
  const outlook = getOutlook(profession);
  if (outlook) data.outlook = buildCalculatorOutlook(outlook, published);
  return new Response(JSON.stringify(data), { headers: { 'Content-Type': 'application/json; charset=utf-8' } });
};
