# Healthcare careers site

A website that explains US healthcare careers: training routes, schools,
licensing rules and pay, state by state. It starts with one profession,
dental hygienist, and will add more later. It is funded by display adverts.

This first stage contains the public page designs only: the home page, the
national salary guide, the Texas state guide, the standard pages (About,
Editorial standards, How we make money, Advertising disclosure, Privacy, Terms
of use, Contact) and a "page not found" page.

Anything in **square brackets**, such as `[COMPANY NAME]` or `[AUTHOR NAME]`, is
a placeholder waiting for a real value.

## Where things live

| What | Where |
| --- | --- |
| Site name, address, company name, indexing switch, advert switch, "Useful organizations" switch, sponsored listings switch | `src/settings.ts` |
| Page text | `src/content/` |
| Which state pages are published | `src/content/state-pages/dental-hygienist.json` |
| Which metropolitan area salary pages are published | `src/content/area-pages/dental-hygienist.json` |
| Short names of metropolitan areas (for titles) | `src/data/area-names.json` |
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
| Job outlook figures (made by the import, do not edit by hand) | `src/data/outlook/` |
| Your changes to single job outlook figures | `src/data/outlook/overrides.json` |
| State price levels (made by the import, do not edit by hand) | `src/data/prices/regional-price-parities.json` |
| Your changes to single price levels | `src/data/prices/overrides.json` |
| How the adjusted salary is worked out | `src/lib/prices/adjust.ts` |
| Structured data for search engines | `src/lib/structured-data.ts` |
| College lists (made by the import, do not edit by hand) | `src/data/schools/` |
| Your changes to single colleges (hide or correct) | `src/data/schools/overrides.json` |
| The pay import script | `scripts/import-pay/` |
| Standard pages (About, Privacy and so on) | `src/content/pages/` (one Markdown file each) |
| Colors, sizes and spacing | `src/styles/tokens.css` |
| Page templates | `src/pages/` and `src/layouts/` |
| Reusable parts (header, footer, advert areas, tables) | `src/components/` |
| Font files (Lato, with its license) | `src/assets/fonts/lato/` |
| Original design mock-ups (not part of the site) | `design-reference/` |

### Before launch

1. In `src/settings.ts`, fill in `companyName`. The site name (`ScrubPath`)
   and address (`https://scrubpath.com`) are already set there.
2. Replace every remaining square-bracket placeholder.
3. When you are ready for search engines, set `allowIndexing` to `true`.
   Until then every page says "noindex" and `robots.txt` blocks all crawling.

To hide every advert area, set `showAdverts` to `false` in `src/settings.ts`.

### Site name and address

The site name and address are set once, in `src/settings.ts` (`siteName` and
`siteUrl`). Everything else reads them from there: page titles, the header
and footer, canonical links, the sitemap and `robots.txt`. The standard pages
in `src/content/pages/` write `{siteName}` where the name goes, and the build
fills it in, so changing the name in `src/settings.ts` changes it everywhere.

The header shows the name as text only. There is no logo yet; the owner will
supply a logo and a favicon. Until then, `public/favicon.svg` is the simple
icon added when the site was first set up.

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

## Updating job outlook figures

The job outlook comes from the official state projections: Projections
Central, State Occupational Projections, long-term projections (currently
2024 to 2034), sponsored by the US Department of Labor. To update it:

1. Put the new state projections CSV in `data/source/`. Its name must contain
   "projections" and end in `.csv`, for example
   `state-projections-2024-2034-dental-hygienists.csv`. It needs the columns
   `state_fips, area, occupation_code, occupation_title, base_year,
   projected_year, base_employment, projected_employment, percent_change,
   average_annual_openings`.
2. Run:

   ```bash
   npm run import-outlook
   ```

   (`npm run import-pay` also runs it.) States are matched by FIPS code. It
   writes `src/data/outlook/dental-hygienist.json` and prints the national
   figures and any states the file leaves out.
3. Run `npm run verify`, check the pages, and commit the changed file.

