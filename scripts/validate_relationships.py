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
# HELPERS
# ============================================================

def normalize_mandi_id(value):
    """
    Convert all supported mandi ID formats
    into the canonical MANDI### format.

    Examples:
        MANDI001
        MANDI-001
        mandi_001
        M001
        001
        25

    become:
        MANDI001
        MANDI025
    """

    if pd.isna(value):
        return pd.NA

    value = str(value).strip().upper()

    value = (
        value
        .replace("-", "")
        .replace("_", "")
        .replace(" ", "")
    )

    if value.startswith("MANDI"):
        number = value.replace("MANDI", "", 1)

        if number.isdigit():
            return f"MANDI{number.zfill(3)}"

    if value.startswith("M"):
        number = value[1:]

        if number.isdigit():
            return f"MANDI{number.zfill(3)}"

    # Handle purely numeric IDs such as 025 or 57
    if value.isdigit():
        return f"MANDI{value.zfill(3)}"

    return value


def report_relationship(
    child_df,
    master_df,
    child_name,
    key="mandi_id"
):
    """
    Check how many non-null child keys exist in master.
    """

    child_keys = (
        child_df[key]
        .dropna()
        .astype(str)
        .map(normalize_mandi_id)
    )

    master_keys = (
        master_df[key]
        .dropna()
        .astype(str)
        .map(normalize_mandi_id)
    )

    unmatched = child_keys[
        ~child_keys.isin(set(master_keys))
    ]

    print(f"\n{child_name} → Master")
    print("-" * 50)

    print(f"Non-null {key}: {len(child_keys):,}")
    print(f"Matched to master: {len(child_keys) - len(unmatched):,}")
    print(f"Unmatched: {len(unmatched):,}")

    if len(child_keys) > 0:
        match_rate = (
            (len(child_keys) - len(unmatched))
            / len(child_keys)
        ) * 100
    else:
        match_rate = 0

    print(f"Match rate: {match_rate:.2f}%")

    if len(unmatched) > 0:
        print("Top unmatched IDs:")
        print(
            unmatched
            .value_counts()
            .head(10)
            .to_string()
        )

    return unmatched


# ============================================================
# MAIN
# ============================================================

