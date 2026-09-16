from pathlib import Path

import pandas as pd


# ============================================================
# PATHS
# ============================================================

BASE_DIR = Path(__file__).resolve().parents[1]

INPUT_FILE = BASE_DIR / "data" / "raw" / "track3_weather_sensors.xlsx"
OUTPUT_FILE = BASE_DIR / "data" / "processed" / "weather_cleaned.csv"


# ============================================================
# CONSTANTS
# ============================================================

REQUIRED_COLUMNS = [
    "timestamp",
    "sensor_id",
    "temperature",
    "temp_unit",
    "rainfall",
    "rain_unit",
    "humidity_percent",
]


# ============================================================
# TEXT NORMALIZATION
# ============================================================

def normalize_text(value):
    """
    Standardize general text values.

    Examples:
        '  abc  ' -> 'abc'
        ''        -> NA
        'nan'     -> NA
        'None'    -> NA
    """
    if pd.isna(value):
        return pd.NA

    value = str(value).strip()

    if value == "":
        return pd.NA

    if value.lower() in {"nan", "none", "null", "na", "n/a"}:
        return pd.NA

    return value


# ============================================================
# TEMPERATURE UNIT NORMALIZATION
# ============================================================

def normalize_temperature_unit(value):
    """
    Convert all known temperature-unit representations
    into either C or F.
    """

    if pd.isna(value):
        return pd.NA

    value = str(value).strip().lower()

    mapping = {
        "c": "C",
        "°c": "C",
        "celsius": "C",

        "f": "F",
        "°f": "F",
        "fahrenheit": "F",
    }

    return mapping.get(value, pd.NA)


# ============================================================
# RAINFALL UNIT NORMALIZATION
# ============================================================

def normalize_rain_unit(value):
    """
    Convert all known rainfall-unit representations
    into either MM or INCH.
    """

    if pd.isna(value):
        return pd.NA

    value = str(value).strip().lower()

    mapping = {
        "mm": "MM",
        "millimeter": "MM",
        "millimeters": "MM",

        "in": "INCH",
        "inch": "INCH",
        "inches": "INCH",
    }

    return mapping.get(value, pd.NA)


# ============================================================
# MAIN CLEANING FUNCTION
# ============================================================

