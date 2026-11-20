import { test } from 'node:test';
import assert from 'node:assert/strict';
import { article, breadcrumbList, faqPage, isoDate, jsonLdText, website } from '../../src/lib/structured-data.ts';
import { checkStructuredData } from './structured-data-rules.ts';

const site = { name: 'ScrubPath', origin: 'https://scrubpath.com' };
const ld = (data: unknown) => `<script type="application/ld+json">${typeof data === 'string' ? data : JSON.stringify(data)}</script>`;
const faqHtml = (q: string, a: string) => `<details class="faq__item"><summary>${q}</summary><p>${a}</p></details>`;
const crumbs = '<nav aria-label="Breadcrumb" class="breadcrumb"><ol><li><a href="/">Home</a></li><li><span aria-current="page">About us</span></li></ol></nav>';

test('the article leaves out the author and date while they are placeholders', () => {
  const a = article({ headline: 'H', description: 'D', url: 'https://scrubpath.com/x/', site, authorName: '[AUTHOR NAME]', dateShown: '[DATE]' });
  assert.equal(a.author, undefined);
  assert.equal(a.dateModified, undefined);
  assert.deepEqual(a.publisher, { '@type': 'Organization', name: 'ScrubPath', url: 'https://scrubpath.com/' });
  const b = article({ headline: 'H', description: 'D', url: 'u', site, authorName: 'Jane Real', dateShown: 'November 20, 2026' });
  assert.deepEqual(b.author, { '@type': 'Person', name: 'Jane Real' });
  assert.equal(b.dateModified, '2026-11-20');
  assert.equal(isoDate('2026-02-19'), '2026-02-19');
  assert.equal(isoDate('not a date'), undefined);
});

test('the website points its search at /search/ and reads the site name and address', () => {
  const w = website(site);
  assert.equal(w.name, 'ScrubPath');
  assert.equal(w.url, 'https://scrubpath.com/');
  assert.equal((w.potentialAction as { target: { urlTemplate: string } }).target.urlTemplate, 'https://scrubpath.com/search/?q={search_term_string}');
});

test('breadcrumbs give an address for each step but the current page', () => {
  const b = breadcrumbList([{ label: 'Home', url: 'https://scrubpath.com/' }, { label: 'About us' }]);
  assert.deepEqual(b.itemListElement, [
    { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://scrubpath.com/' },
    { '@type': 'ListItem', position: 2, name: 'About us' },
  ]);
});

test('JSON-LD is safe inside a script tag', () => {
  assert.equal(jsonLdText({ a: '</script><b>&' }), '{"a":"\\u003c/script\\u003e\\u003cb\\u003e\\u0026"}');
});

test('the check passes matching data and fails on a placeholder, bad JSON or a question not on the page', () => {
  const faq = faqPage([{ question: 'Q one?', answer: "It's $1." }]);
  const good = crumbs + faqHtml('Q one?', 'It&#39;s $1.') + ld(faq) + ld(breadcrumbList([{ label: 'Home', url: 'https://scrubpath.com/' }, { label: 'About us' }]));
  assert.deepEqual(checkStructuredData(good), []);

  assert.match(checkStructuredData(ld({ '@type': 'Article', author: { name: '[AUTHOR NAME]' } })).join(), /placeholder: "\[AUTHOR NAME\]"/);
  assert.match(checkStructuredData(ld('{"@type": "Article",')).join(), /not valid JSON/);
  const extra = faqPage([
    { question: 'Q one?', answer: "It's $1." },
    { question: 'Q two?', answer: 'No.' },
  ]);
  assert.match(checkStructuredData(faqHtml('Q one?', "It's $1.") + ld(extra)).join(), /question that is not on the page: "Q two\?"/);
  assert.match(checkStructuredData(faqHtml('Q one?', 'Different.') + ld(faq)).join(), /answer differs/);
  assert.match(checkStructuredData(crumbs + ld(breadcrumbList([{ label: 'Home' }, { label: 'Other' }]))).join(), /breadcrumbs .* differ/);
});
