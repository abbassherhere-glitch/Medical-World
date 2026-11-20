/**
 * Rules for the structured data check, kept apart from the file reading so
 * they can be tested. Each returns a list of problems (empty when fine).
 */
import { hasPlaceholder, stringsIn } from '../../src/lib/structured-data.ts';

const decode = (text: string) =>
  text
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#x27;/g, "'")
    .replace(/&amp;/g, '&');

const plain = (html: string) => decode(html.replace(/<[^>]+>/g, '')).replace(/\s+/g, ' ').trim();

/** The JSON-LD blocks in a page, as raw text. */
export function jsonLdBlocks(html: string): string[] {
  return [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map((m) => m[1] ?? '');
}

/** The questions and answers shown on the page, in "Common questions". */
export function visibleQuestions(html: string): { question: string; answer: string }[] {
  return [...html.matchAll(/<details class="faq__item"[^>]*>\s*<summary[^>]*>([\s\S]*?)<\/summary>\s*<p[^>]*>([\s\S]*?)<\/p>/g)].map((m) => ({
    question: plain(m[1] ?? ''),
    answer: plain(m[2] ?? ''),
  }));
}

/** The labels of the visible breadcrumb trail. */
export function visibleBreadcrumb(html: string): string[] {
  const nav = /<nav aria-label="Breadcrumb"[^>]*>([\s\S]*?)<\/nav>/.exec(html)?.[1];
  if (!nav) return [];
  return [...nav.matchAll(/<li[^>]*>([\s\S]*?)<\/li>/g)].map((m) => plain(m[1] ?? ''));
}

export function checkStructuredData(html: string): string[] {
  const problems: string[] = [];
  const shownQuestions = visibleQuestions(html);
  const shownCrumbs = visibleBreadcrumb(html);
  for (const block of jsonLdBlocks(html)) {
    let data: Record<string, unknown>;
    try {
      data = JSON.parse(block) as Record<string, unknown>;
    } catch {
      problems.push('structured data is not valid JSON');
      continue;
    }
    for (const text of stringsIn(data)) {
      if (hasPlaceholder(text)) problems.push(`structured data contains a placeholder: "${text}"`);
    }
    if (data['@type'] === 'FAQPage') {
      const items = (data.mainEntity as { name: string; acceptedAnswer: { text: string } }[]) ?? [];
      for (const q of items) {
        const shown = shownQuestions.find((s) => s.question === q.name);
        if (!shown) problems.push(`structured data has a question that is not on the page: "${q.name}"`);
        else if (shown.answer !== q.acceptedAnswer.text) problems.push(`structured data answer differs from the page for: "${q.name}"`);
      }
      if (items.length !== shownQuestions.length) problems.push('structured data and the page show a different number of questions');
    }
    if (data['@type'] === 'BreadcrumbList') {
      const names = ((data.itemListElement as { name: string }[]) ?? []).map((i) => i.name);
      if (names.join(' > ') !== shownCrumbs.join(' > ')) {
        problems.push(`structured data breadcrumbs (${names.join(' > ')}) differ from the page (${shownCrumbs.join(' > ')})`);
      }
    }
  }
  return problems;
}
