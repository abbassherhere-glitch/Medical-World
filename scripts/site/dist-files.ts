/** Helpers for reading the built site in dist/. */
import { existsSync, readdirSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

/** Every .html file in the built site. Stops with a message if there is no build. */
export function htmlFiles(dist: string): string[] {
  if (!existsSync(dist)) {
    console.error(`No built site found in ${dist}/. Run npm run build first.`);
    process.exit(1);
  }
  const out: string[] = [];
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.name.endsWith('.html')) out.push(full);
    }
  };
  walk(dist);
  return out.sort();
}

/** The page address for a built file, for example dist/texas/index.html -> /texas/. */
export function pagePath(dist: string, file: string): string {
  const rel = relative(dist, file).split(sep).join('/');
  if (rel === 'index.html') return '/';
  return `/${rel.replace(/index\.html$/, '')}`;
}
