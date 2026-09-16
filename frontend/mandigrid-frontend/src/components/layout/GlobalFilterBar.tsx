import { useGlobalFilters } from "./FilterContext";

// For a real app, these options would be dynamically generated from datasets or API.
// Based on the analytics provided, we have 57 mandis across specific states and 8 crops.
// As requested, the filters should only allow valid options. To simplify, we provide the known crops and generic Time Windows. 
const CROP_OPTIONS = [
  "All",
  "Basmati",
  "Cotton",
  "Maize",
  "Mustard",
  "Narma",
  "Rice",
  "Sugarcane",
  "Wheat"
];

const STATE_OPTIONS = [
  "All",
  "Punjab",
  "Haryana",
  "Uttar Pradesh"
];

const WINDOW_OPTIONS = [
  { label: "All time", value: "All" },
  { label: "Last 30 days", value: "30d" },
  { label: "Last 90 days", value: "90d" },
];

export function GlobalFilterBar() {
  const { filters, setFilter, resetFilters } = useGlobalFilters();
  const isActive = filters.state !== "All" || filters.crop !== "All" || filters.window !== "All";

  return (
    <div className="mb-6 flex flex-wrap items-center gap-4 rounded-md border border-line bg-panel p-3 shadow-sm">
      <div className="flex items-center gap-2 text-ink-soft">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon>
        </svg>
        <span className="text-sm font-medium">Filters:</span>
      </div>

      <div className="flex items-center gap-2">
        <label htmlFor="state-filter" className="text-xs text-ink-soft">
          State
        </label>
        <select
          id="state-filter"
          value={filters.state}
          onChange={(e) => setFilter("state", e.target.value)}
          className="rounded-sm border border-line bg-paper px-2 py-1 text-sm text-ink focus:border-grain-greenDark focus:outline-none"
        >
          {STATE_OPTIONS.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      </div>

      <div className="flex items-center gap-2">
        <label htmlFor="crop-filter" className="text-xs text-ink-soft">
          Crop
        </label>
        <select
          id="crop-filter"
          value={filters.crop}
          onChange={(e) => setFilter("crop", e.target.value)}
          className="rounded-sm border border-line bg-paper px-2 py-1 text-sm text-ink focus:border-grain-greenDark focus:outline-none"
        >
          {CROP_OPTIONS.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      </div>

      <div className="flex items-center gap-2">
        <label htmlFor="window-filter" className="text-xs text-ink-soft">
          Time
        </label>
        <select
          id="window-filter"
          value={filters.window}
          onChange={(e) => setFilter("window", e.target.value)}
          className="rounded-sm border border-line bg-paper px-2 py-1 text-sm text-ink focus:border-grain-greenDark focus:outline-none"
        >
          {WINDOW_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {isActive && (
        <button
          onClick={resetFilters}
          className="ml-auto text-xs font-medium text-grain-rust hover:underline"
        >
          Clear filters
        </button>
      )}
    </div>
  );
}
