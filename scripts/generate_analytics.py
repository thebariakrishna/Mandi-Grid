import os
import datetime
import json
import pandas as pd
import numpy as np
from pathlib import Path

# Base Paths
BASE_DIR = Path(__file__).resolve().parent.parent
PROCESSED_DIR = BASE_DIR / "data" / "processed"
ANALYTICS_DIR = BASE_DIR / "data" / "analytics"

def load_processed_data():
    """Load frozen cleaned datasets safely."""
    master = pd.read_csv(PROCESSED_DIR / "clean_mandi_master.csv")
    arrivals = pd.read_csv(PROCESSED_DIR / "clean_mandi_arrivals.csv")
    
    with open(PROCESSED_DIR / "clean_price_and_msp.json", "r") as f:
        price_list = json.load(f)
    prices = pd.DataFrame(price_list)
    
    transport = pd.read_csv(PROCESSED_DIR / "clean_transport_logistics.csv")
    weather = pd.read_csv(PROCESSED_DIR / "weather_cleaned.csv")
    
    return master, arrivals, prices, transport, weather

def generate_daily_mandi_analytics(master, arrivals, prices):
    """
    Preferred market grain: date + mandi_id + crop_name.
    Aggregate arrivals and prices before joining to prevent row multiplication.
    """
    # 1. Aggregate Arrivals by date + mandi_id + crop_name
    arr_agg = arrivals.groupby(["date", "mandi_id", "crop_name"], as_index=False).agg(
        arrival_quantity_qtl=("arrival_quantity_qtl", "sum"),
        farmer_count=("farmer_count", lambda x: x.sum(min_count=1)),
        arrival_record_count=("arrival_id", "count")
    )
    
    # Calculate arrival per farmer only where farmer_count > 0
    arr_agg["arrival_per_farmer_qtl"] = np.where(
        (arr_agg["farmer_count"].notnull()) & (arr_agg["farmer_count"] > 0),
        arr_agg["arrival_quantity_qtl"] / arr_agg["farmer_count"],
        np.nan
    )
    
    # Round arrival per farmer
    arr_agg["arrival_per_farmer_qtl"] = arr_agg["arrival_per_farmer_qtl"].round(2)
    arr_agg["arrival_quantity_qtl"] = arr_agg["arrival_quantity_qtl"].round(2)
    
    # 2. Aggregate Prices by date + mandi_id + crop_name
    # Preserve valid modal and MSP paired records
    price_agg = prices.groupby(["date", "mandi_id", "crop_name"], as_index=False).agg(
        min_price=("min_price", "mean"),
        max_price=("max_price", "mean"),
        modal_price=("modal_price", "mean"),
        msp=("msp", "mean"),
        price_record_count=("record_id", "count")
    )
    
    for col in ["min_price", "max_price", "modal_price", "msp"]:
        price_agg[col] = price_agg[col].round(2)
    
    # 3. Outer Join aggregated arrivals and prices on grain
    daily = pd.merge(arr_agg, price_agg, on=["date", "mandi_id", "crop_name"], how="outer")
    
    # 4. Enrich with Mandi Master metadata
    daily = pd.merge(daily, master[["mandi_id", "mandi_name", "district", "state"]], on="mandi_id", how="left")
    
    # 5. Compute price gap and MSP flags with strict missingness preservation
    valid_mask = daily["modal_price"].notnull() & daily["msp"].notnull() & (daily["msp"] > 0)
    
    daily["price_gap"] = np.where(
        valid_mask,
        (daily["modal_price"] - daily["msp"]).round(2),
        np.nan
    )
    
    daily["price_gap_percent"] = np.where(
        valid_mask,
        (((daily["modal_price"] - daily["msp"]) / daily["msp"]) * 100.0).round(2),
        np.nan
    )
    
    # below_msp must be float (1.0, 0.0, NaN) so missing records remain missing!
    daily["below_msp"] = np.where(
        valid_mask,
        np.where(daily["modal_price"] < daily["msp"], 1.0, 0.0),
        np.nan
    )
    
    # Sort deterministically
    daily = daily.sort_values(by=["date", "mandi_id", "crop_name"]).reset_index(drop=True)
    
    return daily