def validate_relationships():

    print("=" * 60)
    print("CROSS-DATASET RELATIONSHIP VALIDATION")
    print("=" * 60)

    # --------------------------------------------------------
    # 1. LOAD DATASETS
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

    # --------------------------------------------------------
    # 2. MASTER KEY QUALITY
    # --------------------------------------------------------

    print("\n" + "=" * 60)
    print("MASTER KEY CHECK")
    print("=" * 60)

    master["mandi_id_std"] = (
        master["mandi_id"]
        .map(normalize_mandi_id)
    )

    duplicate_master_ids = (
        master["mandi_id_std"]
        .dropna()
        .duplicated()
        .sum()
    )

    missing_master_ids = (
        master["mandi_id_std"]
        .isna()
        .sum()
    )

    print(f"Missing master mandi IDs: {missing_master_ids}")
    print(f"Duplicate master mandi IDs: {duplicate_master_ids}")

    # --------------------------------------------------------
    # 3. ARRIVALS → MASTER
    # --------------------------------------------------------

    arrivals["mandi_id_std"] = (
        arrivals["mandi_id"]
        .map(normalize_mandi_id)
    )

    arrivals_unmatched = report_relationship(
        arrivals,
        master,
        "Arrivals"
    )

    # --------------------------------------------------------
    # 4. PRICES → MASTER
    # --------------------------------------------------------

    prices["mandi_id_std"] = (
        prices["mandi_id"]
        .map(normalize_mandi_id)
    )

    prices_unmatched = report_relationship(
        prices,
        master,
        "Prices"
    )

    # --------------------------------------------------------
    # 5. TRANSPORT → MASTER
    # --------------------------------------------------------

    transport["mandi_id_std"] = (
        transport["mandi_id"]
        .map(normalize_mandi_id)
    )

    transport_unmatched = report_relationship(
        transport,
        master,
        "Transport"
    )

    # --------------------------------------------------------
    # 6. CROSS-DATASET CROP CONSISTENCY
    # --------------------------------------------------------

    print("\n" + "=" * 60)
    print("CROP CONSISTENCY CHECK")
    print("=" * 60)

    arrival_crops = set(
        arrivals["crop_name"]
        .dropna()
        .astype(str)
        .str.strip()
    )

    price_crops = set(
        prices["crop_name"]
        .dropna()
        .astype(str)
        .str.strip()
    )

    print("Crops in arrivals:")
    print(sorted(arrival_crops))

    print("\nCrops in prices:")
    print(sorted(price_crops))

    only_arrivals = arrival_crops - price_crops
    only_prices = price_crops - arrival_crops

    print("\nCrops only in arrivals:")
    print(sorted(only_arrivals))

    print("\nCrops only in prices:")
    print(sorted(only_prices))

    # --------------------------------------------------------
    # 7. DATE RANGE CHECK
    # --------------------------------------------------------

    print("\n" + "=" * 60)
    print("DATE RANGE CHECK")
    print("=" * 60)

    date_columns = {
        "Arrivals": "date",
        "Prices": "date",
        "Weather": "date",
        "Transport": "departure_time",
    }

    datasets = {
        "Arrivals": arrivals,
        "Prices": prices,
        "Weather": weather,
        "Transport": transport,
    }

    for name, column in date_columns.items():

        dates = pd.to_datetime(
            datasets[name][column],
            errors="coerce"
        )

        valid_dates = dates.dropna()

        if len(valid_dates) == 0:
            print(f"{name}: no valid dates")
            continue

        print(
            f"{name}: "
            f"{valid_dates.min()} → {valid_dates.max()}"
        )

    # --------------------------------------------------------
    # 8. WEATHER DATE COVERAGE
    # --------------------------------------------------------

    print("\n" + "=" * 60)
    print("WEATHER DATE COVERAGE")
    print("=" * 60)

    weather_dates = pd.to_datetime(
        weather["date"],
        errors="coerce"
    ).dropna()

    arrival_dates = pd.to_datetime(
        arrivals["date"],
        errors="coerce"
    ).dropna()

    if len(weather_dates) > 0 and len(arrival_dates) > 0:

        weather_date_set = set(
            weather_dates.dt.date
        )

        arrival_date_set = set(
            arrival_dates.dt.date
        )

        overlapping_dates = (
            weather_date_set & arrival_date_set
        )

        print(
            f"Weather dates: {len(weather_date_set):,}"
        )

        print(
            f"Arrival dates: {len(arrival_date_set):,}"
        )

        print(
            f"Overlapping dates: "
            f"{len(overlapping_dates):,}"
        )

        coverage = (
            len(overlapping_dates)
            / len(arrival_date_set)
        ) * 100

        print(
            f"Weather coverage of arrival dates: "
            f"{coverage:.2f}%"
        )

    # --------------------------------------------------------
    # 9. FINAL SUMMARY
    # --------------------------------------------------------

    print("\n" + "=" * 60)
    print("RELATIONSHIP VALIDATION SUMMARY")
    print("=" * 60)

    print(
        f"Arrivals unmatched:  {len(arrivals_unmatched):,}"
    )

    print(
        f"Prices unmatched:    {len(prices_unmatched):,}"
    )

    print(
        f"Transport unmatched: {len(transport_unmatched):,}"
    )

    print(
        f"Crops only in arrivals: {len(only_arrivals)}"
    )

    print(
        f"Crops only in prices:   {len(only_prices)}"
    )

    print("\nRelationship validation completed.")


# ============================================================
# ENTRY POINT
# ============================================================

if __name__ == "__main__":
    validate_relationships()