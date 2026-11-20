/** Shapes of the price level data in src/data/prices/. The import writes it; the site reads it. */

/** One state's (or DC's) price level. 100 is the national average; null means not available. */
export interface PriceLevel {
  /** FIPS code, for example "48" for Texas. */
  code: string;
  name: string;
  parity: number | null;
}

export interface PriceData {
  source: {
    /** The full source line shown on the site. */
    name: string;
    publisher: string;
    year: number;
    /** Release date, as YYYY-MM-DD. */
    released: string;
    fileRead: string;
    importedOn: string;
  };
  /** The United States row; always 100 in the official file. */
  national: number;
  states: PriceLevel[];
}