def generate_crop_summary(daily_analytics):
    """Summarize performance by crop_name using governed denominators."""
    grand_total_arrival = daily_analytics["arrival_quantity_qtl"].sum()
    
    crop_sum = daily_analytics.groupby("crop_name", as_index=False).agg(
        total_arrival_qtl=("arrival_quantity_qtl", "sum"),
        arrival_records=("arrival_record_count", "sum"),
        total_farmer_count=("farmer_count", "sum"),
        avg_modal_price=("modal_price", "mean"),
        avg_msp=("msp", "mean"),
        avg_price_gap=("price_gap", "mean")
    )
    
    # Governed denominator for below-MSP calculation: valid paired modal & MSP observations where MSP > 0
    valid_price = daily_analytics[daily_analytics["below_msp"].notnull()]
    crash_stats = valid_price.groupby("crop_name").agg(
        valid_price_msp_records=("below_msp", "count"),
        price_crash_count=("below_msp", lambda x: int((x == 1.0).sum()))
    ).reset_index()
    
    crop_sum = pd.merge(crop_sum, crash_stats, on="crop_name", how="left")
    crop_sum["valid_price_msp_records"] = crop_sum["valid_price_msp_records"].fillna(0).astype(int)
    crop_sum["price_crash_count"] = crop_sum["price_crash_count"].fillna(0).astype(int)
    
    crop_sum["arrival_share_percent"] = np.where(
        grand_total_arrival > 0,
        ((crop_sum["total_arrival_qtl"] / grand_total_arrival) * 100.0).round(2),
        0.0
    )
    
    crop_sum["below_msp_rate_percent"] = np.where(
        crop_sum["valid_price_msp_records"] > 0,
        ((crop_sum["price_crash_count"] / crop_sum["valid_price_msp_records"]) * 100.0).round(2),
        0.0
    )
    
    for col in ["total_arrival_qtl", "avg_modal_price", "avg_msp", "avg_price_gap"]:
        crop_sum[col] = crop_sum[col].round(2)
        
    crop_sum = crop_sum.sort_values(by="total_arrival_qtl", ascending=False).reset_index(drop=True)
    return crop_sum

def generate_mandi_summary(master, daily_analytics, transport):
    """Summarize performance by mandi_id."""
    m_agg = daily_analytics.groupby("mandi_id", as_index=False).agg(
        total_arrival_qtl=("arrival_quantity_qtl", "sum"),
        unique_crops_count=("crop_name", "nunique"),
        total_farmer_count=("farmer_count", "sum"),
        avg_modal_price=("modal_price", "mean")
    )
    
    # Price crash count using valid paired observations
    valid_price = daily_analytics[daily_analytics["below_msp"].notnull()]
    price_crash_mandi = valid_price.groupby("mandi_id").agg(
        price_crash_count=("below_msp", lambda x: int((x == 1.0).sum())),
        valid_price_msp_records=("below_msp", "count")
    ).reset_index()
    
    # Transport trips originating from mandi
    tr_agg = transport.groupby("mandi_id_clean", as_index=False).agg(
        total_trips_departed=("trip_id", "count")
    ).rename(columns={"mandi_id_clean": "mandi_id"})
    
    mandi_sum = pd.merge(master, m_agg, on="mandi_id", how="left")
    mandi_sum = pd.merge(mandi_sum, price_crash_mandi, on="mandi_id", how="left")
    mandi_sum = pd.merge(mandi_sum, tr_agg, on="mandi_id", how="left")
    
    mandi_sum["total_arrival_qtl"] = mandi_sum["total_arrival_qtl"].fillna(0).round(2)
    mandi_sum["total_trips_departed"] = mandi_sum["total_trips_departed"].fillna(0).astype(int)
    mandi_sum["price_crash_count"] = mandi_sum["price_crash_count"].fillna(0).astype(int)
    mandi_sum["valid_price_msp_records"] = mandi_sum["valid_price_msp_records"].fillna(0).astype(int)
    mandi_sum["unique_crops_count"] = mandi_sum["unique_crops_count"].fillna(0).astype(int)
    mandi_sum["avg_modal_price"] = mandi_sum["avg_modal_price"].round(2)
    
    # Rank mandis by arrival volume
    mandi_sum["arrival_rank"] = mandi_sum["total_arrival_qtl"].rank(ascending=False, method="min").astype(int)
    
    mandi_sum = mandi_sum.sort_values(by="arrival_rank").reset_index(drop=True)
    return mandi_sum