The percent change is shown exactly as the source publishes it. The source
rounds job counts, so the percent change may not match the rounded counts
exactly (for example, Rhode Island goes from 860 to 860 jobs but +0.6%).

**Two different national figures.** The site shows two national job figures
and never mixes them:

- the US Bureau of Labor Statistics, Occupational Outlook Handbook: 225,300
  jobs in 2025 and 8% growth from 2025 to 2035 (home, overview, all
  professions and salaries pages, labelled "Occupational Outlook Handbook");
- the state projections' national row: 221,600 jobs in 2024, 237,200
  projected for 2034, 7% growth (job outlook sections, labelled with the
  projections source). State growth is always compared with this one.

The pay survey's own job count (222,740, May 2025) is a third figure, labelled
"wage survey". The three are never added or compared with each other.

To change a single outlook figure, use `src/data/outlook/overrides.json` in
the same way as the pay overrides below. `figure` is one of `baseJobs`,
`projectedJobs`, `percentChange` or `openings`, and `place` is
`United States` or a state name.

## Updating the college lists

The schools on each state page come from the US Department of Education,
National Center for Education Statistics, Integrated Postsecondary Education
Data System (IPEDS), Completions (currently 2023-24). The list shows colleges
that reported dental hygiene awards (program 51.0602). It is **not** a list of
accredited programs, and the site never says a college is accredited,
approved, recommended or accepting students. To update it:

1. Put the new IPEDS CSV in `data/source/`. Its name must start with "ipeds"
   and end in `.csv`, for example `ipeds-2024-25-dental-hygiene-programs.csv`.
   It needs the columns `unitid, institution, city, state, state_fips,
   website, control, award_level_code, award_level, cip_code, program,
   completions, award_year`.
2. Run:

   ```bash
   npm run import-schools
   ```

   (`npm run import-pay` also runs it.) States are matched by FIPS code, and a
   college's rows (one per award level) are grouped by its `unitid`. It writes
   `src/data/schools/dental-hygienist.json` and prints the totals.
3. Run `npm run verify`, check the pages, and commit the changed file.

Names, cities and web addresses are shown exactly as in the file. Where an
address has no "https://", it is added only to make the link work.

**Colleges with no awards.** A college can report the program with 0 awards
in the year. It is not in the table. It is named on a separate line under the
table: "Also reported the program, with no awards in 2023-24", and it is not
counted in any total.

**Hiding or correcting a college.** Add an entry to
`src/data/schools/overrides.json`, using the college's `unitid` from the file
as `id`. To hide a college:

```json
{ "overrides": [{ "profession": "dental-hygienist", "id": "139311", "hide": true, "note": "Why" }] }
```

To correct one detail, use `field` (`name`, `city`, `website` or `control`)
and `value`:

```json
{ "profession": "dental-hygienist", "id": "139311", "field": "name", "value": "Clayton State University", "note": "Why, and where it was checked" }
```

`control` must be `Public`, `Private nonprofit` or `Private for-profit`. The
build stops if the profession, college or field is unknown.

## Sponsored listings (switched off)

There are no paid listings. The "Sponsored" label (`src/components/SponsoredLabel.astro`)
and the notes about paid listings are kept for later, but nothing shows while
`showSponsoredListings` is `false` in `src/settings.ts`. Turn it on only when
real paid listings exist, and mark each one clearly.

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

## Salary pages for metropolitan areas

Every metropolitan area in the pay data that has a published annual median,
in the 50 states and DC, has its own salary page, for example
`/dental-hygienist/salary/houston-pasadena-the-woodlands-tx/`. There are 377.
The address is made from the official area name. An area that crosses state
lines has one page. Nonmetropolitan (rural) areas have no pages; they stay as
rows in the state tables. San Juan-Bayamon-Caguas, PR has no page, because
territories have no pages on this site.

`/dental-hygienist/salary/areas/` lists every area by state with its median.

