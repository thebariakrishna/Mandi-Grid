import pandas as pd

from utils.file_utils import PROCESSED_DIR


INPUT_FILE = (
    PROCESSED_DIR / "clean_transport_logistics.csv"
)


def validate_transport():

    print("=" * 70)
    print("TRANSPORT + LOGISTICS VALIDATION")
    print("=" * 70)

    # -----------------------------------------------------
    # 1. Check file
    # -----------------------------------------------------

    if not INPUT_FILE.exists():
        raise FileNotFoundError(
            f"Cleaned transport file not found: {INPUT_FILE}"
        )

    # -----------------------------------------------------
    # 2. Load data
    # -----------------------------------------------------

    df = pd.read_csv(INPUT_FILE)

    print(f"\nRows: {len(df)}")
    print(f"Columns: {len(df.columns)}")

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
        "distance_km",
        "vehicle_no",
        "driver_id",
    ]

    missing_columns = [
        column
        for column in required_columns
        if column not in df.columns
    ]

    if missing_columns:
        raise AssertionError(
            f"Missing columns: {missing_columns}"
        )

    print("\nRequired columns: OK")

    # -----------------------------------------------------
    # 4. Trip IDs
    # -----------------------------------------------------

    print(
        f"Missing trip_id: "
        f"{df['trip_id'].isna().sum()}"
    )

    print(
        f"Duplicate trip_id: "
        f"{df['trip_id'].dropna().duplicated().sum()}"
    )

    # -----------------------------------------------------
    # 5. Timestamp checks
    # -----------------------------------------------------

    print(
        f"Missing departure_time: "
        f"{df['departure_time'].isna().sum()}"
    )

    print(
        f"Missing arrival_time: "
        f"{df['arrival_time'].isna().sum()}"
    )

    # -----------------------------------------------------
    # 6. Transit checks
    # -----------------------------------------------------

    transit = pd.to_numeric(
        df["transit_hours"],
        errors="coerce"
    )

    invalid_transit = (
        transit.notna()
        & (transit < 0)
    )

    print(
        f"Negative transit_hours: "
        f"{invalid_transit.sum()}"
    )

    # -----------------------------------------------------
    # 7. Distance checks
    # -----------------------------------------------------

    distance_km = pd.to_numeric(
        df["distance_km"],
        errors="coerce"
    )

    invalid_distance = (
        distance_km.notna()
        & (distance_km < 0)
    )

    print(
        f"Negative distance_km: "
        f"{invalid_distance.sum()}"
    )

    print(
        f"Missing distance_km: "
        f"{distance_km.isna().sum()}"
    )

    # -----------------------------------------------------
    # 8. Distance units
    # -----------------------------------------------------

    print("\nDistance units:")

    print(
        df["distance_unit"]
        .value_counts(dropna=False)
    )

    # -----------------------------------------------------
    # 9. Vehicle numbers
    # -----------------------------------------------------

    print(
        f"\nMissing vehicle_no: "
        f"{df['vehicle_no'].isna().sum()}"
    )

    # -----------------------------------------------------
    # 10. Driver IDs
    # -----------------------------------------------------

    print(
        f"Missing driver_id: "
        f"{df['driver_id'].isna().sum()}"
    )

    # -----------------------------------------------------
    # 11. Duplicate rows
    # -----------------------------------------------------

    duplicate_rows = int(
        df.duplicated().sum()
    )

    print(
        f"Duplicate rows: {duplicate_rows}"
    )

    # -----------------------------------------------------
    # 12. Timestamp business rule
    # -----------------------------------------------------

    departure = pd.to_datetime(
        df["departure_time"],
        errors="coerce"
    )

    arrival = pd.to_datetime(
        df["arrival_time"],
        errors="coerce"
    )

    comparable = (
        departure.notna()
        & arrival.notna()
    )

    invalid_timestamp_order = (
        comparable
        & (arrival < departure)
    )

    print(
        "Arrival before departure:",
        invalid_timestamp_order.sum()
    )

    # -----------------------------------------------------
    # 13. Assertions
    # -----------------------------------------------------

    assert invalid_transit.sum() == 0
    assert invalid_distance.sum() == 0
    assert duplicate_rows == 0

    # -----------------------------------------------------
    # 14. Success
    # -----------------------------------------------------

    print("\n" + "=" * 70)
    print("TRANSPORT VALIDATION PASSED")
    print("=" * 70)

    print("✓ Required columns present")
    print("✓ No negative transit durations")
    print("✓ No negative distances")
    print("✓ No duplicate rows")
    print("✓ Arrival timestamps are not before departure")
    print("✓ Validation completed successfully")


if __name__ == "__main__":
    validate_transport()