def generate_price_msp_analysis(prices, master):
    """Record-level Price & MSP gap and crash severity classification with missingness preservation."""
    df = prices.copy()
    
    # Enrich with master info if missing mandi_name/state
    df = pd.merge(df, master[["mandi_id", "mandi_name", "state"]], on="mandi_id", how="left")
    
    valid_mask = df["modal_price"].notnull() & df["msp"].notnull() & (df["msp"] > 0)
    
    df["price_gap"] = np.where(valid_mask, (df["modal_price"] - df["msp"]).round(2), np.nan)
    df["price_gap_percent"] = np.where(valid_mask, (((df["modal_price"] - df["msp"]) / df["msp"]) * 100.0).round(2), np.nan)
    
    # below_msp is float so missing values stay missing (NaN) instead of becoming 0 (False)!
    df["below_msp"] = np.where(valid_mask, np.where(df["modal_price"] < df["msp"], 1.0, 0.0), np.nan)
    
    # Illustrative severity classification only.
    # The -10% threshold is NOT an official policy or market threshold.
    # It is an arbitrary exploratory boundary kept for reference only.
    # Do not use 'severity' for core business claims.
    conditions = [
        ~valid_mask,
        (df["modal_price"] >= df["msp"]),
        (df["modal_price"] < df["msp"]) & (df["price_gap_percent"] >= -10.0),
        (df["modal_price"] < df["msp"]) & (df["price_gap_percent"] < -10.0)
    ]
    choices = ["UNKNOWN", "ABOVE_OR_EQUAL_MSP", "MODERATE_CRASH", "SEVERE_CRASH"]
    df["severity"] = np.select(conditions, choices, default="UNKNOWN")
    df["severity_note"] = "Illustrative analytical classification only; the -10% threshold is not an official policy or market threshold."
    
    df = df.sort_values(by=["date", "mandi_id", "crop_name"]).reset_index(drop=True)
    return df

def generate_transport_summary(transport):
    """
    Warehouse-level logistics summary.
    Benchmark: Warehouse-level 75th percentile of transit time (Data-derived relative delay benchmark).
    """
    tr = transport.copy()
    
    # Calculate 75th percentile transit time per warehouse as data-derived benchmark
    p75_per_wh = tr.groupby("destination_warehouse")["transit_hours_final"].transform(lambda x: x.quantile(0.75))
    tr["is_delayed"] = np.where(tr["transit_hours_final"] > p75_per_wh, 1, 0)
    
    wh_sum = tr.groupby("destination_warehouse", as_index=False).agg(
        total_trips=("trip_id", "count"),
        avg_transit_hours=("transit_hours_final", "mean"),
        median_transit_hours=("transit_hours_final", "median"),
        min_transit_hours=("transit_hours_final", "min"),
        max_transit_hours=("transit_hours_final", "max"),
        avg_distance_km=("distance_km", "mean"),
        delayed_trips_count=("is_delayed", "sum"),
        unique_mandis_served=("mandi_id_clean", "nunique")
    )
    
    wh_sum["transit_delay_rate_percent"] = ((wh_sum["delayed_trips_count"] / wh_sum["total_trips"]) * 100.0).round(2)
    wh_sum["delay_benchmark_note"] = "Data-derived relative delay benchmark: warehouse-level 75th percentile of transit time."
    
    for col in ["avg_transit_hours", "median_transit_hours", "min_transit_hours", "max_transit_hours", "avg_distance_km"]:
        wh_sum[col] = wh_sum[col].round(2)
        
    wh_sum = wh_sum.sort_values(by="total_trips", ascending=False).reset_index(drop=True)
    return wh_sum, tr

