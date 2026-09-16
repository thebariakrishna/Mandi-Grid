import json
import re

import pandas as pd

from utils.file_utils import RAW_DIR, PROCESSED_DIR, QUALITY_DIR


# =========================================================
# FILE PATHS
# =========================================================

INPUT_FILE = RAW_DIR / "track3_transport_logistics.csv"
OUTPUT_FILE = PROCESSED_DIR / "clean_transport_logistics.csv"
REPORT_FILE = QUALITY_DIR / "transport_cleaning_report.json"


# =========================================================
# TEXT NORMALIZATION
# =========================================================

def normalize_text(value):
    """
    Strip whitespace, normalize repeated spaces,
    and convert empty strings to missing values.
    """

    if pd.isna(value):
        return pd.NA

    value = str(value).strip()
    value = " ".join(value.split())

    if value == "":
        return pd.NA

    return value


# =========================================================
# VEHICLE NUMBER NORMALIZATION
# =========================================================

def normalize_vehicle_number(value):
    """
    Standardize vehicle registration formatting.

    Example:
        " pb 10 ab 1234 "
        "PB-10-AB-1234"
        "pb10ab1234"

    are normalized into a consistent uppercase representation.
    """

    value = normalize_text(value)

    if pd.isna(value):
        return pd.NA

    value = str(value).upper()

    # Remove spaces and separators
    value = re.sub(r"[\s\-]+", "", value)

    return value


# =========================================================
# DISTANCE UNIT NORMALIZATION
# =========================================================

def normalize_distance_unit(value):
    """
    Convert distance-unit variants to:
        KM
        MILE

    Unknown/missing values remain missing.
    """

    value = normalize_text(value)

    if pd.isna(value):
        return pd.NA

    value = str(value).lower()

    mapping = {
        "km": "KM",
        "kms": "KM",
        "kilometer": "KM",
        "kilometers": "KM",

        "mile": "MILE",
        "miles": "MILE",
        "mi": "MILE",
    }

    return mapping.get(value, pd.NA)


# =========================================================
# DISTANCE → KM
# =========================================================

def convert_distance_to_km(distance, unit):
    """
    Convert distance into kilometres.

    1 mile = 1.60934 km
    """

    if pd.isna(distance) or pd.isna(unit):
        return pd.NA

    if unit == "KM":
        return distance

    if unit == "MILE":
        return distance * 1.60934

    return pd.NA


# =========================================================
# MAIN CLEANING FUNCTION
# =========================================================

