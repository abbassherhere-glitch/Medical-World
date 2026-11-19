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
| Page text | `src/content/` |
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

The finished site is written to the `dist/` folder. To look at the built
version:

```bash
npm run preview
```

To run every check that also runs on pull requests (wording, type check, lint,
tests and build):

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

## Pages that are not built yet

Menus and lists mention guides that are planned but not written yet. These
show as plain text and become links automatically once the page exists. The
list of published pages is in `src/data/routes.ts`.

## How deployment works

The site is hosted on Cloudflare Workers as plain static files. The settings
are in `wrangler.jsonc`.

Once the repository is connected to Cloudflare (see the pull request that set
this up for the one-time steps), every change merged into `main` is built and
published automatically. Pull requests get their own preview address so you
can check changes before merging.

## Project rules

Read `CONTRIBUTING.md` before making changes.