def generate_weather_arrival_analysis(weather, arrivals, master):
    """Correlate daily weather observation aggregations with daily crop arrivals."""
    weather["date"] = pd.to_datetime(weather["timestamp_ist"]).dt.strftime("%Y-%m-%d")
    
    # Aggregate weather to daily district level
    w_district = weather.groupby(["date", "district"], as_index=False).agg(
        rainfall_mm=("rainfall_mm", "mean"),
        temperature_celsius=("temperature_celsius", "mean"),
        humidity_percent=("humidity_percent", "mean")
    )
    
    # Aggregate arrivals to daily district level
    arr_m = pd.merge(arrivals, master[["mandi_id", "district"]], on="mandi_id", how="left")
    arr_district = arr_m.groupby(["date", "district"], as_index=False).agg(
        arrival_quantity_qtl=("arrival_quantity_qtl", "sum"),
        arrival_records=("arrival_id", "count")
    )
    
    weather_arr_district = pd.merge(w_district, arr_district, on=["date", "district"], how="inner")
    for col in ["rainfall_mm", "temperature_celsius", "humidity_percent", "arrival_quantity_qtl"]:
        weather_arr_district[col] = weather_arr_district[col].round(2)
        
    # Aggregate to daily overall level for correlation
    w_daily = weather.groupby("date", as_index=False).agg(
        daily_avg_rainfall_mm=("rainfall_mm", "mean"),
        daily_avg_temp_celsius=("temperature_celsius", "mean"),
        daily_avg_humidity_percent=("humidity_percent", "mean")
    )
    
    arr_daily = arrivals.groupby("date", as_index=False).agg(
        daily_total_arrival_qtl=("arrival_quantity_qtl", "sum")
    )
    
    daily_combined = pd.merge(w_daily, arr_daily, on="date", how="inner")
    daily_combined = daily_combined.sort_values(by="date").reset_index(drop=True)
    
    return weather_arr_district, daily_combined

