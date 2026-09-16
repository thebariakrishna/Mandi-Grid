import json

import pandas as pd

from utils.file_utils import RAW_DIR, PROCESSED_DIR, QUALITY_DIR


# =========================================================
# FILE PATHS
# =========================================================

INPUT_FILE = RAW_DIR / "track3_price_and_msp.json"
OUTPUT_FILE = PROCESSED_DIR / "clean_price_and_msp.csv"
REPORT_FILE = QUALITY_DIR / "prices_cleaning_report.json"


# =========================================================
# CROP-NAME STANDARDIZATION
# =========================================================

CROP_MAPPING = {
    # Sugarcane
    "ganna": "Sugarcane",
    "ganne": "Sugarcane",
    "गन्ना": "Sugarcane",
    "sugarcane": "Sugarcane",

    # Mustard
    "sarson": "Mustard",
    "sarso": "Mustard",
    "सरसों": "Mustard",
    "mustard": "Mustard",

    # Cotton
    "kapas": "Cotton",
    "कपास": "Cotton",
    "cotton": "Cotton",

    # Maize
    "makka": "Maize",
    "मक्का": "Maize",
    "maize": "Maize",
    "corn": "Maize",
    "makki": "Maize",

    # Wheat
    "wheat": "Wheat",
    "गेहूं": "Wheat",
    "gehun": "Wheat",
    "kanak": "Wheat",

    # Rice
    "rice": "Rice",
    "chawal": "Rice",
    "paddy": "Rice",
    "चावल": "Rice",
    "धान": "Rice",
    "dhaan": "Rice",
}


# =========================================================
# GENERIC TEXT NORMALIZATION
# =========================================================

