/**
 * Centralized Agricultural & Financial Analytics Definitions
 */

/** Expected transit hours based on standard 45 km/h run rate + 1.5 hour loading/unloading buffer */
export function expectedHours(distanceKm: number | null): number | null {
  if (distanceKm == null || distanceKm <= 0) return null;
  return distanceKm / 45 + 1.5;
}

/** Determines if a shipment trip experienced logistics delay */
export function calculateDelay(transitHours: number | null, distanceKm: number | null): boolean {
  if (transitHours == null || distanceKm == null) return false;
  const exp = expectedHours(distanceKm);
  if (exp == null) return false;
  return transitHours > exp;
}

/** Determines if a record constitutes a price crash (modal price falling below government MSP) */
export function calculatePriceCrash(modal: number | null, msp: number | null): boolean {
  if (modal == null || msp == null || msp <= 0) return false;
  return modal < msp;
}

/** Calculates average transit time in hours from a list of transit hour values */
export function calculateAverageTransit(hours: (number | null)[]): number {
  const valid = hours.filter((h): h is number => h != null && h > 0);
  if (valid.length === 0) return 0;
  const sum = valid.reduce((a, b) => a + b, 0);
  return Number((sum / valid.length).toFixed(2));
}

/** Calculates crash rate percentage (percentage of records where modal price < MSP) */
export function calculateCrashRate(priceRecords: Array<{ modal: number | null; msp: number | null }>): number {
  const valid = priceRecords.filter((r) => r.modal != null && r.msp != null && r.msp! > 0);
  if (valid.length === 0) return 0;
  const crashes = valid.filter((r) => r.modal! < r.msp!).length;
  return Number(((crashes / valid.length) * 100).toFixed(1));
}

/** Calculates Pearson correlation coefficient r between two numeric arrays */
export function calculateCorrelation(xs: number[], ys: number[]): { r: number; interpretation: string } {
  const n = Math.min(xs.length, ys.length);
  if (n < 3) return { r: 0, interpretation: "Insufficient data points for correlation calculation." };
  
  const mx = xs.reduce((a, b) => a + b, 0) / n;
  const my = ys.reduce((a, b) => a + b, 0) / n;
  
  let num = 0;
  let dx = 0;
  let dy = 0;
  for (let i = 0; i < n; i++) {
    const a = xs[i]! - mx;
    const b = ys[i]! - my;
    num += a * b;
    dx += a * a;
    dy += b * b;
  }
  
  const den = Math.sqrt(dx * dy);
  const r = den === 0 ? 0 : Number((num / den).toFixed(3));

  let interpretation = "No linear correlation";
  if (r >= 0.7) interpretation = "Strong positive correlation";
  else if (r >= 0.3) interpretation = "Moderate positive correlation";
  else if (r > -0.3) interpretation = "Weak or no correlation";
  else if (r > -0.7) interpretation = "Moderate negative correlation";
  else interpretation = "Strong negative correlation";

  return { r, interpretation };
}

/** Formatting helper for Indian currency & numbers */
export function fmt(n: number, digits = 0): string {
  return n.toLocaleString("en-IN", { maximumFractionDigits: digits, minimumFractionDigits: 0 });
}
