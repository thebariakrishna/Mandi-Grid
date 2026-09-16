from pathlib import Path

import pandas as pd


# ============================================================
# PATHS
# ============================================================

BASE_DIR = Path(__file__).resolve().parents[1]

PROCESSED_DIR = BASE_DIR / "data" / "processed"

MASTER_FILE = PROCESSED_DIR / "clean_mandi_master.csv"
ARRIVALS_FILE = PROCESSED_DIR / "clean_mandi_arrivals.csv"
PRICES_FILE = PROCESSED_DIR / "clean_price_and_msp.csv"
TRANSPORT_FILE = PROCESSED_DIR / "clean_transport_logistics.csv"
WEATHER_FILE = PROCESSED_DIR / "weather_cleaned.csv"


# ============================================================
# HELPER
# ============================================================

def print_rule_result(rule_name, invalid_count, total_count):
    """
    Print a standardized validation result.
    """

    if total_count == 0:
        rate = 0
    else:
        rate = (invalid_count / total_count) * 100

    status = "PASS" if invalid_count == 0 else "ISSUE"

    print(f"{rule_name}")
    print(f"  Invalid rows: {invalid_count:,}")
    print(f"  Invalid rate: {rate:.2f}%")
    print(f"  Status: {status}")
    print()


# ============================================================
# MAIN
# ============================================================

def validate_business_rules():

    print("=" * 60)
    print("BUSINESS-RULE VALIDATION")
    print("=" * 60)

    # --------------------------------------------------------
    # 1. LOAD DATA
    # --------------------------------------------------------

    master = pd.read_csv(MASTER_FILE)
    arrivals = pd.read_csv(ARRIVALS_FILE)
    prices = pd.read_csv(PRICES_FILE)
    transport = pd.read_csv(TRANSPORT_FILE)
    weather = pd.read_csv(WEATHER_FILE)

    print("\nLoaded datasets:")
    print(f"Master:    {len(master):,} rows")
    print(f"Arrivals:  {len(arrivals):,} rows")
    print(f"Prices:    {len(prices):,} rows")
    print(f"Transport: {len(transport):,} rows")
    print(f"Weather:   {len(weather):,} rows")

    # ========================================================
    # ARRIVALS RULES
    # ========================================================

    print("\n" + "=" * 60)
    print("1. ARRIVALS BUSINESS RULES")
    print("=" * 60)

    # --------------------------------------------------------
    # Arrival quantity must not be negative
    # --------------------------------------------------------

    arrival_quantity = pd.to_numeric(
        arrivals["arrival_quantity_qtl"],
        errors="coerce"
    )

    invalid_arrival_quantity = (
        arrival_quantity.notna()
        & (arrival_quantity < 0)
    )

    print_rule_result(
        "Arrival quantity >= 0",
        int(invalid_arrival_quantity.sum()),
        int(arrival_quantity.notna().sum())
    )

    # --------------------------------------------------------
    # Farmer count must be positive
    # --------------------------------------------------------

    farmer_count = pd.to_numeric(
        arrivals["farmer_count"],
        errors="coerce"
    )

    invalid_farmer_count = (
        farmer_count.notna()
        & (farmer_count < 0)
    )

    print_rule_result(
        "Farmer count >= 0",
        int(invalid_farmer_count.sum()),
        int(farmer_count.notna().sum())
    )

    # --------------------------------------------------------
    # ========================================================
    # PRICE RULES
    # ========================================================
    # --------------------------------------------------------

    print("\n" + "=" * 60)
    print("2. PRICE BUSINESS RULES")
    print("=" * 60)

    min_price = pd.to_numeric(
        prices["min_price"],
        errors="coerce"
    )

    modal_price = pd.to_numeric(
        prices["modal_price"],
        errors="coerce"
    )

    max_price = pd.to_numeric(
        prices["max_price"],
        errors="coerce"
    )

    msp = pd.to_numeric(
        prices["msp"],
        errors="coerce"
    )

    # --------------------------------------------------------
    # Prices must not be negative
    # --------------------------------------------------------

    invalid_min_price = (
        min_price.notna()
        & (min_price < 0)
    )

    invalid_modal_price = (
        modal_price.notna()
        & (modal_price < 0)
    )

    invalid_max_price = (
        max_price.notna()
        & (max_price < 0)
    )

    invalid_msp = (
        msp.notna()
        & (msp < 0)
    )

    print_rule_result(
        "Minimum price >= 0",
        int(invalid_min_price.sum()),
        int(min_price.notna().sum())
    )

    print_rule_result(
        "Modal price >= 0",
        int(invalid_modal_price.sum()),
        int(modal_price.notna().sum())
    )

    print_rule_result(
        "Maximum price >= 0",
        int(invalid_max_price.sum()),
        int(max_price.notna().sum())
    )

    print_rule_result(
        "MSP >= 0",
        int(invalid_msp.sum()),
        int(msp.notna().sum())
    )

    # --------------------------------------------------------
    # min <= modal <= max
    #
    # Only evaluate rows where all three values exist.
    # --------------------------------------------------------

    complete_price_rows = (
        min_price.notna()
        & modal_price.notna()
        & max_price.notna()
    )

    invalid_price_order = (
        complete_price_rows
        & (
            (min_price > modal_price)
            | (modal_price > max_price)
        )
    )

    print_rule_result(
        "Minimum <= Modal <= Maximum",
        int(invalid_price_order.sum()),
        int(complete_price_rows.sum())
    )

    # --------------------------------------------------------
    # MSP comparison availability
    # --------------------------------------------------------

    msp_comparable = (
        modal_price.notna()
        & msp.notna()
    )

    print(
        f"Rows available for Modal Price vs MSP analysis: "
        f"{msp_comparable.sum():,}"
    )

    print(
        f"Rows missing either Modal Price or MSP: "
        f"{(~msp_comparable).sum():,}"
    )

    # ========================================================
    # TRANSPORT RULES
    # ========================================================

    print("\n" + "=" * 60)
    print("3. TRANSPORT BUSINESS RULES")
    print("=" * 60)

    transit_hours = pd.to_numeric(
        transport["transit_hours"],
        errors="coerce"
    )

    distance_km = pd.to_numeric(
        transport["distance_km"],
        errors="coerce"
    )

    # --------------------------------------------------------
    # Transit time >= 0
    # --------------------------------------------------------

    invalid_transit = (
        transit_hours.notna()
        & (transit_hours < 0)
    )

    print_rule_result(
        "Transit hours >= 0",
        int(invalid_transit.sum()),
        int(transit_hours.notna().sum())
    )

    # --------------------------------------------------------
    # Distance >= 0
    # --------------------------------------------------------

    invalid_distance = (
        distance_km.notna()
        & (distance_km < 0)
    )

    print_rule_result(
        "Distance >= 0",
        int(invalid_distance.sum()),
        int(distance_km.notna().sum())
    )

    # --------------------------------------------------------
    # Departure <= Arrival
    #
    # We report this separately because the timestamps may be
    # missing or may contain data-quality inconsistencies.
    # --------------------------------------------------------

    departure = pd.to_datetime(
        transport["departure_time"],
        errors="coerce"
    )

    arrival = pd.to_datetime(
        transport["arrival_time"],
        errors="coerce"
    )

    timestamp_complete = (
        departure.notna()
        & arrival.notna()
    )

    arrival_before_departure = (
        timestamp_complete
        & (arrival < departure)
    )

    print_rule_result(
        "Arrival timestamp >= Departure timestamp",
        int(arrival_before_departure.sum()),
        int(timestamp_complete.sum())
    )

    # ========================================================
    # WEATHER RULES
    # ========================================================

    print("\n" + "=" * 60)
    print("4. WEATHER BUSINESS RULES")
    print("=" * 60)

    temperature = pd.to_numeric(
        weather["temperature_c"],
        errors="coerce"
    )

    rainfall = pd.to_numeric(
        weather["rainfall_mm"],
        errors="coerce"
    )

    humidity = pd.to_numeric(
        weather["humidity_percent"],
        errors="coerce"
    )

    # --------------------------------------------------------
    # Temperature above absolute zero
    # --------------------------------------------------------

    invalid_temperature = (
        temperature.notna()
        & (temperature < -273.15)
    )

    print_rule_result(
        "Temperature >= -273.15°C",
        int(invalid_temperature.sum()),
        int(temperature.notna().sum())
    )

    # --------------------------------------------------------
    # Rainfall >= 0
    # --------------------------------------------------------

    invalid_rainfall = (
        rainfall.notna()
        & (rainfall < 0)
    )

    print_rule_result(
        "Rainfall >= 0 mm",
        int(invalid_rainfall.sum()),
        int(rainfall.notna().sum())
    )

    # --------------------------------------------------------
    # Humidity 0–100
    # --------------------------------------------------------

    invalid_humidity = (
        humidity.notna()
        & (
            (humidity < 0)
            | (humidity > 100)
        )
    )

    print_rule_result(
        "Humidity between 0% and 100%",
        int(invalid_humidity.sum()),
        int(humidity.notna().sum())
    )

    # ========================================================
    # MASTER RULES
    # ========================================================

    print("\n" + "=" * 60)
    print("5. MASTER BUSINESS RULES")
    print("=" * 60)

    # --------------------------------------------------------
    # Mandi ID must exist
    # --------------------------------------------------------

    missing_mandi_id = master["mandi_id"].isna()

    print_rule_result(
        "Mandi ID is present",
        int(missing_mandi_id.sum()),
        len(master)
    )

    # --------------------------------------------------------
    # Area should not be negative
    # --------------------------------------------------------

    # --------------------------------------------------------