def clean_transport():

    print("=" * 70)
    print("TRANSPORT + LOGISTICS CLEANING")
    print("=" * 70)

    # -----------------------------------------------------
    # 1. Check input
    # -----------------------------------------------------

    if not INPUT_FILE.exists():
        raise FileNotFoundError(
            f"Raw transport file not found: {INPUT_FILE}"
        )

    PROCESSED_DIR.mkdir(parents=True, exist_ok=True)
    QUALITY_DIR.mkdir(parents=True, exist_ok=True)

    # -----------------------------------------------------
    # 2. Load data
    # -----------------------------------------------------

    df = pd.read_csv(INPUT_FILE)

    raw_row_count = len(df)

    print(f"\nRaw rows: {raw_row_count}")

    # -----------------------------------------------------
    # 3. Required columns
    # -----------------------------------------------------

    required_columns = [
        "trip_id",
        "mandi_id",
        "destination_warehouse",
        "departure_time",
        "arrival_time",
        "transit_hours",
        "distance",
        "distance_unit",
        "vehicle_no",
        "driver_id",
    ]

    missing_columns = [
        column
        for column in required_columns
        if column not in df.columns
    ]

    if missing_columns:
        raise ValueError(
            f"Missing required columns: {missing_columns}"
        )

    # -----------------------------------------------------
    # 4. Raw statistics
    # -----------------------------------------------------

    raw_missing = {
        column: int(count)
        for column, count in df.isna().sum().items()
    }

    raw_duplicate_rows = int(
        df.duplicated().sum()
    )

    print(
        f"Exact duplicate rows: {raw_duplicate_rows}"
    )

    # -----------------------------------------------------
    # 5. Preserve original values
    # -----------------------------------------------------

    df["transit_hours_original"] = df["transit_hours"]
    df["distance_original"] = df["distance"]
    df["distance_unit_original"] = df["distance_unit"]
    df["vehicle_no_original"] = df["vehicle_no"]

    # -----------------------------------------------------
    # 6. Normalize text
    # -----------------------------------------------------

    for column in [
        "trip_id",
        "mandi_id",
        "destination_warehouse",
        "driver_id",
    ]:
        df[column] = df[column].apply(normalize_text)

    # -----------------------------------------------------
    # 7. Normalize vehicle number
    # -----------------------------------------------------

    df["vehicle_no"] = df["vehicle_no"].apply(
        normalize_vehicle_number
    )

    # -----------------------------------------------------
    # 8. Convert numeric fields
    # -----------------------------------------------------

    df["transit_hours"] = pd.to_numeric(
        df["transit_hours"],
        errors="coerce"
    )

    df["distance"] = pd.to_numeric(
        df["distance"],
        errors="coerce"
    )

    # -----------------------------------------------------
    # 9. Normalize distance units
    # -----------------------------------------------------

    df["distance_unit"] = df["distance_unit"].apply(
        normalize_distance_unit
    )

    # -----------------------------------------------------
    # 10. Convert distance to KM
    # -----------------------------------------------------

    df["distance_km"] = df.apply(
        lambda row: convert_distance_to_km(
            row["distance"],
            row["distance_unit"]
        ),
        axis=1
    )

    df["distance_km"] = pd.to_numeric(
        df["distance_km"],
        errors="coerce"
    )

    # -----------------------------------------------------
    # -----------------------------------------------------
    # 11. Parse timestamps
    # -----------------------------------------------------

    df["departure_time"] = pd.to_datetime(
        df["departure_time"]
        .astype("string")
        .str.strip(),
        format="mixed",
        errors="coerce"
    )

    df["arrival_time"] = pd.to_datetime(
        df["arrival_time"]
        .astype("string")
        .str.strip(),
        format="mixed",
        errors="coerce"
    )

    # -----------------------------------------------------
    # 12. Validate timestamp ordering
    # -----------------------------------------------------

    timestamp_available = (
        df["departure_time"].notna()
        & df["arrival_time"].notna()
    )

    invalid_timestamp_order = (
        timestamp_available
        & (df["arrival_time"] < df["departure_time"])
    )

    invalid_timestamp_count = int(
        invalid_timestamp_order.sum()
    )

    # -----------------------------------------------------
    # 13. Calculate transit duration
    # -----------------------------------------------------

    calculated_transit_hours = (
        df["arrival_time"] - df["departure_time"]
    ).dt.total_seconds() / 3600

    # Use timestamp-derived transit duration only when
    # timestamps are valid and chronologically ordered.
    valid_calculated_transit = (
        timestamp_available
        & ~invalid_timestamp_order
    )

    df.loc[
        valid_calculated_transit,
        "transit_hours"
    ] = calculated_transit_hours[
        valid_calculated_transit
    ]

    # -----------------------------------------------------
    # 14. Handle invalid timestamp pairs
    # -----------------------------------------------------

    # Do not silently reverse timestamps.
    # Do not use absolute values.
    # Do not invent corrected timestamps.
    #
    # When timestamps are present but arrival occurs before
    # departure, the timestamp pair is invalid. Therefore
    # transit_hours is set to missing.

    df.loc[
        invalid_timestamp_order,
        "arrival_time"
    ] = pd.NaT

    df.loc[
        invalid_timestamp_order,
        "transit_hours"
    ] = pd.NA

    # -----------------------------------------------------
    # 15. Handle negative original transit values
    # -----------------------------------------------------

    original_transit = pd.to_numeric(
        df["transit_hours_original"],
        errors="coerce"
    )

    # If timestamps are unavailable, retain a valid
    # non-negative original transit duration.
    timestamp_unavailable = (
        ~timestamp_available
    )

    valid_original_fallback = (
        timestamp_unavailable
        & original_transit.notna()
        & (original_transit >= 0)
    )

    df.loc[
        valid_original_fallback,
        "transit_hours"
    ] = original_transit[
        valid_original_fallback
    ]

    # Any remaining negative transit duration is invalid.
    negative_transit = (
        pd.to_numeric(
            df["transit_hours"],
            errors="coerce"
        ) < 0
    )

    df.loc[
        negative_transit,
        "transit_hours"
    ] = pd.NA

    # -----------------------------------------------------
    # 14. Remove exact duplicate rows
    # -----------------------------------------------------

    df = df.drop_duplicates().copy()

    # -----------------------------------------------------
    # 15. Final columns
    # -----------------------------------------------------

    final_columns = [
        "trip_id",
        "mandi_id",
        "destination_warehouse",

        "departure_time",
        "arrival_time",

        "transit_hours",
        "transit_hours_original",

        "distance",
        "distance_unit",
        "distance_km",

        "distance_original",
        "distance_unit_original",

        "vehicle_no",
        "vehicle_no_original",

        "driver_id",
    ]

    df = df[final_columns]

    # -----------------------------------------------------
    # 16. Final statistics
    # -----------------------------------------------------

    cleaned_row_count = len(df)

    cleaned_missing = {
        column: int(count)
        for column, count in df.isna().sum().items()
    }

    # -----------------------------------------------------
    # 17. Save cleaned dataset
    # -----------------------------------------------------

    df.to_csv(
        OUTPUT_FILE,
        index=False,
        encoding="utf-8-sig"
    )

    # -----------------------------------------------------
    # 18. Quality report
    # -----------------------------------------------------

    report = {
        "dataset": "track3_transport_logistics.csv",

        "raw_row_count": raw_row_count,

        "cleaned_row_count": cleaned_row_count,

        "rows_removed": (
            raw_row_count - cleaned_row_count
        ),

        "exact_duplicate_rows_found":
            raw_duplicate_rows,

        "negative_transit_hours_original":
            int(
                (
                    pd.to_numeric(
                        df["transit_hours_original"],
                        errors="coerce"
                    ) < 0
                ).sum()
            ),

        "invalid_timestamp_order_count":
            invalid_timestamp_count,

        "raw_missing_values":
            raw_missing,

        "cleaned_missing_values":
            cleaned_missing,

        "rules_applied": [
            "Normalize whitespace",
            "Standardize vehicle registration formatting",
            "Standardize distance units",
            "Convert miles to kilometres",
            "1 mile = 1.60934 km",
            "Parse mixed timestamp formats",
            "Calculate transit duration from timestamps when available",
            "Do not use absolute value for negative transit",
            "Convert invalid negative transit durations to missing",
            "Remove exact duplicate rows",
            "Preserve original transport values",
            "Do not invent missing timestamps",
            "Do not invent missing vehicle numbers",
            "Do not invent missing driver IDs",
        ],
    }

    with open(
        REPORT_FILE,
        "w",
        encoding="utf-8"
    ) as file:

        json.dump(
            report,
            file,
            indent=2,
            ensure_ascii=False
        )

    # -----------------------------------------------------
    # 19. Print results
    # -----------------------------------------------------

    print("\n" + "=" * 70)
    print("TRANSPORT CLEANING COMPLETE")
    print("=" * 70)

    print(f"Raw rows:                 {raw_row_count}")
    print(f"Cleaned rows:             {cleaned_row_count}")
    print(
        f"Rows removed:             "
        f"{raw_row_count - cleaned_row_count}"
    )

    print(
        f"Exact duplicates:         "
        f"{raw_duplicate_rows}"
    )

    print(
        f"Original negative transit:"
        f" {int((pd.to_numeric(df['transit_hours_original'], errors='coerce') < 0).sum())}"
    )

    print(
        f"Invalid timestamp order:"
        f" {invalid_timestamp_count}"
    )

    print("\nCleaned file:")
    print(OUTPUT_FILE)

    print("\nCleaning report:")
    print(REPORT_FILE)


# =========================================================
# ENTRY POINT
# =========================================================

if __name__ == "__main__":
    clean_transport()