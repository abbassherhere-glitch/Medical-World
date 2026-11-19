/** Escapes text so it can be placed safely inside HTML. */
export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Turns content text into safe HTML, allowing one formatting mark:
 * **double asterisks** make text bold.
 */
export function inlineMarkup(text: string): string {
  return escapeHtml(text).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
}

/** Builds a page title such as "Dental hygienist salary | ScrubPath". */
export function pageTitle(title: string, siteName: string): string {
  return title === siteName ? title : `${title} | ${siteName}`;
}
