/**
 * Lets the standard pages in src/content/pages/ use the site name from
 * src/settings.ts: write {siteName} in the Markdown and the built page shows
 * the name from the settings file, so it is never typed in twice.
 */
import { settings } from '../settings.ts';
import { escapeHtml } from './text.ts';

const TOKENS: Record<string, string> = {
  '{siteName}': settings.siteName,
};

/** Replaces the tokens in a piece of built HTML, escaping each value. */
export function fillSettings(html: string): string {
  return Object.entries(TOKENS).reduce((out, [token, value]) => out.replaceAll(token, escapeHtml(value)), html);
}
