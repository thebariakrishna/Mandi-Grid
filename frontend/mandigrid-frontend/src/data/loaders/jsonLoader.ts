/** Generic, cached JSON loader — mirrors csvLoader's caching/dedup behaviour. */

const cache = new Map<string, unknown>();
const inFlight = new Map<string, Promise<unknown>>();

export async function loadJson<T>(url: string): Promise<T> {
  const cached = cache.get(url);
  if (cached) return cached as T;

  const existing = inFlight.get(url);
  if (existing) return existing as Promise<T>;

  const promise = (async () => {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to load ${url}: ${response.status}`);
    }
    const data = (await response.json()) as T;
    cache.set(url, data);
    inFlight.delete(url);
    return data;
  })();

  inFlight.set(url, promise);
  return promise;
}
