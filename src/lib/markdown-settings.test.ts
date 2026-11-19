import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { fillSettings } from './markdown-settings.ts';
import { settings, siteOrigin } from '../settings.ts';

test('the site name and address come from the settings file', () => {
  assert.equal(settings.siteName, 'ScrubPath');
  assert.equal(settings.siteUrl, 'https://scrubpath.com');
  assert.equal(siteOrigin(), 'https://scrubpath.com');
  assert.equal(new URL('/dental-hygienist/texas/', siteOrigin()).href, 'https://scrubpath.com/dental-hygienist/texas/');
});

test('standard pages fill in {siteName} from the settings file', () => {
  assert.equal(fillSettings('<p>{siteName} is free to read.</p>'), `<p>${settings.siteName} is free to read.</p>`);
  assert.equal(fillSettings('<p>Run by {siteName}, and {siteName} again.</p>'), `<p>Run by ${settings.siteName}, and ${settings.siteName} again.</p>`);
});

test('no standard page types the site name or address in directly', () => {
  const dir = new URL('../content/pages/', import.meta.url);
  for (const file of readdirSync(dir)) {
    const text = readFileSync(new URL(file, dir), 'utf8');
    assert.ok(!text.includes(settings.siteName), `${file} types the site name; write {siteName} instead`);
    assert.ok(!text.includes('[SITE NAME]'), `${file} still has the [SITE NAME] placeholder`);
    assert.ok(!text.includes('scrubpath.com'), `${file} types the site address`);
  }
});
