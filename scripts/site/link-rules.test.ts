/** Tests for the link check rules. Run with: npm test */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkPage, stripCode, type Site } from './link-rules.ts';

// A tiny pretend site: three pages, with a few sections.
const pages: Record<string, string[]> = {
  '/': ['main'],
  '/dental-hygienist/': ['states'],
  '/dental-hygienist/texas/': ['schools', 'licensing'],
  '/dental-hygienist/schools/': [],
  '/search/': [],
};
const site: Site = {
  hasPage: (path) => path in pages,
  hasSection: (path, id) => (pages[path] ?? []).includes(id),
};
const check = (html: string, page = '/') => checkPage(html, page, site);

test('a page with working links, sections and forms passes', () => {
  const html = `
    <a href="/dental-hygienist/">Overview</a>
    <a href="/dental-hygienist/texas/#schools">Texas schools</a>
    <a href="#main">Skip</a>
    <a href="https://www.bls.gov/">BLS</a>
    <form action="/search/" method="get"><input name="q"></form>
    <p>Read about <span class="link-pending">Ohio</span> soon.</p>
    <table><tr><td><span class="link-pending">Ohio</span></td></tr></table>`;
  assert.deepEqual(check(html), []);
});

test('fails on a link to a missing page or section', () => {
  assert.match(check('<a href="/nope/">x</a>').join(), /\/nope\/ \(no such page\)/);
  assert.match(check('<a href="/dental-hygienist/texas/#fees">x</a>').join(), /no such section/);
  assert.match(check('<a href="#missing">x</a>').join(), /no such section/);
});

test('fails when a form goes to a page that does not exist', () => {
  assert.match(check('<form action="/find/" method="get"></form>').join(), /form goes to \/find\/ \(no such page\)/);
  assert.match(check('<form method="get"></form>').join(), /form without a destination/);
});

test('fails when a state picker choice leads to a missing page or section', () => {
  const picker = (options: string, section = 'schools') => `
    <form action="/dental-hygienist/schools/" data-state-picker data-profession="dental-hygienist" data-section="${section}">
      <select name="state"><option value="">Choose a state</option>${options}</select>
    </form>`;
  assert.deepEqual(check(picker('<option value="texas">Texas</option>')), []);
  assert.match(check(picker('<option value="ohio">Ohio</option>')).join(), /state picker choice \/dental-hygienist\/ohio\/#schools \(no such page\)/);
  assert.match(check(picker('<option value="texas">Texas</option>', 'board')).join(), /no such section/);
});

test('fails when a menu or list shows an unpublished item', () => {
  assert.match(
    check('<nav><ul><li><span class="link-pending">Licensing</span></li></ul></nav>').join(),
    /unpublished item "Licensing" shown inside <nav>/,
  );
  assert.match(check('<ul class="link-list"><li><span class="link-pending">Guide</span></li></ul>').join(), /inside <ul>/);
  assert.match(check('<footer><p><span class="link-pending">Guide</span></p></footer>').join(), /inside <footer>/);
});

test('ignores addresses inside scripts and styles', () => {
  assert.deepEqual(check('<script>const a = `<a href="${url}">`;</script><style>a[href="/x/"]{}</style>'), []);
  assert.equal(stripCode('a<script>b</script>c<!-- d -->e'), 'ace');
});

test('college websites are not checked: external links are skipped, never fetched', () => {
  const asked: string[] = [];
  const watching: Site = {
    hasPage: (path) => (asked.push(path), path in pages),
    hasSection: (path, id) => (pages[path] ?? []).includes(id),
  };
  const html = `
    <a class="external" href="https://www.example.edu/dental-hygiene" target="_blank" rel="nofollow noopener">A college</a>
    <a class="external" href="http://example.edu/" target="_blank" rel="nofollow noopener">Another college</a>`;
  assert.deepEqual(checkPage(html, '/dental-hygienist/texas/', watching), []);
  assert.deepEqual(asked, []);
});
