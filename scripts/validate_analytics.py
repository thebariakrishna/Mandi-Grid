"""
scripts/validate_analytics.py
Agritech Datathon 2026 — Analytics Governance & Validation Suite
All values calculated dynamically from source files. No hardcoded analytical results.
"""
import sys
import os
import json
import copy
import subprocess
import pandas as pd
import numpy as np
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
PROCESSED_DIR = BASE_DIR / "data" / "processed"
ANALYTICS_DIR = BASE_DIR / "data" / "analytics"

RESULTS = {}

def log_test(section, name, result, detail=""):
    status = "PASS" if result else "FAIL"
    print(f"  [{status}] {name}" + (f": {detail}" if detail else ""))
    RESULTS.setdefault(section, []).append(result)
    return result


# ─────────────────────────────────────────────────────────────────────────────
def run_validation():
    print("=" * 70)
    print("       AGRITECH ANALYTICS GOVERNANCE & VALIDATION SUITE v2      ")
    print("=" * 70)

    # ─── LOAD SOURCE FILES ──────────────────────────────────────────────────
    source_master = pd.read_csv(PROCESSED_DIR / "clean_mandi_master.csv")
    source_arrivals = pd.read_csv(PROCESSED_DIR / "clean_mandi_arrivals.csv")
    with open(PROCESSED_DIR / "clean_price_and_msp.json") as f:
        source_prices = pd.DataFrame(json.load(f))
    source_transport = pd.read_csv(PROCESSED_DIR / "clean_transport_logistics.csv")
    source_weather = pd.read_csv(PROCESSED_DIR / "weather_cleaned.csv")

    # ─── LOAD ANALYTICS FILES ───────────────────────────────────────────────
    daily_df      = pd.read_csv(ANALYTICS_DIR / "daily_mandi_analytics.csv")
    crop_df       = pd.read_csv(ANALYTICS_DIR / "crop_summary.csv")
    mandi_df      = pd.read_csv(ANALYTICS_DIR / "mandi_summary.csv")
    price_df      = pd.read_csv(ANALYTICS_DIR / "price_msp_analysis.csv")
    transport_df  = pd.read_csv(ANALYTICS_DIR / "transport_summary.csv")
    weather_df    = pd.read_csv(ANALYTICS_DIR / "weather_arrival_analysis.csv")
    with open(ANALYTICS_DIR / "dashboard_metrics.json") as f:
        metrics_json = json.load(f)
    with open(ANALYTICS_DIR / "insights.json") as f:
        insights_json = json.load(f)

    # ─────────────────────────────────────────────────────────────────────────
    # A. REQUIRED FILES
    # ─────────────────────────────────────────────────────────────────────────
    print("\n[A] Required Files:")
    required_files = [
        "daily_mandi_analytics.csv", "crop_summary.csv", "mandi_summary.csv",
        "price_msp_analysis.csv", "transport_summary.csv",
        "weather_arrival_analysis.csv", "dashboard_metrics.json", "insights.json"
    ]
    for fname in required_files:
        fpath = ANALYTICS_DIR / fname
        log_test("files", fname, fpath.exists(), f"{fpath.stat().st_size} bytes" if fpath.exists() else "MISSING")

    # ─────────────────────────────────────────────────────────────────────────
    # B. REQUIRED COLUMNS
    # ─────────────────────────────────────────────────────────────────────────
    print("\n[B] Required Columns:")
    req_cols = {
        "daily_mandi_analytics.csv": ["date", "mandi_id", "crop_name",
            "arrival_quantity_qtl", "farmer_count", "modal_price", "msp",
            "price_gap", "price_gap_percent", "below_msp"],
        "crop_summary.csv": ["crop_name", "total_arrival_qtl",
            "valid_price_msp_records", "price_crash_count",
            "below_msp_rate_percent", "arrival_share_percent"],
        "mandi_summary.csv": ["mandi_id", "mandi_name", "district", "state",
            "total_arrival_qtl", "arrival_rank", "total_trips_departed"],
        "price_msp_analysis.csv": ["record_id", "date", "mandi_id",
            "crop_name", "modal_price", "msp", "price_gap", "below_msp", "severity"],
        "transport_summary.csv": ["destination_warehouse", "total_trips",
            "avg_transit_hours", "median_transit_hours",
            "delayed_trips_count", "transit_delay_rate_percent"],
        "weather_arrival_analysis.csv": ["date", "district", "rainfall_mm",
            "temperature_celsius", "humidity_percent", "arrival_quantity_qtl"],
    }
    for fname, cols in req_cols.items():
        df_t = pd.read_csv(ANALYTICS_DIR / fname)
        missing = [c for c in cols if c not in df_t.columns]
        log_test("cols", f"Schema {fname}", not missing,
                 f"All {len(cols)} required columns present" if not missing else f"Missing: {missing}")

    # ─────────────────────────────────────────────────────────────────────────
    # C. ANALYTICAL GRAIN UNIQUENESS
    # ─────────────────────────────────────────────────────────────────────────
    print("\n[C] Analytical Grain Uniqueness:")
    grain_dups = daily_df.duplicated(subset=["date", "mandi_id", "crop_name"]).sum()
    log_test("grain", "daily_mandi_analytics (date+mandi_id+crop_name)", grain_dups == 0,
             f"Duplicates: {grain_dups}")

    # ─────────────────────────────────────────────────────────────────────────
    # D. NONNEGATIVE MEASURES
    # ─────────────────────────────────────────────────────────────────────────
    print("\n[D] Nonnegative Measures:")
    checks = [
        ("daily arrival_quantity_qtl", daily_df["arrival_quantity_qtl"].dropna()),
        ("crop total_arrival_qtl",     crop_df["total_arrival_qtl"].dropna()),
        ("mandi total_arrival_qtl",    mandi_df["total_arrival_qtl"].dropna()),
        ("transport avg_transit_hours", transport_df["avg_transit_hours"].dropna()),
        ("weather rainfall_mm",        weather_df["rainfall_mm"].dropna()),
    ]
    for name, series in checks:
        log_test("nonneg", name, (series >= 0).all(), f"min={series.min():.4f}")

    # ─────────────────────────────────────────────────────────────────────────
    # E. PRICE FORMULAS
    # ─────────────────────────────────────────────────────────────────────────
    print("\n[E] Price Formulas:")
    valid_mask = (daily_df["modal_price"].notnull() &
                  daily_df["msp"].notnull() & (daily_df["msp"] > 0))
    sub = daily_df[valid_mask]
    gap_err = (sub["price_gap"] - (sub["modal_price"] - sub["msp"]).round(2)).abs().max()
    log_test("price", "price_gap = modal - msp", gap_err < 0.05, f"max_error={gap_err:.6f}")
    pct_err = (sub["price_gap_percent"] -
               (((sub["modal_price"] - sub["msp"]) / sub["msp"]) * 100).round(2)).abs().max()
    log_test("price", "price_gap_percent formula", pct_err < 0.05, f"max_error={pct_err:.6f}")

    # ─────────────────────────────────────────────────────────────────────────
    # F. BELOW-MSP GOVERNED DENOMINATOR & MISSINGNESS
    # ─────────────────────────────────────────────────────────────────────────
    print("\n[F] Below-MSP Governed Denominator & Missingness:")
    valid_src = source_prices[source_prices["modal_price"].notnull() &
                              source_prices["msp"].notnull() & (source_prices["msp"] > 0)]
    exp_denom = len(valid_src)
    exp_count = int((valid_src["modal_price"] < valid_src["msp"]).sum())
    exp_rate  = round((exp_count / exp_denom) * 100.0, 2)

    rep_denom = metrics_json["summary"]["valid_price_msp_observations"]
    rep_count = metrics_json["summary"]["below_msp_count"]
    rep_rate  = metrics_json["summary"]["below_msp_rate_pct"]

    log_test("denominator", "Governed denominator in JSON",
             rep_denom == exp_denom, f"Reported={rep_denom}, Expected={exp_denom}")
    log_test("denominator", "Below-MSP crash count",
             rep_count == exp_count, f"Reported={rep_count}, Expected={exp_count}")
    log_test("denominator", "Below-MSP rate %",
             rep_rate == exp_rate, f"Reported={rep_rate}%, Expected={exp_rate}%")

    # Missingness: records missing modal/msp must produce NaN below_msp
    missing_mask = (price_df["modal_price"].isnull() |
                    price_df["msp"].isnull() | (price_df["msp"] == 0))
    miss_nan_ok = price_df[missing_mask]["below_msp"].isnull().all()
    log_test("denominator", "Missing modal/MSP → below_msp is NaN (not 0)", miss_nan_ok)

    # ─────────────────────────────────────────────────────────────────────────
    # G. PERCENTAGE BOUNDS
    # ─────────────────────────────────────────────────────────────────────────
    print("\n[G] Percentage Bounds (0 ≤ pct ≤ 100):")
    pct_fields = [
        ("crop below_msp_rate_percent",            crop_df["below_msp_rate_percent"]),
        ("crop arrival_share_percent",             crop_df["arrival_share_percent"]),
        ("transport transit_delay_rate_percent",   transport_df["transit_delay_rate_percent"]),
    ]
    for name, series in pct_fields:
        ok = ((series >= 0) & (series <= 100)).all()
        log_test("pct", name, ok, f"range=[{series.min():.2f}, {series.max():.2f}]")

    # ─────────────────────────────────────────────────────────────────────────
    # H. ZERO-DIVISION & INF CHECK
    # ─────────────────────────────────────────────────────────────────────────
    print("\n[H] Zero-Division & Inf Check:")
    for fname in ["daily_mandi_analytics.csv", "crop_summary.csv",
                  "mandi_summary.csv", "transport_summary.csv"]:
        df_t = pd.read_csv(ANALYTICS_DIR / fname)
        num_cols = df_t.select_dtypes(include=[np.number]).columns
        has_inf = np.isinf(df_t[num_cols].fillna(0).values).any()
        log_test("inf", f"No Inf in {fname}", not has_inf,
                 "Clean" if not has_inf else "Found Inf!")

    # ─────────────────────────────────────────────────────────────────────────
    # I. JOIN CARDINALITY
    # ─────────────────────────────────────────────────────────────────────────
    print("\n[I] Join Cardinality Reconciliation:")
    src_total = source_arrivals["arrival_quantity_qtl"].sum()
    daily_total = daily_df["arrival_quantity_qtl"].sum()
    crop_total  = crop_df["total_arrival_qtl"].sum()
    log_test("cardinality", "Daily sum == source sum",
             abs(src_total - daily_total) < 1.0, f"src={src_total:.2f} daily={daily_total:.2f}")
    log_test("cardinality", "Crop summary sum == source sum",
             abs(src_total - crop_total) < 1.0,  f"src={src_total:.2f} crop={crop_total:.2f}")

    # ─────────────────────────────────────────────────────────────────────────
    # J. ARRIVAL ID VALIDATION
    # ─────────────────────────────────────────────────────────────────────────
    print("\n[J] Arrival ID Validation:")
    total_rows        = len(source_arrivals)
    null_id_count     = source_arrivals["arrival_id"].isnull().sum()
    nonnull_ids       = source_arrivals["arrival_id"].dropna()
    unique_nonnull    = nonnull_ids.nunique()
    dup_nonnull       = int(nonnull_ids.duplicated().sum())

    log_test("arrival_id", f"Arrival row count ({total_rows})", total_rows == 24525,
             f"rows={total_rows}")
    log_test("arrival_id", f"Missing arrival_id: {null_id_count} (known data-quality condition)",
             null_id_count == 1, f"missing={null_id_count}")
    log_test("arrival_id", "Non-null unique arrival IDs",
             unique_nonnull == 24524, f"unique_nonnull={unique_nonnull}")
    log_test("arrival_id", "Duplicate non-null arrival IDs = 0 (no duplicates)",
             dup_nonnull == 0, f"dup_nonnull={dup_nonnull}")

    # ─────────────────────────────────────────────────────────────────────────
    # K. SOURCE RECONCILIATION
    # ─────────────────────────────────────────────────────────────────────────
    print("\n[K] Source Reconciliation:")

    # Arrivals
    log_test("recon", "Arrivals: source row count",
             len(source_arrivals) == 24525, f"{len(source_arrivals)}")
    log_test("recon", "Arrivals: qty sum matches JSON total_arrivals_qtl",
             abs(src_total - metrics_json["summary"]["total_arrivals_qtl"]) < 1.0,
             f"src={src_total:.2f} json={metrics_json['summary']['total_arrivals_qtl']}")

    # Prices
    log_test("recon", "Prices: source record count",
             len(source_prices) == 12000, f"{len(source_prices)}")
    log_test("recon", "Prices: valid paired obs in JSON",
             metrics_json["summary"]["valid_price_msp_observations"] == exp_denom,
             f"{metrics_json['summary']['valid_price_msp_observations']}")
    log_test("recon", "Prices: below_msp_count in JSON",
             metrics_json["summary"]["below_msp_count"] == exp_count,
             f"{metrics_json['summary']['below_msp_count']}")
    # Below-MSP rate cross-check
    log_test("recon", "Prices: below_msp_rate_pct in JSON",
             metrics_json["summary"]["below_msp_rate_pct"] == exp_rate,
             f"{metrics_json['summary']['below_msp_rate_pct']}%")

    # Transport
    log_test("recon", "Transport: source trip count",
             len(source_transport) == 10000, f"{len(source_transport)}")
    wh_trip_total = int(transport_df["total_trips"].sum())
    log_test("recon", "Transport: warehouse totals sum",
             wh_trip_total == len(source_transport),
             f"wh_sum={wh_trip_total}")

    # Master
    log_test("recon", "Master: mandi count",
             len(source_master) == 57 == len(mandi_df), f"{len(source_master)}")
    # All arrivals mandis in master
    arr_mandis = set(source_arrivals["mandi_id"].dropna())
    master_mandis = set(source_master["mandi_id"])
    log_test("recon", "All arrival mandi_ids in master",
             arr_mandis.issubset(master_mandis),
             f"arrivals={len(arr_mandis)} master={len(master_mandis)}")

    # Crops
    obs_crops = set(source_arrivals["crop_name"].dropna().unique())
    log_test("recon", "Observed crop count = 6",
             len(obs_crops) == 6, f"crops={sorted(obs_crops)}")
    log_test("recon", "Crop summary row count = 6",
             len(crop_df) == 6, f"{len(crop_df)}")
    total_share = crop_df["arrival_share_percent"].sum()
    log_test("recon", "Crop share % sums to ~100%",
             abs(total_share - 100.0) < 0.5, f"{total_share:.2f}%")

    # Weather
    log_test("recon", "Weather: source observation count",
             len(source_weather) == 15000, f"{len(source_weather)}")

    # ─────────────────────────────────────────────────────────────────────────
    # L. WEATHER COVERAGE DISTINCTION
    # ─────────────────────────────────────────────────────────────────────────
    print("\n[L] Weather Coverage Distinction:")
    arr_dates = set(source_arrivals["date"].dropna().unique())
    source_weather["date"] = pd.to_datetime(
        source_weather["timestamp_ist"]).dt.strftime("%Y-%m-%d")
    w_dates = set(source_weather["date"].dropna().unique())
    intersect = w_dates.intersection(arr_dates)

    exp_date_cov = round(len(intersect) / len(arr_dates) * 100.0, 2)
    arr_on_w = source_arrivals[source_arrivals["date"].isin(w_dates)]
    exp_rec_cov  = round(len(arr_on_w) / len(source_arrivals) * 100.0, 2)

    rep_w = metrics_json["summary"]["weather_date_coverage"]
    log_test("weather", f"Unique-date coverage ({len(intersect)}/{len(arr_dates)})",
             rep_w["unique_date_coverage_pct"] == exp_date_cov,
             f"reported={rep_w['unique_date_coverage_pct']}% expected={exp_date_cov}%")
    log_test("weather", f"Arrival-record coverage ({len(arr_on_w)}/{len(source_arrivals)})",
             rep_w["arrival_record_coverage_pct"] == exp_rec_cov,
             f"reported={rep_w['arrival_record_coverage_pct']}% expected={exp_rec_cov}%")
    log_test("weather", "Arrival dates count",
             rep_w["arrival_dates_count"] == len(arr_dates),
             f"reported={rep_w['arrival_dates_count']} expected={len(arr_dates)}")
    log_test("weather", "Weather dates count",
             rep_w["weather_dates_count"] == len(w_dates),
             f"reported={rep_w['weather_dates_count']} expected={len(w_dates)}")

    # ─────────────────────────────────────────────────────────────────────────
    # M. TRANSIT BENCHMARK DOCUMENTATION
    # ─────────────────────────────────────────────────────────────────────────
    print("\n[M] Transit Delay Benchmark:")
    benchmark_text = metrics_json["summary"].get("transit_delay_benchmark", "")
    has_p75 = "75th" in benchmark_text.lower() or "percentile" in benchmark_text.lower()
    no_sla  = "sla" not in benchmark_text.lower()
    log_test("transit", "Benchmark uses P75 language", has_p75, benchmark_text[:80])
    log_test("transit", "Benchmark does not claim 'official SLA'", no_sla)

    # Verify delay rate sums as expected from transport_summary
    delay_overall = round(transport_df["delayed_trips_count"].sum() / transport_df["total_trips"].sum() * 100.0, 2)
    log_test("transit", "Overall delay rate matches sum of warehouse counts",
             abs(metrics_json["summary"]["transit_delay_rate_pct"] - delay_overall) < 0.1,
             f"json={metrics_json['summary']['transit_delay_rate_pct']}% recalc={delay_overall}%")

    # ─────────────────────────────────────────────────────────────────────────
    # N. INSIGHT METHODOLOGY
    # ─────────────────────────────────────────────────────────────────────────
    print("\n[N] Insight Methodology:")
    insights_list = insights_json.get("insights", [])
    log_test("insight", "At least 4 insights present", len(insights_list) >= 4,
             f"count={len(insights_list)}")
    for ins in insights_list:
        has_meth   = bool(ins.get("methodology"))
        has_metric = bool(ins.get("supporting_metrics"))
        no_cause   = "causes" not in ins.get("statement", "").lower()
        log_test("insight", f"{ins['id']} has methodology + metrics", has_meth and has_metric)
        log_test("insight", f"{ins['id']} does not claim causation", no_cause,
                 ins.get("statement", "")[:80])
    # generated_at must not be empty
    gen_at = insights_json["metadata"].get("generated_at", "")
    log_test("insight", "generated_at is non-empty ISO date",
             bool(gen_at) and len(gen_at) == 10, f"generated_at='{gen_at}'")

    # ─────────────────────────────────────────────────────────────────────────
    # O. DETERMINISTIC ALL-OUTPUT RERUN
    # ─────────────────────────────────────────────────────────────────────────
    print("\n[O] Deterministic All-Output Rerun:")

    # Snapshot current outputs
    def snapshot_csv(path):
        return pd.read_csv(path)

    def snapshot_json(path):
        with open(path) as fh:
            return json.load(fh)

    snapshots_before = {}
    for fname in required_files:
        fpath = ANALYTICS_DIR / fname
        if fname.endswith(".csv"):
            snapshots_before[fname] = snapshot_csv(fpath)
        else:
            snapshots_before[fname] = snapshot_json(fpath)

    # Re-run generator
    res = subprocess.run([sys.executable, str(BASE_DIR / "scripts" / "generate_analytics.py")],
                         capture_output=True, text=True)
    gen_ok = res.returncode == 0
    log_test("determinism", "Analytics generator ran cleanly", gen_ok,
             "OK" if gen_ok else res.stderr[:200])

    # Compare all outputs
    all_det_ok = gen_ok
    for fname in required_files:
        fpath = ANALYTICS_DIR / fname
        if fname.endswith(".csv"):
            after = snapshot_csv(fpath)
            before = snapshots_before[fname]
            try:
                ok = before.equals(after)
            except Exception:
                ok = False
            log_test("determinism", f"Determinism — {fname}", ok)
        else:
            after = snapshot_json(fpath)
            before = snapshots_before[fname]
            # For insights, exclude generated_at (runtime timestamp changes)
            if fname == "insights.json":
                b2 = copy.deepcopy(before); a2 = copy.deepcopy(after)
                b2["metadata"].pop("generated_at", None)
                a2["metadata"].pop("generated_at", None)
                ok = (b2 == a2)
            else:
                ok = (before == after)
            log_test("determinism", f"Determinism — {fname}", ok)
            if not ok:
                all_det_ok = False
    overall_det = all(RESULTS.get("determinism", [False]))
    log_test("determinism", "Overall deterministic rerun", overall_det)

    # ─────────────────────────────────────────────────────────────────────────
    # FINAL SUMMARY
    # ─────────────────────────────────────────────────────────────────────────
    all_ok = all(v for vals in RESULTS.values() for v in vals)

    print("\n" + "=" * 70)
    print("                   ANALYTICS VALIDATION REPORT                   ")
    print("=" * 70)

    section_names = {
        "files":       "Required files",
        "cols":        "Required columns",
        "grain":       "Analytical grain uniqueness",
        "nonneg":      "Nonnegative measures",
        "price":       "Price formulas",
        "denominator": "Below-MSP denominator & missingness",
        "pct":         "Percentage bounds",
        "inf":         "Zero division / Inf protection",
        "cardinality": "Join cardinality",
        "arrival_id":  "Arrival ID validation",
        "recon":       "Source reconciliation",
        "weather":     "Weather coverage distinction",
        "transit":     "Transit delay benchmark",
        "insight":     "Insight methodology",
        "determinism": "Deterministic all-output rerun",
    }
    for key, label in section_names.items():
        vals = RESULTS.get(key, [False])
        status = "PASS" if all(vals) else "FAIL"
        print(f"  {label:<42} {status}")

    print("=" * 70)
    if all_ok:
        print("  OVERALL STATUS: PASS")
        sys.exit(0)
    else:
        print("  OVERALL STATUS: FAIL")
        sys.exit(1)


if __name__ == "__main__":
    run_validation()