def normalize_text(value):
    """
    Strip surrounding whitespace, normalize repeated spaces,
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
# CROP NORMALIZATION
# =========================================================

def normalize_crop(value):
    """
    Convert known crop aliases to canonical English names.

    Unknown crop names are preserved instead of invented.
    """

    value = normalize_text(value)

    if pd.isna(value):
        return pd.NA

    lookup_value = str(value).lower()

    return CROP_MAPPING.get(lookup_value, value)


# =========================================================
# PRICE CLEANING
# =========================================================

def parse_price(value):
    """
    Convert messy Indian price representations into numeric INR.

    Examples:
        7570.17
        "₹7,570.17"
        "Rs. 7,299"
        "INR 2,183"
        "6,620.00/-"

    Invalid or missing values become NA.
    """

    if pd.isna(value):
        return pd.NA

    # Already numeric
    if isinstance(value, (int, float)):
        return float(value)

    value = str(value).strip()

    if value == "":
        return pd.NA

    # Remove currency symbols and common textual prefixes
    value = value.replace("₹", "")
    value = value.replace("Rs.", "")
    value = value.replace("Rs", "")
    value = value.replace("INR", "")

    # Remove commas
    value = value.replace(",", "")

    # Remove trailing /-
    value = value.replace("/-", "")

    # Remove whitespace
    value = value.strip()

    try:
        return float(value)
    except (ValueError, TypeError):
        return pd.NA


# =========================================================
# MAIN CLEANING FUNCTION
# =========================================================

def clean_prices():

    print("=" * 70)
    print("PRICE + MSP CLEANING")
    print("=" * 70)

    # -----------------------------------------------------
    # 1. Check input
    # -----------------------------------------------------

    if not INPUT_FILE.exists():
        raise FileNotFoundError(
            f"Raw price file not found: {INPUT_FILE}"
        )

    PROCESSED_DIR.mkdir(parents=True, exist_ok=True)
    QUALITY_DIR.mkdir(parents=True, exist_ok=True)

    # -----------------------------------------------------
    # 2. Load JSON
    # -----------------------------------------------------

    with open(INPUT_FILE, "r", encoding="utf-8") as file:
        data = json.load(file)

    # The expected dataset is a list of records.
    if not isinstance(data, list):
        raise ValueError(
            "Expected the price JSON file to contain a list of records."
        )

    df = pd.DataFrame(data)

    raw_row_count = len(df)

    print(f"\nRaw rows: {raw_row_count}")

    # -----------------------------------------------------
    # 3. Check required columns
    # -----------------------------------------------------

    required_columns = [
        "record_id",
        "date",
        "mandi_id",
        "district",
        "crop_name",
        "min_price",
        "max_price",
        "modal_price",
        "msp",
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
    # 4. Record raw quality statistics
    # -----------------------------------------------------

    raw_missing = {
        column: int(count)
        for column, count in df.isna().sum().items()
    }

    raw_duplicate_rows = int(df.duplicated().sum())

    # -----------------------------------------------------
    # 5. Preserve original price values
    # -----------------------------------------------------

    df["min_price_original"] = df["min_price"]
    df["max_price_original"] = df["max_price"]
    df["modal_price_original"] = df["modal_price"]
    df["msp_original"] = df["msp"]

    # -----------------------------------------------------
    # 6. Normalize text fields
    # -----------------------------------------------------

    for column in [
        "record_id",
        "mandi_id",
        "district",
        "crop_name",
    ]:
        df[column] = df[column].apply(normalize_text)

    # -----------------------------------------------------
    # 7. Normalize crop names
    # -----------------------------------------------------

    df["crop_name"] = df["crop_name"].apply(
        normalize_crop
    )

    # -----------------------------------------------------
    # 8. Parse prices
    # -----------------------------------------------------

    df["min_price"] = df["min_price"].apply(parse_price)

    df["max_price"] = df["max_price"].apply(parse_price)

    df["modal_price"] = df["modal_price"].apply(parse_price)

    df["msp"] = df["msp"].apply(parse_price)

    # Convert explicitly to numeric
    for column in [
        "min_price",
        "max_price",
        "modal_price",
        "msp",
    ]:
        df[column] = pd.to_numeric(
            df[column],
            errors="coerce"
        )

    # -----------------------------------------------------
    # 9. Normalize dates
    # -----------------------------------------------------

    df["date"] = pd.to_datetime(
        df["date"].astype("string").str.strip(),
        format="mixed",
        dayfirst=True,
        errors="coerce",
    )

    # -----------------------------------------------------
    # 10. Validate price relationships
    # -----------------------------------------------------

    complete_price_rows = (
        df["min_price"].notna()
        & df["modal_price"].notna()
        & df["max_price"].notna()
    )

    invalid_price_order = (
        complete_price_rows
        & (
            (df["min_price"] > df["modal_price"])
            | (df["modal_price"] > df["max_price"])
        )
    )

    invalid_price_order_count = int(
        invalid_price_order.sum()
    )

    # -----------------------------------------------------
    # 11. Detect negative prices
    # -----------------------------------------------------

    negative_price_mask = (
        (df["min_price"] < 0)
        | (df["max_price"] < 0)
        | (df["modal_price"] < 0)
        | (df["msp"] < 0)
    )

    negative_price_count = int(
        negative_price_mask.sum()
    )

    # Negative prices are analytically invalid.
    for column in [
        "min_price",
        "max_price",
        "modal_price",
        "msp",
    ]:
        df.loc[df[column] < 0, column] = pd.NA

    # -----------------------------------------------------
    # 12. Remove exact duplicate rows
    # -----------------------------------------------------

    df = df.drop_duplicates().copy()

    # -----------------------------------------------------
    # 13. Select final columns
    # -----------------------------------------------------

    final_columns = [
        "record_id",
        "date",
        "mandi_id",
        "district",
        "crop_name",

        "min_price_original",
        "max_price_original",
        "modal_price_original",
        "msp_original",

        "min_price",
        "max_price",
        "modal_price",
        "msp",
    ]

    df = df[final_columns]

    # -----------------------------------------------------
    # 14. Final statistics
    # -----------------------------------------------------

    cleaned_row_count = len(df)

    cleaned_missing = {
        column: int(count)
        for column, count in df.isna().sum().items()
    }

    # -----------------------------------------------------
    # 15. Save cleaned dataset
    # -----------------------------------------------------

    df.to_csv(
        OUTPUT_FILE,
        index=False,
        encoding="utf-8-sig",
    )

    # -----------------------------------------------------
    # 16. Generate quality report
    # -----------------------------------------------------

    report = {
        "dataset": "track3_price_and_msp.json",

        "raw_row_count": raw_row_count,

        "cleaned_row_count": cleaned_row_count,

        "rows_removed": (
            raw_row_count - cleaned_row_count
        ),

        "exact_duplicate_rows_found":
            raw_duplicate_rows,

        "invalid_price_order_rows":
            invalid_price_order_count,

        "negative_price_rows":
            negative_price_count,

        "raw_missing_values":
            raw_missing,

        "cleaned_missing_values":
            cleaned_missing,

        "rules_applied": [
            "Normalize whitespace",
            "Normalize empty strings to missing",
            "Standardize known crop-name aliases",
            "Preserve unknown crop names",
            "Parse messy INR price strings",
            "Remove currency symbols and separators",
            "Convert prices to numeric INR",
            "Convert dates to datetime",
            "Detect invalid min/modal/max price ordering",
            "Convert negative prices to missing",
            "Remove exact duplicate rows",
            "Preserve original price representations",
            "Do not invent missing mandi IDs",
            "Do not invent missing district values",
        ],
    }

    with open(
        REPORT_FILE,
        "w",
        encoding="utf-8",
    ) as file:

        json.dump(
            report,
            file,
            indent=2,
            ensure_ascii=False,
        )

    # -----------------------------------------------------
    # 17. Print result
    # -----------------------------------------------------

    print("\n" + "=" * 70)
    print("PRICE + MSP CLEANING COMPLETE")
    print("=" * 70)

    print(f"Raw rows:                 {raw_row_count}")
    print(f"Cleaned rows:             {cleaned_row_count}")
    print(
        f"Rows removed:             "
        f"{raw_row_count - cleaned_row_count}"
    )

    print(
        f"Exact duplicates found:   "
        f"{raw_duplicate_rows}"
    )

    print(
        f"Invalid price ordering:   "
        f"{invalid_price_order_count}"
    )

    print(
        f"Negative price rows:      "
        f"{negative_price_count}"
    )

    print(f"\nCleaned file:")
    print(OUTPUT_FILE)

    print(f"\nCleaning report:")
    print(REPORT_FILE)


# =========================================================
# SCRIPT ENTRY POINT
# =========================================================

if __name__ == "__main__":
    clean_prices()