**Short names.** Titles and headings use a short name, such as "Houston, TX".
They are kept in `src/data/area-names.json`, next to each official name. Each
short name is the first principal city, as written in the official name, plus
the first state code only: "New York, NY" for New York-Newark-Jersey City,
NY-NJ. Consolidated city names use the plain city name ("Nashville, TN",
"Louisville, KY", "Lexington, KY", "Athens, GA", "Augusta, GA", "Macon, GA").
Winston-Salem keeps its hyphen. The full official name, with every state, is
shown directly under the heading on each area page, and the comparisons name
every state the area covers. To change a short name, edit `short` there;
never change `name`. The build stops if two areas share a short name or a
name does not match the pay data.

**Switching an area page on or off.** `src/content/area-pages/dental-hygienist.json`
lists every area page with a switch, in the same way as the state pages:

```json
{ "area": "Houston-Pasadena-The Woodlands, TX", "published": false },
```

When it is `false`, the page is not built, is left out of `sitemap.xml` and
search, and every link to it (state tables, the areas list, other area
pages and the calculator) disappears or shows as plain text. If an area is
missing, misspelled or listed twice, the build stops and says which one.

**Checking the pages are not copies.** After a build, run:

```bash
npm run check-area-text
```

It takes each area page's main text, replaces every name with "NAME" and
every figure with "#", and fails if any two pages are then identical. It
also prints the most similar pair. It runs on every pull request.

## Salary and cost of living

The site adjusts state median salaries for state price levels, using the US
Bureau of Economic Analysis's Regional Price Parities by State (currently
2024, all items, released February 19, 2026). A price level of 100 is the
national average; 110 means prices are 10% above it.

**The calculation**, in one shared helper (`src/lib/prices/adjust.ts`):

> adjusted salary = official median annual salary ÷ (price level ÷ 100),
> rounded to the nearest $10

It is never worked out when the salary is missing or carries a symbol (for
example Kansas, which has no statewide figure). Wherever an adjusted figure
appears, a note says it is a calculation, how it is worked out, the years of
the salary and the price levels, and that price levels are averages for a
whole state. Price levels are published for states only, so metropolitan
areas have no adjusted figure.

It appears on `/dental-hygienist/salary/cost-of-living/`, in a block on every
state page, in the calculator (for whole states only) and on the salary guide.

**To update the price levels:**

1. Put the new CSV in `data/source/`. Its name must contain "price-parities"
   and end in `.csv`, for example `bea-regional-price-parities-2025-states.csv`.
   It needs the columns `state_fips, area, year, regional_price_parity_all_items`,
   with a United States row (FIPS 00).
2. The file does not say when it was released. Update the release date in
   `PRICE_RELEASE` in `scripts/import-pay/prices.ts`.
3. Run:

   ```bash
   npm run import-prices
   ```

   (`npm run import-pay` also runs it.) States are matched by FIPS code.
4. Run `npm run verify`, check the pages, and commit the changed file.

To change a single price level, add an entry to `src/data/prices/overrides.json`:

```json
{ "overrides": [{ "place": "Texas", "value": 97.5, "note": "Why, and where it was checked" }] }
```

`value` is a positive number, or `"Not available"`.

## Structured data

Every page carries structured data (JSON-LD) for search engines, built by the
same components that draw the page, so it always matches what is shown:

| Type | Where | Built by |
| --- | --- | --- |
| BreadcrumbList | Every page with a breadcrumb trail | `src/components/Breadcrumb.astro` |
| WebSite, with a SearchAction for `/search/` | Home page | `src/pages/index.astro` |
| Article | Guides, state pages and area pages (not the calculator) | `src/layouts/GuideLayout.astro` |
| FAQPage | Every page with "Common questions" | `src/components/FaqList.astro` |

The site name and address come from `src/settings.ts`. The publisher is the
site, by name and address only. An author and a date are added only once the
byline has a real name and a real date; while they are `[AUTHOR NAME]` and
`[DATE]`, they are left out. Salary figures are not marked up: Google retired
its estimated salary feature in 2025.

After a build, run:

```bash
npm run check-structured-data
```

It fails if any structured data is not valid JSON, contains a square-bracket
placeholder, or has a question, answer or breadcrumb that is not on the page.
It runs on every pull request.

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

## The salary calculator

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
