/**
 * Generic, cached CSV loader.
 *
 * - Parses with PapaParse (dynamically imported so it only enters the bundle
 *   the first time a page actually needs CSV data).
 * - Caches the parsed result per URL so a file is fetched + parsed at most once,
 *   no matter how many pages or Ask MandiGrid queries ask for it.
 * - Dedupes concurrent requests for the same URL (e.g. two components mounting
 *   in the same tick) so we never issue two network calls for one file.
 */

type Row = Record<string, string>;

const cache = new Map<string, unknown[]>();
const inFlight = new Map<string, Promise<unknown[]>>();

function coerceRow<T>(row: Row): T {
  const out: Record<string, unknown> = {};
  for (const key of Object.keys(row)) {
    const value = row[key];
    if (value === undefined || value === null || value === "") {
      out[key] = value;
      continue;
    }
    const asNumber = Number(value);
    // Keep things that look like dates or ids as strings; coerce numeric-looking
    // fields to numbers so charts and math don't have to re-parse everywhere.
    if (value.trim() !== "" && !Number.isNaN(asNumber) && !/^0[0-9]/.test(value)) {
      out[key] = asNumber;
    } else {
      out[key] = value;
    }
  }
  return out as T;
}

export async function loadCsv<T>(url: string): Promise<T[]> {
  const cached = cache.get(url);
  if (cached) return cached as T[];

  const existing = inFlight.get(url);
  if (existing) return existing as Promise<T[]>;

  const promise = (async () => {
    const Papa = (await import("papaparse")).default;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to load ${url}: ${response.status}`);
    }
    const text = await response.text();
    const parsed = Papa.parse<Row>(text, {
      header: true,
      skipEmptyLines: true,
    });
    if (parsed.errors && parsed.errors.length > 0) {
      // PapaParse reports row-level errors; surface the first one but don't
      // fail the whole load for minor issues like trailing blank lines.
      const fatal = parsed.errors.find((e) => e.type !== "FieldMismatch");
      if (fatal) {
        throw new Error(`Error parsing ${url}: ${fatal.message}`);
      }
    }
    const rows = parsed.data.map((row) => coerceRow<T>(row));
    cache.set(url, rows);
    inFlight.delete(url);
    return rows;
  })();

  inFlight.set(url, promise);
  return promise;
}

export function clearCsvCache(url?: string) {
  if (url) {
    cache.delete(url);
    inFlight.delete(url);
  } else {
    cache.clear();
    inFlight.clear();
  }
}