def clean_weather():

    print("=" * 60)
    print("WEATHER DATA CLEANING")
    print("=" * 60)

    # --------------------------------------------------------
    # 1. LOAD DATA
    # --------------------------------------------------------

    df = pd.read_excel(
        INPUT_FILE,
        sheet_name="sensor_logs"
    )

    print(f"Raw rows: {len(df)}")
    print(f"Raw columns: {len(df.columns)}")

    # --------------------------------------------------------
    # 2. CHECK REQUIRED COLUMNS
    # --------------------------------------------------------

    missing_columns = [
        col for col in REQUIRED_COLUMNS
        if col not in df.columns
    ]

    if missing_columns:
        raise ValueError(
            f"Missing required columns: {missing_columns}"
        )

    # --------------------------------------------------------
    # 3. REMOVE EXACT DUPLICATES
    # --------------------------------------------------------

    duplicate_count = int(df.duplicated().sum())

    df = df.drop_duplicates().copy()

    print(f"Exact duplicate rows removed: {duplicate_count}")

    # --------------------------------------------------------
    # 4. PRESERVE ORIGINAL VALUES
    # --------------------------------------------------------

    df["temperature_original"] = df["temperature"]
    df["temp_unit_original"] = df["temp_unit"]
    df["rainfall_original"] = df["rainfall"]
    df["rain_unit_original"] = df["rain_unit"]
    df["humidity_original"] = df["humidity_percent"]

    # --------------------------------------------------------
    # 5. NORMALIZE GENERAL TEXT
    # --------------------------------------------------------

    df["sensor_id"] = df["sensor_id"].apply(normalize_text)

    # UNKNOWN sensor IDs are treated as missing analytical IDs.
    df["sensor_id"] = df["sensor_id"].replace(
        {
            "UNKNOWN": pd.NA,
            "unknown": pd.NA,
            "Unknown": pd.NA,
        }
    )

    # --------------------------------------------------------
    # 6. NORMALIZE TEMPERATURE UNIT
    # --------------------------------------------------------

    df["temp_unit"] = df["temp_unit"].apply(
        normalize_temperature_unit
    )

    # --------------------------------------------------------
    # 7. NORMALIZE RAINFALL UNIT
    # --------------------------------------------------------

    df["rain_unit"] = df["rain_unit"].apply(
        normalize_rain_unit
    )

    # --------------------------------------------------------
    # 8. CONVERT NUMERIC COLUMNS
    # --------------------------------------------------------

    df["temperature"] = pd.to_numeric(
        df["temperature"],
        errors="coerce"
    )

    df["rainfall"] = pd.to_numeric(
        df["rainfall"],
        errors="coerce"
    )

    df["humidity_percent"] = pd.to_numeric(
    df["humidity_percent"],
    errors="coerce"
)

    # --------------------------------------------------------
    # 9. TEMPERATURE → CELSIUS
    # --------------------------------------------------------

    fahrenheit_mask = (
        df["temp_unit"].eq("F")
        & df["temperature"].notna()
    )

    df.loc[
        fahrenheit_mask,
        "temperature_c"
    ] = (
        df.loc[fahrenheit_mask, "temperature"] - 32
    ) * 5 / 9

    celsius_mask = (
        df["temp_unit"].eq("C")
        & df["temperature"].notna()
    )

    df.loc[
        celsius_mask,
        "temperature_c"
    ] = df.loc[
        celsius_mask,
        "temperature"
    ]

    # If the original temperature exists but its unit is missing,
    # we cannot safely convert it.
    unknown_temperature_unit = (
        df["temperature"].notna()
        & df["temp_unit"].isna()
    )

    df.loc[
        unknown_temperature_unit,
        "temperature_c"
    ] = pd.NA

    # --------------------------------------------------------
    # 10. RAINFALL → MILLIMETERS
    # --------------------------------------------------------

    mm_mask = (
        df["rain_unit"].eq("MM")
        & df["rainfall"].notna()
    )

    df.loc[
        mm_mask,
        "rainfall_mm"
    ] = df.loc[
        mm_mask,
        "rainfall"
    ]

    inch_mask = (
        df["rain_unit"].eq("INCH")
        & df["rainfall"].notna()
    )

    df.loc[
        inch_mask,
        "rainfall_mm"
    ] = (
        df.loc[inch_mask, "rainfall"] * 25.4
    )

    # Missing/unknown rainfall unit means conversion
    # cannot be performed safely.
    unknown_rain_unit = (
        df["rainfall"].notna()
        & df["rain_unit"].isna()
    )

    df.loc[
        unknown_rain_unit,
        "rainfall_mm"
    ] = pd.NA

    # --------------------------------------------------------
    # 11. VALIDATE PHYSICAL VALUES
    # --------------------------------------------------------

    # Temperature values are not automatically discarded merely
    # because they look unusual. We only remove impossible
    # numerical values.
    #
    # Absolute zero is approximately -273.15°C.
    impossible_temperature = (
        df["temperature_c"].notna()
        & (df["temperature_c"] < -273.15)
    )

    df.loc[
        impossible_temperature,
        "temperature_c"
    ] = pd.NA

    # Rainfall cannot be negative.
    negative_rainfall = (
        df["rainfall_mm"].notna()
        & (df["rainfall_mm"] < 0)
    )

    df.loc[
        negative_rainfall,
        "rainfall_mm"
    ] = pd.NA

    # Humidity must be between 0 and 100.
    invalid_humidity = (
        df["humidity_percent"].notna()
        & (
            (df["humidity_percent"] < 0)
            | (df["humidity_percent"] > 100)
        )
    )

    df.loc[
        invalid_humidity,
        "humidity_percent"
    ] = pd.NA

    # --------------------------------------------------------
        # --------------------------------------------------------
    # --------------------------------------------------------
    # 12. PARSE AND STANDARDIZE TIMESTAMP TO IST
    # --------------------------------------------------------

    raw_timestamp = (
        df["timestamp"]
        .astype("string")
        .str.strip()
    )

    # Initialize final timestamp column.
    df["timestamp"] = pd.Series(
        pd.NaT,
        index=df.index,
        dtype="datetime64[ns, Asia/Kolkata]"
    )

    # --------------------------------------------------------
    # 12A. UTC timestamps
    # --------------------------------------------------------

    utc_mask = (
        raw_timestamp.str.upper().str.endswith(" UTC")
    )

    if utc_mask.any():
        utc_values = (
            raw_timestamp.loc[utc_mask]
            .str.replace(
                r"\s+UTC$",
                "",
                regex=True,
                case=False
            )
        )

        parsed_utc = pd.to_datetime(
            utc_values,
            format="mixed",
            errors="coerce",
            utc=True
        )

        df.loc[utc_mask, "timestamp"] = (
            parsed_utc.dt.tz_convert("Asia/Kolkata")
        )

    # --------------------------------------------------------
    # 12B. IST timestamps
    # --------------------------------------------------------

    ist_mask = (
        raw_timestamp.str.upper().str.endswith(" IST")
    )

    if ist_mask.any():
        ist_values = (
            raw_timestamp.loc[ist_mask]
            .str.replace(
                r"\s+IST$",
                "",
                regex=True,
                case=False
            )
        )

        parsed_ist = pd.to_datetime(
            ist_values,
            format="mixed",
            errors="coerce"
        )

        # These timestamps explicitly say IST,
        # so localize them directly to Asia/Kolkata.
        parsed_ist = parsed_ist.dt.tz_localize(
            "Asia/Kolkata"
        )

        df.loc[ist_mask, "timestamp"] = parsed_ist

    # --------------------------------------------------------
    # 12C. Timestamps with no timezone
    # --------------------------------------------------------

    timezone_free_mask = (
        raw_timestamp.notna()
        & ~utc_mask
        & ~ist_mask
    )

    if timezone_free_mask.any():
        timezone_free_values = raw_timestamp.loc[
            timezone_free_mask
        ]

        parsed_timezone_free = pd.to_datetime(
            timezone_free_values,
            format="mixed",
            errors="coerce"
        )

        parsed_timezone_free = (
            parsed_timezone_free
            .dt.tz_localize("Asia/Kolkata")
        )

        df.loc[
            timezone_free_mask,
            "timestamp"
        ] = parsed_timezone_free

    # --------------------------------------------------------
    # 13. CREATE DATE COLUMN
    # --------------------------------------------------------

    df["date"] = df["timestamp"].dt.date

    # --------------------------------------------------------
    # 14. CREATE STANDARDIZED OUTPUT
    # --------------------------------------------------------

    final_columns = [
        "timestamp",
        "date",
        "sensor_id",

        "temperature_original",
        "temp_unit_original",
        "temperature_c",

        "rainfall_original",
        "rain_unit_original",
        "rainfall_mm",

        "humidity_original",
        "humidity_percent",

    ]

    df = df[final_columns]

    # --------------------------------------------------------
    # 15. SORT DATA
    # --------------------------------------------------------

    df = df.sort_values(
        by=["timestamp", "sensor_id"],
        na_position="last"
    ).reset_index(drop=True)

    # --------------------------------------------------------
    # 16. SAVE
    # --------------------------------------------------------

    OUTPUT_FILE.parent.mkdir(
        parents=True,
        exist_ok=True
    )

    df.to_csv(
        OUTPUT_FILE,
        index=False
    )

    # --------------------------------------------------------
    # 17. SUMMARY
    # --------------------------------------------------------

    print()
    print("Cleaning completed.")
    print(f"Cleaned rows: {len(df)}")
    print(f"Cleaned columns: {len(df.columns)}")
    print(f"Output: {OUTPUT_FILE}")

    print()
    print("Missing values after cleaning:")

    print(
        df.isna()
        .sum()
        .sort_values(ascending=False)
    )

    print()
    print("Temperature units standardized:")
    print(df["temp_unit_original"].value_counts(dropna=False))

    print()
    print("Rainfall units standardized:")
    print(df["rain_unit_original"].value_counts(dropna=False))

    print()
    print("Weather cleaning finished successfully.")


# ============================================================
# ENTRY POINT
# ============================================================

if __name__ == "__main__":
    clean_weather()