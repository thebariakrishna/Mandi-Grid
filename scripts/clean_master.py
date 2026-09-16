from pathlib import Path
import json

import pandas as pd

from utils.file_utils import RAW_DIR, PROCESSED_DIR, QUALITY_DIR


INPUT_FILE = RAW_DIR / "track3_mandi_master.csv"
OUTPUT_FILE = PROCESSED_DIR / "clean_mandi_master.csv"
REPORT_FILE = QUALITY_DIR / "master_cleaning_report.json"


def normalize_text(value):
    """
    Basic text normalization.

    - Converts values to strings
    - Removes leading/trailing whitespace
    - Collapses multiple spaces
    - Converts empty strings to missing values
    """
    if pd.isna(value):
        return pd.NA

    value = str(value).strip()
    value = " ".join(value.split())

    if value == "":
        return pd.NA

    return value


def normalize_mandi_type(value):
    """
    Standardize mandi_type values.

    Examples:
        APMC / apmc -> APMC
        Private / PRIVATE -> Private
        Direct -> Direct
    """
    if pd.isna(value):
        return pd.NA

    value = normalize_text(value)

    if pd.isna(value):
        return pd.NA

    normalized = str(value).lower()

    mapping = {
        "apmc": "APMC",
        "private": "Private",
        "direct": "Direct",
    }

    return mapping.get(normalized, value)


def clean_master():
    """Clean and save the mandi master dataset."""

    print("=" * 70)
    print("MANDI MASTER CLEANING")
    print("=" * 70)

    # ---------------------------------------------------------
    # 1. Check input file
    # ---------------------------------------------------------

    if not INPUT_FILE.exists():
        raise FileNotFoundError(
            f"Raw input file not found: {INPUT_FILE}"
        )

    # ---------------------------------------------------------
    # 2. Create output directories
    # ---------------------------------------------------------

    PROCESSED_DIR.mkdir(parents=True, exist_ok=True)
    QUALITY_DIR.mkdir(parents=True, exist_ok=True)

    # ---------------------------------------------------------
    # 3. Load raw data
    # ---------------------------------------------------------

    df = pd.read_csv(INPUT_FILE)

    raw_row_count = len(df)

    print(f"\nRaw rows: {raw_row_count}")

    # ---------------------------------------------------------
    # 4. Record raw missing values
    # ---------------------------------------------------------

    raw_missing = {
        column: int(count)
        for column, count in df.isna().sum().items()
    }

    # ---------------------------------------------------------
    # 5. Normalize general text columns
    # ---------------------------------------------------------

    text_columns = [
        "mandi_id",
        "mandi_name",
        "district",
        "state",
    ]

    for column in text_columns:
        if column in df.columns:
            df[column] = df[column].apply(normalize_text)

    # ---------------------------------------------------------
    # 6. Normalize mandi type
    # ---------------------------------------------------------

    if "mandi_type" in df.columns:
        df["mandi_type"] = df["mandi_type"].apply(
            normalize_mandi_type
        )

    # ---------------------------------------------------------
    # 7. Convert area to numeric
    # ---------------------------------------------------------

    if "total_area_acres" in df.columns:
        df["total_area_acres"] = pd.to_numeric(
            df["total_area_acres"],
            errors="coerce"
        )

    # ---------------------------------------------------------
    # 8. Detect duplicate rows BEFORE removing them
    # ---------------------------------------------------------

    duplicate_rows = int(df.duplicated().sum())

    print(f"Exact duplicate rows found: {duplicate_rows}")

    # ---------------------------------------------------------
    # 9. Remove exact duplicate rows
    # ---------------------------------------------------------

    df = df.drop_duplicates().copy()

    # ---------------------------------------------------------
    # 10. Check mandi_id uniqueness
    # ---------------------------------------------------------

    duplicate_mandi_ids = int(
        df["mandi_id"].duplicated().sum()
    )

    print(
        f"Duplicate mandi_id values after exact deduplication: "
        f"{duplicate_mandi_ids}"
    )

    # ---------------------------------------------------------
    # 11. Validate area values
    # ---------------------------------------------------------

    invalid_area_count = int(
        (df["total_area_acres"] <= 0).sum()
    )

    print(
        f"Invalid/non-positive area values: "
        f"{invalid_area_count}"
    )

    # We do NOT automatically invent area values.
    # Invalid values are converted to missing.
    if invalid_area_count > 0:
        df.loc[
            df["total_area_acres"] <= 0,
            "total_area_acres"
        ] = pd.NA

    # ---------------------------------------------------------
    # 12. Final column order
    # ---------------------------------------------------------

    expected_columns = [
        "mandi_id",
        "mandi_name",
        "district",
        "state",
        "mandi_type",
        "total_area_acres",
    ]

    df = df[expected_columns]

    # ---------------------------------------------------------
    # 13. Final missing-value counts
    # ---------------------------------------------------------

    cleaned_missing = {
        column: int(count)
        for column, count in df.isna().sum().items()
    }

    # ---------------------------------------------------------
    # 14. Final row count
    # ---------------------------------------------------------

    cleaned_row_count = len(df)

    # ---------------------------------------------------------
    # 15. Save cleaned dataset
    # ---------------------------------------------------------

    df.to_csv(
        OUTPUT_FILE,
        index=False,
        encoding="utf-8-sig"
    )

    # ---------------------------------------------------------
    # 16. Generate cleaning report
    # ---------------------------------------------------------

    report = {
        "dataset": "track3_mandi_master.csv",
        "input_file": str(INPUT_FILE),
        "output_file": str(OUTPUT_FILE),
        "raw_row_count": raw_row_count,
        "cleaned_row_count": cleaned_row_count,
        "rows_removed": raw_row_count - cleaned_row_count,
        "exact_duplicate_rows_removed": duplicate_rows,
        "duplicate_mandi_ids_after_deduplication":
            duplicate_mandi_ids,
        "invalid_area_values": invalid_area_count,
        "raw_missing_values": raw_missing,
        "cleaned_missing_values": cleaned_missing,
        "rules_applied": [
            "Trim whitespace from text fields",
            "Collapse repeated whitespace",
            "Convert empty text values to missing",
            "Standardize mandi_type values",
            "Convert total_area_acres to numeric",
            "Remove exact duplicate rows",
            "Do not invent missing district/state values",
            "Do not correct geographic information based only on mandi name",
            "Convert non-positive area values to missing",
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

    # ---------------------------------------------------------
    # 17. Print final summary
    # ---------------------------------------------------------

    print("\n" + "=" * 70)
    print("CLEANING COMPLETE")
    print("=" * 70)

    print(f"Raw rows:             {raw_row_count}")
    print(f"Cleaned rows:         {cleaned_row_count}")
    print(f"Rows removed:         {raw_row_count - cleaned_row_count}")
    print(f"Duplicate rows:       {duplicate_rows}")

    print(f"\nCleaned file:")
    print(OUTPUT_FILE)

    print(f"\nCleaning report:")
    print(REPORT_FILE)


if __name__ == "__main__":
    clean_master()