# Area should not be negative
#
# The current cleaned master dataset does not retain the
# original area column, so this rule is not applicable here.
# --------------------------------------------------------

    # ---------------------------------------------------------

    # ========================================================
    # FINAL SUMMARY
    # ========================================================

    print("=" * 60)
    print("BUSINESS-RULE VALIDATION COMPLETED")
    print("=" * 60)

    total_issues = (
        invalid_arrival_quantity.sum()
        + invalid_farmer_count.sum()
        + invalid_min_price.sum()
        + invalid_modal_price.sum()
        + invalid_max_price.sum()
        + invalid_msp.sum()
        + invalid_price_order.sum()
        + invalid_transit.sum()
        + invalid_distance.sum()
        + arrival_before_departure.sum()
        + invalid_temperature.sum()
        + invalid_rainfall.sum()
        + invalid_humidity.sum()
        + missing_mandi_id.sum()
    )

    print(f"\nTotal business-rule issues detected: {int(total_issues):,}")

    if total_issues == 0:
        print("STATUS: ALL BUSINESS RULES PASSED")
    else:
        print(
            "STATUS: BUSINESS-RULE EXCEPTIONS DETECTED "
            "— REVIEW THE COUNTS ABOVE"
        )


# ============================================================
# ENTRY POINT
# ============================================================

if __name__ == "__main__":
    validate_business_rules()