def generate_json_outputs(daily_analytics, crop_sum, mandi_sum, price_analysis, wh_sum, transport_full, daily_weather_comb, arrivals, weather):
    """Generate dashboard_metrics.json and insights.json dynamically with governed denominators."""
    
    total_arrivals = float(daily_analytics["arrival_quantity_qtl"].sum())
    total_mandis = int(mandi_sum["mandi_id"].nunique())
    total_crops = int(crop_sum["crop_name"].nunique())
    
    # Governed paired Modal/MSP population
    valid_price = price_analysis[price_analysis["below_msp"].notnull()]
    valid_price_count = len(valid_price)
    below_msp_count = int((valid_price["below_msp"] == 1.0).sum())
    below_msp_rate_pct = float((below_msp_count / valid_price_count) * 100.0) if valid_price_count > 0 else 0.0
    
    avg_modal_price = float(valid_price["modal_price"].mean())
    avg_msp = float(valid_price["msp"].mean())
    avg_price_gap = float(valid_price["price_gap"].mean())
    
    avg_transit_hours = float(transport_full["transit_hours_final"].mean())
    total_delayed_trips = int(transport_full["is_delayed"].sum())
    overall_delay_rate = float((total_delayed_trips / len(transport_full)) * 100.0)
    
    # Weather Coverage calculations
    arr_dates = set(arrivals["date"].dropna().unique())
    weather_dates = set(weather["timestamp_ist"].str[:10].dropna().unique())
    intersect_dates = weather_dates.intersection(arr_dates)
    
    date_coverage_pct = float((len(intersect_dates) / len(arr_dates)) * 100.0)
    
    arr_on_w_dates = arrivals[arrivals["date"].isin(weather_dates)]
    record_coverage_pct = float((len(arr_on_w_dates) / len(arrivals)) * 100.0)
    
    # Pearson correlation
    valid_w = daily_weather_comb.dropna(subset=["daily_avg_rainfall_mm", "daily_total_arrival_qtl"])
    if len(valid_w) > 1:
        corr_val = float(np.corrcoef(valid_w["daily_avg_rainfall_mm"], valid_w["daily_total_arrival_qtl"])[0, 1])
    else:
        corr_val = 0.0
        
    top_5_mandis = mandi_sum.head(5)[["mandi_id", "mandi_name", "district", "state", "total_arrival_qtl"]].to_dict(orient="records")
    crop_dist = crop_sum[["crop_name", "total_arrival_qtl", "arrival_share_percent"]].to_dict(orient="records")
    
    dashboard_metrics = {
        "summary": {
            "total_arrivals_qtl": round(total_arrivals, 2),
            "total_mandis": total_mandis,
            "total_crops": total_crops,
            "total_price_records": len(price_analysis),
            "valid_price_msp_observations": valid_price_count,
            "below_msp_count": below_msp_count,
            "below_msp_rate_pct": round(below_msp_rate_pct, 2),
            "governed_avg_modal_price_rs_qtl": round(avg_modal_price, 2),
            "governed_avg_msp_rs_qtl": round(avg_msp, 2),
            "governed_avg_price_gap_rs_qtl": round(avg_price_gap, 2),
            "avg_transit_hours_overall": round(avg_transit_hours, 2),
            "transit_delay_rate_pct": round(overall_delay_rate, 2),
            "transit_delay_benchmark": "Data-derived relative delay benchmark: warehouse-level 75th percentile of transit time.",
            "weather_date_coverage": {
                "arrival_dates_count": len(arr_dates),
                "weather_dates_count": len(weather_dates),
                "unique_date_coverage_pct": round(date_coverage_pct, 2),
                "arrival_record_coverage_pct": round(record_coverage_pct, 2)
            },
            "rainfall_arrival_correlation": round(corr_val, 4),
            "correlation_interpretation": "Linear association between daily average rainfall (mm) and daily total arrivals (Qtl). Note: represents association, not causation."
        },
        "top_5_mandis": top_5_mandis,
        "crop_distribution": crop_dist,
        "warehouse_logistics": wh_sum[["destination_warehouse", "total_trips", "avg_transit_hours", "transit_delay_rate_percent"]].to_dict(orient="records")
    }
    
    # Dynamic evidence-backed insights
    top_crop_crash = crop_sum.sort_values(by="below_msp_rate_percent", ascending=False).iloc[0]
    worst_wh = wh_sum.sort_values(by="avg_transit_hours", ascending=False).iloc[0]
    top_mandi = mandi_sum.iloc[0]
    
    insights = {
        "metadata": {
            "generated_at": datetime.date.today().isoformat(),
            "scope": "State Agricultural Board Analytics",
            "total_records_processed": {
                "arrivals": len(arrivals),
                "prices": len(price_analysis),
                "trips": len(transport_full),
                "weather_observations": len(weather)
            }
        },
        "insights": [
            {
                "id": "INS-001",
                "category": "MARKET_MSP_RISK",
                "title": "Highest MSP Crash Vulnerability",
                "statement": f"{top_crop_crash['crop_name']} experiences the highest frequency of wholesale price crashes below MSP.",
                "supporting_metrics": {
                    "crop_name": top_crop_crash["crop_name"],
                    "below_msp_rate_percent": round(float(top_crop_crash["below_msp_rate_percent"]), 2),
                    "price_crash_count": int(top_crop_crash["price_crash_count"]),
                    "valid_modal_msp_observations": int(top_crop_crash["valid_price_msp_records"]),
                    "avg_price_gap_rs_qtl": round(float(top_crop_crash["avg_price_gap"]), 2)
                },
                "methodology": "Computed across paired record-level modal price and MSP observations where MSP > 0. Denominator excludes records missing modal price or MSP."
            },
            {
                "id": "INS-002",
                "category": "LOGISTICS_BOTTLENECK",
                "title": "Warehouse Transit Bottleneck",
                "statement": f"Transit routes destined for {worst_wh['destination_warehouse']} exhibit the longest average transit times.",
                "supporting_metrics": {
                    "destination_warehouse": worst_wh["destination_warehouse"],
                    "avg_transit_hours": round(float(worst_wh["avg_transit_hours"]), 2),
                    "median_transit_hours": round(float(worst_wh["median_transit_hours"]), 2),
                    "delay_rate_percent": round(float(worst_wh["transit_delay_rate_percent"]), 2),
                    "total_trips": int(worst_wh["total_trips"])
                },
                "methodology": "Aggregated from trip-level transit logs. Delay rate uses a data-derived relative benchmark: warehouse-level 75th percentile of transit time."
            },
            {
                "id": "INS-003",
                "category": "WEATHER_ASSOCIATION",
                "title": "Rainfall vs Arrival Volume Association",
                "statement": f"Daily rainfall is negatively associated with daily mandi crop arrival volumes in aligned observations (Pearson r = {round(corr_val, 4)}). This is a statistical association; it does not establish causation.",
                "supporting_metrics": {
                    "correlation_coefficient": round(corr_val, 4),
                    "evaluation_days_count": len(valid_w),
                    "unique_date_coverage_pct": round(date_coverage_pct, 2),
                    "arrival_record_coverage_pct": round(record_coverage_pct, 2)
                },
                "methodology": "Pearson correlation calculated after aggregating sensor rainfall (mm) and crop arrivals (Qtl) to daily state-wide level, then inner-joining on date. Correlation measures linear statistical association only. Aggregate correlation may also mask district-level differences. Does not establish causation."
            },
            {
                "id": "INS-004",
                "category": "MANDI_CONCENTRATION",
                "title": "Top Mandi by Arrival Volume",
                "statement": f"{top_mandi['mandi_name']} ({top_mandi['district']}, {top_mandi['state']}) leads all {len(mandi_sum)} mandis in total crop arrivals.",
                "supporting_metrics": {
                    "mandi_id": top_mandi["mandi_id"],
                    "mandi_name": top_mandi["mandi_name"],
                    "total_arrival_qtl": round(float(top_mandi["total_arrival_qtl"]), 2),
                    "unique_crops": int(top_mandi["unique_crops_count"]),
                    "departed_trips": int(top_mandi["total_trips_departed"])
                },
                "methodology": "Top mandis are ranked by cumulative arrival quantity in Qtl, summed across all observed crops and dates. All 57 mandis are included in ranking."
            }
        ]
    }
    
    return dashboard_metrics, insights

