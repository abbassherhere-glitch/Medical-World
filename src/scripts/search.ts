/**
 * Runs a search on the search page. The index (in /pagefind/) is made from
 * the published pages after each build, and this script only loads on the
 * search page. Results are announced to screen readers through a status
 * message.
 */
interface PagefindResultData {
  url: string;
  excerpt: string;
  meta: { title?: string };
}

interface Pagefind {
  search(query: string): Promise<{ results: { data(): Promise<PagefindResultData> }[] }>;
}

const MAX_RESULTS = 20;

function escapeHtml(text: string): string {
  return text.replace(/[&<>"']/g, (ch) => `&#${ch.charCodeAt(0)};`);
}

async function loadIndex(): Promise<Pagefind | undefined> {
  try {
    const url = '/pagefind/pagefind.js';
    return (await import(/* @vite-ignore */ url)) as Pagefind;
  } catch {
    return undefined;
  }
}

export async function startSearch(): Promise<void> {
  const input = document.querySelector<HTMLInputElement>('#search-page-input');
  const status = document.querySelector<HTMLElement>('[data-search-status]');
  const list = document.querySelector<HTMLOListElement>('[data-search-results]');
  const help = document.querySelector<HTMLElement>('[data-search-help]');
  if (!input || !status || !list || !help) return;

  const query = (new URLSearchParams(window.location.search).get('q') ?? '').trim();
  input.value = query;

  if (query === '') {
    status.textContent = 'Type what you are looking for, such as a state or a topic, and press Search.';
    help.hidden = false;
    return;
  }

  status.textContent = `Searching for “${query}”…`;
  const pagefind = await loadIndex();
  if (!pagefind) {
    status.textContent = 'Search is not available right now. You can browse the guides below.';
    help.hidden = false;
    return;
  }

  const search = await pagefind.search(query);
  const results = await Promise.all(search.results.slice(0, MAX_RESULTS).map((r) => r.data()));

  if (results.length === 0) {
    status.textContent = `No results for “${query}”. Check the spelling, try a shorter search, or browse the guides below.`;
    help.hidden = false;
    return;
  }

  // Pagefind's excerpts are plain text with matched words wrapped in <mark>.
  list.innerHTML = results
    .map(
      (r) => `<li>
        <a href="${escapeHtml(r.url)}">${escapeHtml(r.meta.title ?? r.url)}</a>
        <p>${r.excerpt}</p>
      </li>`,
    )
    .join('');
  const total = search.results.length;
  status.textContent =
    total > MAX_RESULTS
      ? `${total} results for “${query}”. Showing the first ${MAX_RESULTS}.`
      : `${total} ${total === 1 ? 'result' : 'results'} for “${query}”.`;
}
