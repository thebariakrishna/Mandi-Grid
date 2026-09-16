import json

import pandas as pd

from utils.file_utils import RAW_DIR, PROCESSED_DIR, QUALITY_DIR


INPUT_FILE = RAW_DIR / "track3_mandi_arrivals.csv"
OUTPUT_FILE = PROCESSED_DIR / "clean_mandi_arrivals.csv"
REPORT_FILE = QUALITY_DIR / "arrivals_cleaning_report.json"


# ---------------------------------------------------------
# Crop-name standardization
# ---------------------------------------------------------

crop_mapping = {
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


# ---------------------------------------------------------
# Generic text normalization
# ---------------------------------------------------------

def normalize_text(value):
    """Strip whitespace and normalize empty text to missing."""

    if pd.isna(value):
        return pd.NA

    value = str(value).strip()
    value = " ".join(value.split())

    if value == "":
        return pd.NA

    return value


# ---------------------------------------------------------
# Crop normalization
# ---------------------------------------------------------

def normalize_crop(value):
    """
    Convert known crop aliases into canonical English names.

    Unknown crop values are preserved rather than invented.
    """

    value = normalize_text(value)

    if pd.isna(value):
        return pd.NA

    lookup_value = str(value).lower()

    return crop_mapping.get(lookup_value, value)


# ---------------------------------------------------------
# Unit normalization
# ---------------------------------------------------------

def normalize_unit(value):
    """
    Convert different representations into canonical units.

    Canonical units:
        KG
        Quintal
        Tonne
    """

    value = normalize_text(value)

    if pd.isna(value):
        return pd.NA

    lookup_value = str(value).lower()

    mapping = {
        "kg": "KG",
        "kgs": "KG",
        "kilo": "KG",

        "q": "Quintal",
        "qtl": "Quintal",
        "quintal": "Quintal",
        "quintals": "Quintal",

        "mt": "Tonne",
        "t": "Tonne",
        "tonne": "Tonne",
        "tonnes": "Tonne",
    }

    return mapping.get(lookup_value, value)


# ---------------------------------------------------------
# Quantity conversion
# ---------------------------------------------------------

def convert_to_quintal(quantity, unit):
    """
    Convert arrival quantity into Quintals.

    Conversion rules:
        1 Quintal = 100 KG
        1 Tonne = 10 Quintals
    """

    if pd.isna(quantity) or pd.isna(unit):
        return pd.NA

    if unit == "KG":
        return quantity / 100

    if unit == "Quintal":
        return quantity

    if unit == "Tonne":
        return quantity * 10

    # Unknown unit
    return pd.NA


# ---------------------------------------------------------
# Main cleaning function
# ---------------------------------------------------------

def clean_arrivals():

    print("=" * 70)
    print("MANDI ARRIVALS CLEANING")
    print("=" * 70)

    # -----------------------------------------------------
    # 1. Check input
    # -----------------------------------------------------

    if not INPUT_FILE.exists():
        raise FileNotFoundError(
            f"Raw arrivals file not found: {INPUT_FILE}"
        )

    PROCESSED_DIR.mkdir(parents=True, exist_ok=True)
    QUALITY_DIR.mkdir(parents=True, exist_ok=True)

    # -----------------------------------------------------
    # 2. Load raw data
    # -----------------------------------------------------

    df = pd.read_csv(INPUT_FILE)

    raw_row_count = len(df)

    print(f"\nRaw rows: {raw_row_count}")

    # -----------------------------------------------------
    # 3. Record raw quality statistics
    # -----------------------------------------------------

    raw_missing = {
        column: int(count)
        for column, count in df.isna().sum().items()
    }

    raw_duplicates = int(df.duplicated().sum())

    # Convert quantity to numeric BEFORE performing
    # numerical comparisons.
    df["arrival_quantity"] = pd.to_numeric(
        df["arrival_quantity"],
        errors="coerce"
    )

    negative_quantity_count = int(
        (df["arrival_quantity"] < 0).sum()
    )

    print(f"Exact duplicate rows: {raw_duplicates}")
    print(
        f"Negative quantities: {negative_quantity_count}"
    )

    # -----------------------------------------------------
    # 4. Preserve original values
    # -----------------------------------------------------

    df["arrival_quantity_original"] = df[
        "arrival_quantity"
    ]

    df["unit_original"] = df["unit"]

    # -----------------------------------------------------
    # 5. Normalize text columns
    # -----------------------------------------------------

    for column in ["arrival_id", "mandi_id", "variety"]:
        df[column] = df[column].apply(normalize_text)

    # -----------------------------------------------------
    # 6. Normalize crop names
    # -----------------------------------------------------

    df["crop_name"] = df["crop_name"].apply(
        normalize_crop
    )

    # -----------------------------------------------------
    # 7. Normalize units
    # -----------------------------------------------------

    df["unit"] = df["unit"].apply(normalize_unit)

    # -----------------------------------------------------
    # 8. Convert quantity to numeric
    # -----------------------------------------------------

    df["arrival_quantity"] = pd.to_numeric(
        df["arrival_quantity"],
        errors="coerce"
    )

    # -----------------------------------------------------
    # 9. Convert everything to Quintals
    # -----------------------------------------------------

    df["arrival_quantity_qtl"] = df.apply(
        lambda row: convert_to_quintal(
            row["arrival_quantity"],
            row["unit"]
        ),
        axis=1
    )

    df["arrival_quantity_qtl"] = pd.to_numeric(
        df["arrival_quantity_qtl"],
        errors="coerce"
    )

    # -----------------------------------------------------
    # 10. Handle negative quantities
    # -----------------------------------------------------

    negative_quantity_count_after_conversion = int(
        (df["arrival_quantity_qtl"] < 0).sum()
    )

    df.loc[
        df["arrival_quantity_qtl"] < 0,
        "arrival_quantity_qtl"
    ] = pd.NA

    # -----------------------------------------------------
    # 11. Normalize dates
    # -----------------------------------------------------

    df["date"] = pd.to_datetime(
    df["date"].astype(str).str.strip(),
    format="mixed",
    dayfirst=True,
    errors="coerce"
    )
    df["farmer_count"] = pd.to_numeric(
    df["farmer_count"],
    errors="coerce"
    )

    # -----------------------------------------------------
    # 12. Remove exact duplicate records
    # -----------------------------------------------------

    df = df.drop_duplicates().copy()

    # -----------------------------------------------------
    # 13. Select final columns
    # -----------------------------------------------------

    final_columns = [
        "arrival_id",
        "date",
        "mandi_id",
        "crop_name",
        "variety",
        "arrival_quantity_original",
        "unit_original",
        "arrival_quantity_qtl",
        "farmer_count",
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
        encoding="utf-8-sig"
    )

    # -----------------------------------------------------
    # 16. Generate cleaning report
    # -----------------------------------------------------

    report = {
        "dataset": "track3_mandi_arrivals.csv",

        "raw_row_count": raw_row_count,

        "cleaned_row_count": cleaned_row_count,

        "rows_removed": (
            raw_row_count - cleaned_row_count
        ),

        "exact_duplicate_rows_found": raw_duplicates,

        "negative_quantities_found":
            negative_quantity_count,

        "negative_quantities_after_conversion":
            negative_quantity_count_after_conversion,

        "raw_missing_values": raw_missing,

        "cleaned_missing_values": cleaned_missing,

        "rules_applied": [
            "Normalize whitespace",
            "Standardize crop names",
            "Standardize unit representations",
            "Convert quantities to Quintals",
            "1 Quintal = 100 KG",
            "1 Tonne = 10 Quintals",
            "Preserve original quantity and unit",
            "Convert dates to datetime",
            "Remove exact duplicate rows",
            "Convert negative analytical quantities to missing",
            "Do not invent missing units",
            "Do not invent missing crop names",
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
    # 17. Print result
    # -----------------------------------------------------

    print("\n" + "=" * 70)
    print("ARRIVALS CLEANING COMPLETE")
    print("=" * 70)

    print(f"Raw rows:       {raw_row_count}")
    print(f"Cleaned rows:   {cleaned_row_count}")
    print(
        f"Rows removed:   "
        f"{raw_row_count - cleaned_row_count}"
    )

    print(
        f"Duplicates:     {raw_duplicates}"
    )

    print(
        f"Negative quantities: "
        f"{negative_quantity_count}"
    )

    print(f"\nCleaned file:")
    print(OUTPUT_FILE)

    print(f"\nCleaning report:")
    print(REPORT_FILE)


if __name__ == "__main__":
    clean_arrivals()