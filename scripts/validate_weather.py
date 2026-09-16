from pathlib import Path

import pandas as pd


# ============================================================
# PATHS
# ============================================================

BASE_DIR = Path(__file__).resolve().parents[1]

WEATHER_FILE = (
    BASE_DIR
    / "data"
    / "processed"
    / "weather_cleaned.csv"
)


# ============================================================
# VALIDATION FUNCTION
# ============================================================

def validate_weather():

    print("=" * 70)
    print("WEATHER DATA VALIDATION")
    print("=" * 70)

    # --------------------------------------------------------
    # 1. Check file
    # --------------------------------------------------------

    if not WEATHER_FILE.exists():
        raise FileNotFoundError(
            f"Cleaned weather file not found: {WEATHER_FILE}"
        )

    # --------------------------------------------------------
    # 2. Load data
    # --------------------------------------------------------

    df = pd.read_csv(
        WEATHER_FILE,
        parse_dates=["timestamp"]
    )

    print(f"\nRows: {len(df)}")
    print(f"Columns: {len(df.columns)}")

    # --------------------------------------------------------
    # 3. Required columns
    # --------------------------------------------------------

    required_columns = [
        "timestamp",
        "date",
        "sensor_id",
        "temperature_c",
        "rainfall_mm",
        "humidity_percent",
    ]

    missing_columns = [
        column
        for column in required_columns
        if column not in df.columns
    ]

    if missing_columns:
        print("\nRequired columns: FAIL")
        print(f"Missing columns: {missing_columns}")
        return

    print("\nRequired columns: OK")

    # --------------------------------------------------------
    # 4. Duplicate validation
    # --------------------------------------------------------

    duplicate_rows = int(df.duplicated().sum())

    print(f"Duplicate rows: {duplicate_rows}")

    # --------------------------------------------------------
    # 5. Timestamp validation
    # --------------------------------------------------------

    missing_timestamp = int(
        df["timestamp"].isna().sum()
    )

    print(
        f"Missing timestamp: "
        f"{missing_timestamp}"
    )

    # --------------------------------------------------------
    # 6. Date validation
    # --------------------------------------------------------

    missing_date = int(
        df["date"].isna().sum()
    )

    print(
        f"Missing date: "
        f"{missing_date}"
    )

    # --------------------------------------------------------
    # 7. Temperature validation
    # --------------------------------------------------------

    temperature = pd.to_numeric(
        df["temperature_c"],
        errors="coerce"
    )

    invalid_temperature = (
        temperature.notna()
        & (temperature < -273.15)
    )

    invalid_temperature_count = int(
        invalid_temperature.sum()
    )

    print(
        f"Invalid temperature (< -273.15°C): "
        f"{invalid_temperature_count}"
    )

    # --------------------------------------------------------
    # 8. Rainfall validation
    # --------------------------------------------------------

    rainfall = pd.to_numeric(
        df["rainfall_mm"],
        errors="coerce"
    )

    invalid_rainfall = (
        rainfall.notna()
        & (rainfall < 0)
    )

    invalid_rainfall_count = int(
        invalid_rainfall.sum()
    )

    print(
        f"Invalid rainfall (< 0 mm): "
        f"{invalid_rainfall_count}"
    )

    # --------------------------------------------------------
    # 9. Humidity validation
    # --------------------------------------------------------

    humidity = pd.to_numeric(
        df["humidity_percent"],
        errors="coerce"
    )

    invalid_humidity = (
        humidity.notna()
        & (
            (humidity < 0)
            | (humidity > 100)
        )
    )

    invalid_humidity_count = int(
        invalid_humidity.sum()
    )

    print(
        f"Invalid humidity (outside 0-100%): "
        f"{invalid_humidity_count}"
    )

    # --------------------------------------------------------
    # --------------------------------------------------------
    # 11. Final status
    # --------------------------------------------------------

    total_issues = (
        duplicate_rows
        + invalid_temperature_count
        + invalid_rainfall_count
        + invalid_humidity_count
    )

    print("\n" + "=" * 70)
    print("WEATHER VALIDATION COMPLETED")
    print("=" * 70)

    print(
        f"Total validation issues: "
        f"{total_issues}"
    )

    if total_issues == 0:
        print("STATUS: WEATHER VALIDATION PASSED")
    else:
        print(
            "STATUS: WEATHER VALIDATION EXCEPTIONS "
            "DETECTED — REVIEW THE COUNTS ABOVE"
        )

    print("=" * 70)


# ============================================================
# ENTRY POINT
# ============================================================

if __name__ == "__main__":
    validate_weather()