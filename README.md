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
| Site name, address, company name, indexing switch, advert switch, "Useful organizations" switch | `src/settings.ts` |
| Page text | `src/content/` |
| Which state pages are published | `src/content/state-pages/dental-hygienist.json` |
| Text shared by every state page (with `{state}` where the name goes) | `src/content/state-guides/dental-hygienist.json` |
| Overview page text | `overview` in `src/content/professions/dental-hygienist.json` |
| "How to become one" page text | `src/content/become-guides/dental-hygienist.json` |
| Which states border which | `src/data/borders.ts` |
| Which guide links are switched on | `src/content/guide-links/dental-hygienist.json` |
| Schools by state, Licensing and Board exam page text | `src/content/topic-pages/dental-hygienist.json` |
| Top menu items | `src/data/navigation.ts` |
| "Up next" links at the end of each guide | `src/data/up-next.ts` |
| How weekly and monthly pay is worked out | `src/lib/pay/periods.ts` |
| Common questions on state pages | `src/lib/pay/state-questions.ts` |
| Pay figures (made by the import, do not edit by hand) | `src/data/pay/` |
| Your changes to single pay figures | `src/data/pay/overrides.json` |
| The pay import script | `scripts/import-pay/` |
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

The finished site is written to the `dist/` folder. The site has a page for
every state and the District of Columbia, so expect about 70 pages. The build
also makes the search index (in `dist/pagefind/`); search only works on the
built site, not while running `npm run dev`. To look at the built
version:

```bash
npm run preview
```

To run every check that also runs on pull requests (wording, type check, lint,
tests, build with search index, and link check):

```bash
npm run verify
```

## Updating pay figures

Pay figures come from the US Bureau of Labor Statistics wage survey,
Occupational Employment and Wage Statistics. A new release comes out each
spring for the previous May. To update the site:

1. Go to <https://www.bls.gov/oes/tables.htm> and download the three files
   for the new release (for May 2026 they will be named
   `oesm26nat.zip`, `oesm26st.zip` and `oesm26ma.zip`).
2. Put them, still zipped, in the `data/source/` folder. Create the folder
   if it does not exist. The files are large, so this folder is never
   uploaded to GitHub.
3. Run:

   ```bash
   npm run import-pay
   ```

   The import reads the newest release it finds and writes
   `src/data/pay/dental-hygienist.json`. It prints the national median,
   any states without figures and any special symbols it found.
4. Run `npm run verify`, check the pages with `npm run dev`, then commit the
   changed file in `src/data/pay/`.

The import also accepts CSV row extracts of the official files (with the
original header row) named like `oews-m2025-national.csv`,
`oews-m2025-state.csv`, `oews-m2025-metro.csv` and
`oews-m2025-nonmetro.csv`. If both kinds are present, it uses the zip files.

If the import stops with a message, nothing has been changed. The message
says what to fix: for example a missing file, or an occupation code whose
title in the new files no longer matches.

**Special symbols.** Some cells in the official files hold a symbol instead
of a number. The site never turns these into numbers:

| Symbol | Official meaning (May 2025 notes) | Shown on the site as |
| --- | --- | --- |
| `*` | A wage estimate is not available | Not available |
| `**` | An employment estimate is not available | Not available |
| `#` | A wage equal to or greater than $115.00 per hour or $239,200 per year | At least $239,200 (yearly) or At least $115.00 (hourly) |
| `~` | The percent of establishments reporting the occupation is less than 0.5% | Kept in the data file |

The meanings and the `#` limits are in one file, `src/lib/pay/symbols.ts`,
labelled with the release they belong to. The limits can change between
releases: when you import a new release, check its official notes (in the
national zip file) and update that file. The import prints a reminder if the
release does not match.

**Adding a profession.** Add one line to `scripts/import-pay/config.ts` with
the profession's page name and its official occupation code, then run the
import again.

## Changing a single pay figure

You can replace any single figure for the whole country, a state or an area
without touching the imported data. Open `src/data/pay/overrides.json`. It
starts empty:

```json
{
  "overrides": []
}
```

Add one entry per figure you want to change. For example, to change the
yearly median for Texas and mark the number of jobs in one area as not
available:

```json
{
  "overrides": [
    {
      "profession": "dental-hygienist",
      "place": "Texas",
      "figure": "annual.median",
      "value": 99500,
      "note": "Corrected figure from the state's own release"
    },
    {
      "profession": "dental-hygienist",
      "place": "Laredo, TX",
      "figure": "jobs",
      "value": "Not available"
    }
  ]
}
```

- `profession`: the name used in page addresses, for example `dental-hygienist`.
- `place`: `United States`, a state name such as `Texas`, or an area name
  written exactly as on the site, for example `Austin-Round Rock-San Marcos, TX`.
- `figure`: `jobs`, or `annual.` or `hourly.` followed by `mean`, `p10`
  (lowest 10%), `p25`, `median`, `p75` or `p90` (top 10%).
