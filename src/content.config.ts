/**
 * Content collections. Each collection reads content files from
 * src/content/ and checks them against the rules below when the site is built,
 * so a missing or misspelled field stops the build with a clear message.
 */
import { defineCollection, reference } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const link = z.object({ label: z.string(), href: z.string() });
const figure = z.object({ label: z.string(), value: z.string() });

/** An image. Leave `src` out to show a labelled placeholder box instead. */
const image = z.object({
  src: z.string().optional(),
  alt: z.string(),
  width: z.number().default(1200),
  height: z.number().default(675),
  placeholder: z.string().default('[YOUR IMAGE]'),
});

const person = z.object({
  name: z.string(),
  href: z.string().optional(),
  photo: z.string().optional(),
});

const byline = z.object({
  author: person,
  reviewer: person,
  lastChecked: z.string(),
  sourceNote: z.string(),
});

const professions = defineCollection({
  loader: glob({ pattern: '*.json', base: './src/content/professions' }),
  schema: z.object({
    name: z.string(),
    /** Profession menu bar, in order. `key` marks the active item on each page. */
    menu: z.array(link.extend({ key: z.string() })),
    /** Plural form used in sentences, for example "dental hygienists". */
    namePlural: z.string(),
    /**
     * Figures from the Occupational Outlook Handbook (a different publication
     * from the wage survey). Each is shown with this source and never mixed
     * with wage survey figures in one sentence.
     */
    outlook: z.object({
      source: z.string(),
      jobs: figure,
      growth: figure,
      entry: z.string(),
    }),
    featured: z.object({
      eyebrow: z.string(),
      heading: z.string(),
      intro: z.string(),
    }),
    guideCards: z.array(
      z.object({
        icon: z.enum(['steps', 'school', 'license', 'chart']),
        title: z.string(),
        text: z.string(),
        linkText: z.string(),
        href: z.string(),
      }),
    ),
    stateGrid: z.object({
      heading: z.string(),
      intro: z.string(),
      states: z.array(z.string()),
      allStates: link,
    }),
    popularGuides: z.array(link),
    footerLinks: z.array(link),
  }),
});

const salaryGuides = defineCollection({
  loader: glob({ pattern: '*.json', base: './src/content/salary-guides' }),
  schema: z.object({
    profession: reference('professions'),
    title: z.string(),
    description: z.string(),
    heading: z.string(),
    breadcrumb: z.string(),
    byline,
    /** Takeaways from the Occupational Outlook Handbook, shown after those worked out from the wage data. */
    outlookTakeaways: z.array(z.string()),
    image,
    payByState: z.object({ heading: z.string(), intro: z.string() }),
    factors: z.object({
      heading: z.string(),
      items: z.array(z.object({ title: z.string(), text: z.string() })),
    }),
    /**
     * Common questions. Set `answerFrom` to have the answer worked out from the
     * pay data instead of written by hand.
     */
    faqs: z.array(
      z.object({
        question: z.string(),
        answer: z.string().optional(),
        answerFrom: z.enum(['hourly-median', 'highest-state', 'lower-pay']).optional(),
      }),
    ),
    /** Sources other than the wage survey, which is added automatically. */
    otherSources: z.array(z.string()),
    schoolFinder: z.object({ heading: z.string(), note: z.string() }),
    related: z.array(link),
  }),
});

/**
 * One template per profession for its state pages. "{state}" in any text is
 * replaced with the state's name, for example "Pay in {state}".
 */
const stateGuides = defineCollection({
  loader: glob({ pattern: '*.json', base: './src/content/state-guides' }),
  schema: z.object({
    profession: reference('professions'),
    title: z.string(),
    description: z.string(),
    heading: z.string(),
    byline,
    /** Takeaways not about pay. A pay takeaway worked out from the data is added first. */
    takeaways: z.array(z.string()),
    pay: z.object({ heading: z.string() }),
    image,
    cityPay: z.object({ heading: z.string(), intro: z.string() }),
    licensing: z.object({
      heading: z.string(),
      intro: z.string(),
      steps: z.array(z.object({ title: z.string(), text: z.string() })),
    }),
    schools: z.object({
      heading: z.string(),
      columns: z.array(z.string()),
      rows: z.array(
        z.object({
          name: z.string(),
          href: z.string().optional(),
          city: z.string(),
          award: z.string(),
          length: z.string(),
          sponsored: z.boolean().default(false),
        }),
      ),
      note: z.string(),
    }),
    /** Sources other than the wage survey, which is added automatically. */
    otherSources: z.array(z.string()),
    compare: z.object({ heading: z.string(), text: z.string(), button: link, note: z.string() }),
    nationalGuides: z.array(link),
  }),
});

/**
 * Which state pages are published: one file per profession listing every
 * state and DC with a "published" switch.
 */
const statePages = defineCollection({
  loader: glob({ pattern: '*.json', base: './src/content/state-pages' }),
  schema: z.object({
    profession: reference('professions'),
    pages: z.array(z.object({ state: z.string(), published: z.boolean() })),
  }),
});

const pages = defineCollection({
  loader: glob({ pattern: '*.md', base: './src/content/pages' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    heading: z.string(),
    lastUpdated: z.string(),
  }),
});

export const collections = { professions, salaryGuides, stateGuides, statePages, pages };
