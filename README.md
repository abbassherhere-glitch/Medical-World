# Healthcare careers site

A website that explains US healthcare careers: training routes, schools,
licensing rules and pay, state by state. It starts with one profession,
dental hygienist, and will add more later. It is funded by display adverts.

This first stage contains the public page designs only: the home page, the
national salary guide, the Texas state guide, the standard pages (About,
Editorial standards, How we make money, Advertising disclosure, Privacy, Terms
of use, Contact) and a "page not found" page.

Anything in **square brackets**, such as `[SITE NAME]` or `[STATE FIGURE]`, is
a placeholder waiting for a real value.

## Where things live

| What | Where |
| --- | --- |
| Site name, address, company name, indexing switch, advert switch | `src/settings.ts` |
| Page text and figures | `src/content/` |
| Standard pages (About, Privacy and so on) | `src/content/pages/` (one Markdown file each) |
| Colors, sizes and spacing | `src/styles/tokens.css` |
| Page templates | `src/pages/` and `src/layouts/` |
| Reusable parts (header, footer, advert areas, tables) | `src/components/` |
| Font files (Lato, with its license) | `src/assets/fonts/lato/` |
| Original design mock-ups (not part of the site) | `design-reference/` |

### Before launch

1. In `src/settings.ts`, fill in `siteName`, `siteUrl` and `companyName`.
2. Replace every remaining square-bracket placeholder.
3. When you are ready for search engines, set `allowIndexing` to `true`.
   Until then every page says "noindex" and `robots.txt` blocks all crawling.

To hide every advert area, set `showAdverts` to `false` in `src/settings.ts`.

## Run it on your computer

You need [Node.js](https://nodejs.org/) version 22.23.4 or newer (version 24 is
recommended).

```bash
npm install
```

```bash
npm run dev
```

Then open <http://localhost:4321> in your browser. Pages reload as you edit.

## Build it

```bash
npm run build
```

The finished site is written to the `dist/` folder. To look at the built
version:

```bash
npm run preview
```

To run every check that also runs on pull requests (wording, type check, lint
and build):

```bash
npm run verify
```

## How deployment works

The site is hosted on Cloudflare Workers as plain static files. The settings
are in `wrangler.jsonc`.

Once the repository is connected to Cloudflare (see the pull request that set
this up for the one-time steps), every change merged into `main` is built and
published automatically. Pull requests get their own preview address so you
can check changes before merging.

## Project rules

Read `CONTRIBUTING.md` before making changes.
