import meta from "../../../public/data/meta.json" with { type: "json" };
import type { FilterObject } from "./types";

export type MandiRecord = {
  id: string;
  name: string;
  district: string;
  state: string;
  type: string;
};

export const mandis = meta.mandis as MandiRecord[];
export const crops = meta.crops as string[];
export const warehouses = meta.warehouses as string[];
export const districts = meta.districts as string[];
export const districtStateMap = meta.districtState as Record<string, string>;

/** Normalize strings for flexible case-insensitive matching */
export function norm(s?: string | null): string {
  if (!s) return "";
  return s.trim().toLowerCase();
}

/** Check if a mandi index matches filter constraints (state, district, mandi name) */
export function matchMandiFilter(mandiIdx: number, filter?: FilterObject): boolean {
  if (!filter) return true;
  const m = mandis[mandiIdx];
  if (!m) return false;

  if (filter.state && filter.state !== "All" && norm(m.state) !== norm(filter.state)) {
    return false;
  }
  if (filter.district && filter.district !== "All" && norm(m.district) !== norm(filter.district)) {
    return false;
  }
  if (filter.mandi && filter.mandi !== "All") {
    const fM = norm(filter.mandi);
    const mM = norm(m.name);
    if (!mM.includes(fM) && !fM.includes(mM)) return false;
  }
  return true;
}

/** Check if a crop index matches crop filter constraint */
export function matchCropFilter(cropIdx: number, filter?: FilterObject): boolean {
  if (!filter || !filter.crop || filter.crop === "All") return true;
  const cName = crops[cropIdx];
  if (!cName) return false;
  return norm(cName) === norm(filter.crop);
}

/** Check if a date string falls within filter date/days constraints */
export function matchDateFilter(dateStr: string, filter?: FilterObject, maxDateStr?: string): boolean {
  if (!filter) return true;

  if (filter.startDate && dateStr < filter.startDate) return false;
  if (filter.endDate && dateStr > filter.endDate) return false;

  if (filter.days && filter.days > 0 && maxDateStr) {
    const d = new Date(`${dateStr}T00:00:00Z`).getTime();
    const maxD = new Date(`${maxDateStr}T00:00:00Z`).getTime();
    const diffDays = (maxD - d) / (1000 * 3600 * 24);
    if (diffDays > filter.days) return false;
  }

  return true;
}

/** Check if a district index matches filter constraints */
export function matchDistrictFilter(districtIdx: number, filter?: FilterObject): boolean {
  if (!filter) return true;
  const dName = districts[districtIdx];
  if (!dName) return false;
  const dState = districtStateMap[dName];

  if (filter.state && filter.state !== "All" && norm(dState) !== norm(filter.state)) {
    return false;
  }
  if (filter.district && filter.district !== "All" && norm(dName) !== norm(filter.district)) {
    return false;
  }
  return true;
}