- `value`: a plain number with no `$` or commas (`99500`, `47.85`), or
  `"Not available"`.
- `note`: optional, for your own records. It is not shown on the site.

The site uses your figure wherever that figure appears. If an entry has a
mistake, such as a misspelled place, the build stops and says which entry
is wrong, so an override is never silently ignored. Delete an entry to go
back to the official figure. Overrides stay in place when you import a new
release, so review them each time.

## Switching a state page on or off

Every state and the District of Columbia has a dental hygienist page. Which
pages are published is set in one file:
`src/content/state-pages/dental-hygienist.json`. It lists every state with a
switch:

```json
{ "state": "Texas", "published": true },
{ "state": "Utah", "published": true },
```

To take a page off the site, change its `true` to `false` and save:

```json
{ "state": "Utah", "published": false },
```

When the site is next built and deployed:

- the page is not built, so its address shows the "page not found" page;
- it is left out of `sitemap.xml`;
- every link to it, on menus, tables, grids and other state pages, shows as
  plain text instead.

Change it back to `true` to publish the page again. Keep every state in the
list: if a state is missing, misspelled or listed twice, the build stops and
says which one. Territories (Puerto Rico, Guam, the US Virgin Islands) do
not have pages; their figures stay in the data file.

## Switching a guide link on or off

Some guides are planned but not written yet, such as "Dental hygiene school
prerequisites". Links to them are listed in one file:
`src/content/guide-links/dental-hygienist.json`:

```json
{ "title": "Dental hygiene school prerequisites", "href": "/dental-hygienist/prerequisites/", "published": false },
```

- While `published` is `false`, the guide is not shown anywhere on the site:
  not in menus, popular guides, related guides or any other list.
- When the guide is written, change it to `true`. Links to it appear as soon
  as its page exists.

If the same address is listed twice, or an address does not start with `/`,
the build stops and says which one.

## Menus and links never lead nowhere

Menus, the footer, side panels and lists of links show only pages that
exist. A planned page appears in them automatically once it is built. The
list of published pages is in `src/data/routes.ts`.

To check the built site:

```bash
npm run check-links
```

It fails if any link leads to a missing page or section, if any form (the
search box or a state picker) goes to a missing page, if any state in a
picker leads to a missing page, or if a menu or list shows an item whose page
does not exist. It runs on every pull request.

## Search

The search box in the header opens `/search/`. After each build, the search
tool Pagefind reads the published pages in `dist/` and writes a small search
index next to them, so search works without a server. A page switched off is
not built, so it never appears in search.

Only the main content of each page is searched (not menus, bylines or advert
areas). The search page itself is never indexed by search engines and is not
in the sitemap, even after launch.

## The pay calculator

`/dental-hygienist/salary/calculator/` lets visitors choose a state (and an
area in it), switch between pay per hour, week, month and year, and compare
two places. Their choices are kept in the page address, for example
`/dental-hygienist/salary/calculator/?state=texas&area=12420&vs=ohio&per=month`,
so a result can be shared. State pages link to it with their state already
chosen.

It uses a small data file made at build time
(`/dental-hygienist/salary/calculator-data.json`) from the pay data and your
overrides, and loads it only on the calculator page. Without JavaScript the
page still shows the national figures and links to every state.

**Weekly and monthly pay.** Hourly and yearly pay are the official figures as
published. Weekly pay is the official yearly figure divided by 52, and
monthly pay is the official yearly figure divided by 12, each rounded to the
nearest dollar. Wherever they appear, a note says so, and that the survey
bases its yearly figures on full-time, year-round work. A missing figure is
never used in a calculation; it shows "Not available".

## Common questions on state pages

Each state page answers up to six common questions from its own figures. A
question the data cannot answer for a state is left out: for example Kansas,
which has no statewide figures in the May 2025 survey, gets three.

## Hiding the "Useful organizations" box

State pages and "How to become one" have a small "Useful organizations" box
with two placeholders for the state dental board and a professional
association. To hide it on every page, open `src/settings.ts` and change

```ts
showUsefulOrganizations: true,
```

to `false`.

## Placeholders still to fill in

Anything in square brackets, such as `[AUTHOR NAME]` or
`[Requirement in Texas, from the state board.]`, is a placeholder. To list
every placeholder still on the site, grouped by page, with a total and the
most common ones:

```bash
npm run build
```

```bash
npm run placeholders
```

This is the to-do list before launch. It only reports; it never stops the
build.

## How deployment works

The site is hosted on Cloudflare Workers as plain static files. The settings
are in `wrangler.jsonc`.

Once the repository is connected to Cloudflare (see the pull request that set
this up for the one-time steps), every change merged into `main` is built and
published automatically. Pull requests get their own preview address so you
can check changes before merging.

## Project rules

Read `CONTRIBUTING.md` before making changes.
