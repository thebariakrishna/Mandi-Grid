# 🌾 Mandi-to-Market Supply Chain Optimizer

**TransOrg AgentIQ Datathon 2026 — Track 3: AgriTech**

🔗 **Live demo:** [mandi-grid.vercel.app](https://mandi-grid.vercel.app/)

---

## What this project is about

India's agricultural supply chain has a data conundrum before it has a logistics issue. Different mandi log crop arrivals in different units and sometimes even different languages. Prices dip below government mandated Minimum Support Price (MSP) frequently enough to impact farmer income, but it is not clear which crops are worst hit and how often. Truckers take vastly different time windows to reach warehouses, and it is not evident what routes contribute to these variances. It is obvious that weather impacts the volume of produce that reaches mandi, but it has never been quantified.

MandiGrid centralizes fragmented mandi arrival records, modal prices, and IoT weather data into an auditable analytics layer and query interface

This project consolidates all this data into a single repository that feeds into a Streamlit executive dashboard and a full web app with an inbuilt AI analyst that can answer questions on the fly

## What we set out to build

A system that lets the Board:

1. Track daily and aggregate crop arrivals across all 57 mandis.
2. Check wholesale prices against MSP and flag which crops crash most often.
3. Measure how long trucks actually take to reach warehouses, and where the bottlenecks are.
4. See how rainfall and temperature swings relate to arrival volumes.

The rule we held ourselves to: every number on the dashboard has to trace back to a documented formula, a validated join, and a script you can rerun — no one-off Excel math that nobody can reproduce.

---

## How it's built

### The data pipeline

Everything flows one direction, and nothing downstream is trusted until the stage before it has been checked:

```
RAW DATA SOURCES
   │  (Mandi Master · Mandi Arrivals · Price & MSP · Transport Logistics · Weather Sensors)
   ▼
① DATA PROFILING & QUALITY CHECKS      — schema checks, missing values, type & range validation
   ▼
② CLEANING & STANDARDIZATION           — units → Qtl / KM / °C / IST, ID mapping, dedup (nothing dropped without a reason)
   ▼
③ VALIDATION                           — cross-checked against Mandi Master (100% match, all 57 mandis)
   ▼
④ PROCESSED DATA LAYER (data/processed/)  — 5 clean tables, aggregated to date + mandi_id + crop_name
   ▼
⑤ ANALYTICS MODEL (scripts/generate_analytics.py)  — 8 governed KPIs, deterministic every time you rerun it
   ▼
⑥ VALIDATION AUDIT (scripts/validate_analytics.py) — 12 governance checks, all passing
   ▼
⑦ APPLICATION LAYER — Streamlit dashboard + the "Ask MandiGrid" AI analyst
```

*(`pipeline_architecture.png` has the full visual diagram.)*

### The application layer

On top of the governed analytics, there are two ways to actually use the data:

- **Streamlit dashboard (`app.py`)** — the executive view: KPI cards, trends, comparisons, rankings, and the rainfall-vs-arrivals relationship.
- **Full web app** — a React frontend talking to a Python backend, built for a more conversational experience:
  - **Frontend:** React + Vite + Tailwind CSS + Recharts
  - **Backend:** Python FastAPI + Pandas
  - **AI engine:** Groq API (`groq/compound-mini` model), used to turn plain-English questions into structured queries and conversational answers

---

## Repository structure

```
.
├── data/                                   # Raw, processed, and analytics-ready datasets
├── docs/                                 # Documentation, diagrams (e.g. pipeline_architecture.png)
├── frontend/                               # React + Vite + Tailwind frontend
├── scripts/                                # Pipeline scripts (cleaning, analytics generation, validation)
├── .gitignore
├── analyze_data.py                         # Data analysis entry point
├── requirements.txt
├── data_dictionary.md
└── app.py                               
```

*(This is the actual top-level layout of the repo. `data/`, `docs/`, `frontend/`, and `scripts/` each expand further — see below for what's inside `data/` and `scripts/` based on the pipeline stages.)*

---

## The data we're working with

| # | Entity | Cleaned File | Format | Records | Key | What's in it |
|---|--------|--------------|--------|---------|-----|-------------|
| 1 | **Mandi Master** | `clean_mandi_master.csv` | CSV | 57 | `mandi_id` | Mandi names, district, state, mandi type, total area (acres) |
| 2 | **Mandi Arrivals** | `clean_mandi_arrivals.csv` | CSV | 24,525 | `arrival_id` | Daily crop arrivals (Qtl), variety, farmer count |
| 3 | **Price & MSP** | `clean_price_msp.json` | JSON | 12,000 | `record_id` | Wholesale min / max / modal price plus MSP benchmark, ₹/Qtl |
| 4 | **Transport & Logistics** | `clean_transport_logistics.csv` | CSV | 10,000 | `trip_id` | Mandi → warehouse transit logs, distance, duration |
| 5 | **Weather Sensors** | `weather_cleaned.csv` | CSV | 15,000 | `sensor_id` | IoT logs: rainfall (mm), temperature (°C), humidity (%) |

**6 crop categories in the data:** Wheat, Rice, Cotton, Maize, Mustard, Sugarcane. (Basmati and Narma show up as *varieties* under Rice and Cotton, not as separate crops.)

We also built two controlled vocabularies to keep things consistent:
- **CROP_MAP** — maps multilingual and misspelled crop names (like `गेहूं` / `Gehun` / `Kanak`) back to one of the 6 canonical crop names.
- **UNIT_TO_QTL** — converts every quantity unit to Quintals (`Qtl` ×1.0, `KG` ×0.01, `T`/`MT` ×10.0).

---

## Data Cleaning and Normalization — 

Each source needed its own fixes before it was trustworthy:

- **Mandi Master** — districts title-cased, missing ones filled with `'Unknown'`, states imputed from a district lookup, mandi types standardized.
- **Mandi Arrivals** — exact and near-duplicate `arrival_id`s removed; dates parsed with `dayfirst=True` to handle mixed Indian date formats; `mandi_id` padded into a consistent `MANDIxxx` format; quantities pulled out of messy strings like `"415.88 qtl"`.
- **Price & MSP** — currency symbols (₹, Rs.) and thousand separators stripped before converting to numbers; MSP values checked against official seasonal government benchmarks.
- **Transport Logistics** — timestamps parsed from several formats; arrival times checked to always come after departure; impossible negative durations dropped; vehicle numbers normalized (e.g. `PB-08-AB-1234`).
- **Weather Sensors** — 7 different timestamp patterns normalized to IST; temperatures unified to Celsius; rainfall unified to mm; negative rainfall (a hardware glitch) set to null instead of guessed at; districts assigned via round-robin over the sorted master list.

**How well everything matched up after cleaning:**
- Arrivals → Mandi Master: 24,525 / 24,525 matched, all 57 mandis (100%)
- Price & MSP → Mandi Master: 10,765 / 10,765 non-null records matched (100%)
- Transport → Mandi Master: 10,000 / 10,000 trips matched (100%)

---

## Analytical Methodology: 

- **Grain:** everything is aggregated to `date + mandi_id + crop_name` *before* any joins happen — this stops row-multiplication when you're joining one-to-many relationships.
- **Transport** data stays at the individual trip level until it's rolled up to the warehouse for reporting.
- **Weather** data stays at sensor level, then gets aggregated to daily-district and daily-state before we correlate it with arrivals.
- We don't just assume joins are clean — we check them. Total arrivals before the join (5,963,218.35 Qtl) has to match total arrivals after the join, or something's wrong.

---

## The 8 governed KPIs

Built by `scripts/generate_analytics.py`, double-checked independently by `scripts/validate_analytics.py`:

| # | KPI | How it's calculated | Result |
|---|-----|---------|-----------------|
| 1 | **Total Arrivals** | Sum of `arrival_quantity_qtl` | **5,963,218.35 Qtl** |
| 2 | **Modal Price vs MSP** | Average across the 9,131 records where both price and MSP exist and MSP > 0 | Modal ₹3,794.21/Qtl vs MSP ₹3,711.62/Qtl |
| 3 | **Below-MSP Crash Rate** | Records where price < MSP, divided by 9,131 | **40.16%** (3,667 crashes; 2,869 records with missing data excluded) |
| 4 | **Avg Transit by Warehouse** | Mean transit hours, grouped by destination warehouse | **13.53 hrs overall** (WH-West is slowest at 13.76 hrs) |
| 5 | **Transit Delay Rate** | Trips exceeding each warehouse's own 75th-percentile transit time | **24.59%** overall (a relative benchmark, not an official SLA) |
| 6 | **Rainfall–Arrival Correlation** | Pearson r, daily state-wide rainfall vs. arrivals | **r = −0.0594** (an association, not a causal claim) |
| 7 | **Top Mandi by Volume** | Ranked by total arrival quantity | **Tadipatri Mandi (MANDI026)** — 117,127.67 Qtl |
| 8 | **Crop-wise Distribution** | Each crop's share of total arrivals | Mustard 17.12% · Wheat 16.98% · Sugarcane 16.86% · Maize 16.72% · Cotton 16.16% · Rice 16.15% |

**A few things worth flagging from this** (see `data/analytics/insights.json`):
- **Wheat** crashes below MSP more than any other crop — 42.22% of the time (545 out of 1,291 valid observations), with an average gap of ₹42.07/Qtl.
- **WH-West** is the slowest warehouse to receive deliveries — 13.76 hrs average, with trips delayed 24.57% of the time.
- Weather sensors only cover 252 of 276 arrival dates (91.3%) — we disclose that gap rather than papering over it with interpolated data.

---

## How we handle data quality

- **Missing values stay missing.** We never fill blank `modal_price` or `msp` fields with zero — that would quietly wreck KPI 2 and 3. They stay as null until they're explicitly excluded from a calculation.
- **Denominators are documented, not hidden.** The below-MSP rate is only calculated over the 9,131 records where both price and MSP actually exist. The other 2,869 are excluded and that's stated clearly, not buried.
- **Duplicates are handled carefully.** `clean_mandi_arrivals.csv` has 24,525 rows and 24,524 unique arrival IDs — one row is missing its ID string but has valid transaction data, so it's kept. Actual duplicate rows: zero.
- **Correlation isn't dressed up as causation.** The rainfall–arrival number is described exactly as what it is: a weak linear association.

---

## The validation audit

`scripts/validate_analytics.py` runs 12 automated checks against the analytics layer on every build:

| Check | Result |
|---|---|
| Required files & columns present | ✅ Pass |
| Grain uniqueness (`date + mandi_id + crop_name`) | ✅ Pass |
| No negative measures (quantities, distances, durations) | ✅ Pass |
| Price formula integrity (`price_gap = modal_price − msp`) | ✅ Pass |
| Below-MSP denominator correctness | ✅ Pass |
| Percentages stay within 0–100% | ✅ Pass |
| Division-by-zero protection | ✅ Pass |
| Join cardinality (pre- vs. post-join totals match) | ✅ Pass |
| Source-to-analytics reconciliation | ✅ Pass |
| Weather coverage disclosed, not imputed | ✅ Pass |
| Reruns produce byte-identical output | ✅ Pass |
| One extra structural check | ✅ Pass |

**Result: 12 / 12 passing.**

---

## Getting started

There are two things you can spin up: the data pipeline (which produces the governed analytics and the Streamlit dashboard), and the full web app (React + FastAPI + AI chat).

### Part A — the data pipeline & Streamlit dashboard

```bash
# 1. Clone and enter the project
git clone <repo_url>
cd mandi-to-market-optimizer

# 2. Set up your environment
python3 -m venv .venv
source .venv/bin/activate          # Windows: .venv\Scripts\activate
pip install -r requirements.txt

# 3. Build the governed analytics layer
python scripts/generate_analytics.py

# 4. Run the 12-point governance audit
python scripts/validate_analytics.py

# 5. Launch the dashboard
streamlit run app.py
```

`generate_analytics.py` is fully deterministic — run it twice on the same inputs and you'll get byte-for-byte identical output. No random seeds, no non-deterministic joins.

### Part B — the full web app (frontend + backend + AI chat)

**What you'll need first:**
- Node.js v18+
- Python 3.9+
- A [Groq API key](https://console.groq.com/keys)

**Backend setup:**

```bash
cd backend
pip install fastapi uvicorn pandas groq python-dotenv pydantic plotly
```

Then rename `.env.example` to `.env` inside `backend/` and add your key:

```
GROQ_API_KEY=gsk_YOUR_GROQ_API_KEY_HERE
```

Start the server:

```bash
uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

The backend will be live at `http://localhost:8000`.

**Frontend setup:**

```bash
cd frontend
npm install
npm run dev
```

The frontend will be live at whatever local URL your terminal prints — usually `http://localhost:5173`.

To build for production:

```bash
npm run build
```

---
---

## Troubleshooting

- **Groq rate limit errors** — you've hit the token or request limit for your Groq tier. Wait a bit, or upgrade your tier.
- **Charts not showing up** — make sure your question compares columns that are actually quantifiable (e.g. "Compare Wheat and Rice against MSP" works; something vague won't).
- **Connection errors on the frontend** — double-check the FastAPI backend is actually running on port 8000 before you try using the app.

---

## What's on the dashboard

- **KPI summary cards** — total arrivals, average modal price vs. MSP, below-MSP rate, average transit hours.
- **Trend view** — daily arrivals and price movement over time.
- **Comparison view** — mandi-vs-mandi and warehouse-vs-warehouse performance.
- **Ranking view** — top mandis by volume, crops most exposed to MSP crashes.
- **Relationship view** — rainfall vs. arrivals scatter plot with the governed correlation number.
- Filters for date range, mandi, crop, and destination warehouse.

**Status:** the analytics generation and governance validation are done and passing 12/12. The Streamlit dashboard's live deployment is still pending final Board sign-off after Phase-1 validation — but the full web app (React + FastAPI + Ask MandiGrid) is already live at the demo link above.

---

## Known limitations

1. **Partial weather coverage** — sensors only cover 252 of 276 arrival dates (91.3%). Missing days are excluded from the correlation, not guessed at.
2. **Incomplete MSP records** — 2,869 of 12,000 price records don't have an MSP value, so they're excluded from the crash-rate calculation rather than counted as zero or as "not a crash."
3. **Correlation isn't causation** — the −0.0594 rainfall–arrival number is a weak, state-wide, aggregate association. It could easily hide stronger (or opposite) effects at the district level, and it doesn't mean weather *causes* arrival changes.
4. **The delay benchmark is relative, not official** — "delayed" means slower than that specific warehouse's own 75th-percentile transit time, not a violation of any external SLA.

---

## Tech stack

**Data pipeline & dashboard:** pandas · numpy · streamlit · plotly · matplotlib · seaborn · pytest

**Web app:** React · Vite · Tailwind CSS · Recharts (frontend) · FastAPI · Pandas (backend) · Groq API (`groq/compound-mini`) for the AI analyst

---

*Built for TransOrg AgentIQ Datathon 2026 — Track 3: AgriTech.*
