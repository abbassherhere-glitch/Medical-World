/** Tests for which links are shown, and the guide-link switch. Run with: npm test */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { linkIsLive, normalizePath, switchedOffGuides } from './links.ts';

const published = new Set(['/', '/dental-hygienist/', '/dental-hygienist/salary/', '/dental-hygienist/prerequisites/']);

test('a link to a published page is shown; a link to a missing page is not', () => {
  const off = new Set<string>();
  assert.equal(linkIsLive('/dental-hygienist/salary/', published, off), true);
  assert.equal(linkIsLive('/dental-hygienist/salary', published, off), true, 'a missing final slash is fine');
  assert.equal(linkIsLive('/dental-hygienist/#states', published, off), true, 'a section of a published page');
  assert.equal(linkIsLive('/dental-hygienist/board-exam/', published, off), false);
  assert.equal(linkIsLive('#schools', published, off), true);
  assert.equal(linkIsLive('https://www.bls.gov/', published, off), true);
});

test('a guide switched off is not shown, even if its page exists', () => {
  const off = switchedOffGuides([
    { title: 'Prerequisites', href: '/dental-hygienist/prerequisites/', published: false },
    { title: 'Salary', href: '/dental-hygienist/salary/', published: true },
  ]);
  assert.deepEqual([...off], ['/dental-hygienist/prerequisites/']);
  assert.equal(linkIsLive('/dental-hygienist/prerequisites/', published, off), false);
  assert.equal(linkIsLive('/dental-hygienist/salary/', published, off), true);
});

test('a guide switched on is shown only once its page exists', () => {
  const off = switchedOffGuides([{ title: 'Vs', href: '/dental-hygienist/vs-dental-assistant/', published: true }]);
  assert.equal(linkIsLive('/dental-hygienist/vs-dental-assistant/', published, off), false);
  const withPage = new Set([...published, '/dental-hygienist/vs-dental-assistant/']);
  assert.equal(linkIsLive('/dental-hygienist/vs-dental-assistant/', withPage, off), true);
});

test('a mistake in the guide-link file stops the build', () => {
  assert.throws(() => switchedOffGuides([{ title: 'A', href: 'dental-hygienist/a/', published: false }]), /must start with/);
  assert.throws(
    () =>
      switchedOffGuides([
        { title: 'A', href: '/a/', published: false },
        { title: 'B', href: '/a', published: true },
      ]),
    /listed twice/,
  );
  assert.equal(normalizePath('/a/b?x=1#c'), '/a/b/');
});
