/**
 * Rules for the licensing text check, kept apart from file reading so they
 * can be tested. Every licensing fact shown on a page must be, word for
 * word, a value in the licensing file.
 */
import type { LicensingEntry } from '../../src/lib/licensing/types.ts';
import { factsIn, licensingQuestions, TAKEAWAY_LABELS } from '../../src/lib/licensing/content.ts';

const decode = (text: string) =>
  text
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');
const plain = (html: string) => decode(html.replace(/<[^>]+>/g, '')).replace(/\s+/g, ' ').trim();

/** Placeholders that a page for a state in the file must no longer show. */
export const LICENSING_PLACEHOLDERS = [
  '[Introduction to the licensing process',
  '[Requirement in ',
  '[Fee and process in ',
  '[Renewal period and continuing education in ',
  '[Licensing steps in ',
  '[Dental board for ',
  '[STATE DENTAL BOARD NAME AND OFFICIAL LINK]',
];

/** Text of every element marked data-licensing-fact. */
export function markedFacts(html: string): string[] {
  return [...html.matchAll(/<(span|li|td)\b[^>]*\bdata-licensing-fact\b[^>]*>([\s\S]*?)<\/\1>/g)].map((m) => plain(m[2] ?? ''));
}

/**
 * Checks one built page. `entry` is the state's licensing entry when the page
 * is a state page for a state in the file; `allFacts` are every value in the file.
 */
export function checkLicensingPage(html: string, allFacts: Set<string>, state?: { entry?: LicensingEntry; where: string }): string[] {
  const problems: string[] = [];
  for (const fact of markedFacts(html)) {
    if (!allFacts.has(fact)) problems.push(`licensing text not in the file: "${fact}"`);
  }
  if (!state) return problems;

  if (state.entry) {
    const mine = new Set(factsIn(state.entry));
    for (const fact of markedFacts(html)) {
      if (!mine.has(fact)) problems.push(`licensing text from another state: "${fact}"`);
    }
    for (const p of LICENSING_PLACEHOLDERS) {
      if (html.includes(p)) problems.push(`still shows the placeholder "${p}"`);
    }
    // Takeaways with a licensing label: the rest must be a value from the file.
    const items = [...html.matchAll(/<li[^>]*>([\s\S]*?)<\/li>/g)].map((m) => plain(m[1] ?? ''));
    for (const label of Object.values(TAKEAWAY_LABELS).map((f) => f(state.where))) {
      for (const item of items.filter((i) => i.startsWith(label))) {
        if (!mine.has(item.slice(label.length))) problems.push(`takeaway not in the file: "${item}"`);
      }
    }
    // Licensing questions: the answer shown must be a value from the file.
    const shown = [...html.matchAll(/<summary[^>]*>([\s\S]*?)<\/summary>\s*<p[^>]*>([\s\S]*?)<\/p>/g)].map((m) => ({
      q: plain(m[1] ?? ''),
      a: plain(m[2] ?? ''),
    }));
    const asked = licensingQuestions(state.entry, state.where).map((q) => q.question);
    for (const s of shown.filter((x) => asked.includes(x.q))) {
      if (!mine.has(s.a)) problems.push(`answer to "${s.q}" is not in the file: "${s.a}"`);
    }
  } else if (!html.includes('[Requirement in ')) {
    problems.push('a state not in the licensing file has lost its licensing placeholders');
  }
  return problems;
}
