/**
 * Professions to import. To add a profession, add a line with its URL name
 * (the part used in page addresses) and its official occupation code.
 * The title is checked against the official file; if it differs, the import
 * stops and says so.
 */
export const PROFESSIONS = [
  { slug: 'dental-hygienist', occCode: '29-1292', expectedTitle: 'Dental Hygienists' },
] as const;

/** Folder that holds the official files (kept out of the repository). */
export const SOURCE_DIR = 'data/source';

/** Folder the extracted data files are written to. */
export const OUTPUT_DIR = 'src/data/pay';