def main():
    print("Starting Governed Phase 1 Analytics Model generation...")
    ANALYTICS_DIR.mkdir(parents=True, exist_ok=True)
    
    master, arrivals, prices, transport, weather = load_processed_data()
    
    daily_analytics = generate_daily_mandi_analytics(master, arrivals, prices)
    daily_analytics.to_csv(ANALYTICS_DIR / "daily_mandi_analytics.csv", index=False)
    print(f"Generated daily_mandi_analytics.csv: {len(daily_analytics)} rows")
    
    crop_sum = generate_crop_summary(daily_analytics)
    crop_sum.to_csv(ANALYTICS_DIR / "crop_summary.csv", index=False)
    print(f"Generated crop_summary.csv: {len(crop_sum)} rows")
    
    mandi_sum = generate_mandi_summary(master, daily_analytics, transport)
    mandi_sum.to_csv(ANALYTICS_DIR / "mandi_summary.csv", index=False)
    print(f"Generated mandi_summary.csv: {len(mandi_sum)} rows")
    
    price_analysis = generate_price_msp_analysis(prices, master)
    price_analysis.to_csv(ANALYTICS_DIR / "price_msp_analysis.csv", index=False)
    print(f"Generated price_msp_analysis.csv: {len(price_analysis)} rows")
    
    wh_sum, transport_full = generate_transport_summary(transport)
    wh_sum.to_csv(ANALYTICS_DIR / "transport_summary.csv", index=False)
    print(f"Generated transport_summary.csv: {len(wh_sum)} rows")
    
    weather_arr_district, daily_weather_comb = generate_weather_arrival_analysis(weather, arrivals, master)
    weather_arr_district.to_csv(ANALYTICS_DIR / "weather_arrival_analysis.csv", index=False)
    print(f"Generated weather_arrival_analysis.csv: {len(weather_arr_district)} rows")
    
    dashboard_metrics, insights = generate_json_outputs(
        daily_analytics, crop_sum, mandi_sum, price_analysis, wh_sum, transport_full, daily_weather_comb, arrivals, weather
    )
    
    with open(ANALYTICS_DIR / "dashboard_metrics.json", "w") as f:
        json.dump(dashboard_metrics, f, indent=2)
    print("Generated dashboard_metrics.json")
    
    with open(ANALYTICS_DIR / "insights.json", "w") as f:
        json.dump(insights, f, indent=2)
    print("Generated insights.json")
    
    print("\nPhase 1 Analytics Model generation complete!")

if __name__ == "__main__":
    main()
