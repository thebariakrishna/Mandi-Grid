# MandiGrid — Mandi-to-Market Supply Chain Optimizer

A React + TypeScript frontend for the MandiGrid analytics layer: arrivals,
MSP compliance, logistics, weather, and mandi-level performance across 57
mandis and 8 crops, plus a lightweight rule-based "Ask MandiGrid" query tool.

## Run it

```bash
npm install
npm run dev       # local dev server (http://localhost:5173)
```

Production build:

```bash
npm run build      # type-checks, then builds to dist/
npm run preview    # serve the production build locally (http://localhost:4173)
```

## What's here

- **Overview** — network-wide KPIs, arrivals by crop, top mandis, warehouse
  logistics, and the rainfall–arrival relationship.
- **Prices & MSP** — modal price vs. MSP by crop, below-MSP rates, and a
  per-crop price trend.
- **Logistics** — warehouse-level transit time and delay rate.
- **Weather** — daily rainfall/temperature against arrivals, with an explicit
  association-not-causation note and data-coverage callout.
- **Mandis** — searchable, sortable mandi directory with a derived
  "crops handled" column.
- **Ask MandiGrid** — a deterministic, rule-based query box (no LLM, no
  agent framework). It matches a question to one of a fixed set of intents,
  lazy-loads only the file that intent needs, computes the answer, and
  renders a chart. Unsupported questions get "I can't answer that from the
  available analytics." Try the example chips on the page.

## Data

All analytics in `public/data/` are treated as **read-only** and are served
exactly as provided — nothing was regenerated, recomputed at the source
level, or hand-edited. Every KPI and chart is either a direct field from
`dashboard_metrics.json` / `insights.json`, or a deterministic aggregation
of the CSV rows (weighted averages, sums, group-bys) computed in
`src/data/adapters/`. No business metric is hardcoded in a component.

## Architecture

```
src/
├── components/   # layout (sidebar/shell) and shared UI primitives
├── pages/        # one file per route, lazy-loaded
├── charts/       # recharts wrappers, typed per chart
├── data/
│   ├── loaders/  # cached fetch + parse (CSV via PapaParse, JSON) — a file
│   │              # is fetched and parsed at most once, no matter how many
│   │              # pages or Ask MandiGrid queries need it
│   └── adapters/ # pure aggregation functions over the loaded rows
├── types/        # interfaces matching the actual CSV/JSON columns
└── utils/        # formatting, the async-data hook, and the Ask MandiGrid
                   # intent engine
```

## Performance notes

- Every page is route-level code-split (`React.lazy`).
- No dataset is fetched until a page that needs it actually mounts.
- Ask MandiGrid never touches any dataset while the user is typing — only
  on submit — and reuses the same cache as the rest of the app.
- Charts receive pre-aggregated arrays (e.g. weather is rolled up to ~276
  daily points, not the raw 5,676-row table).

## Validated

- `npm run build` succeeds (TypeScript strict mode + Vite production build).
- All eight analytics files in `dist/data/` are byte-identical to the
  originals (verified via checksum).
- Every route resolves, including direct/deep links (SPA fallback via
  `vite preview`).
