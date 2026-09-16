import pandas as pd

from utils.file_utils import PROCESSED_DIR


INPUT_FILE = PROCESSED_DIR / "clean_price_and_msp.csv"


def validate_prices():

    print("=" * 70)
    print("PRICE + MSP VALIDATION")
    print("=" * 70)

    # ---------------------------------------------------------
    # 1. Check cleaned file exists
    # ---------------------------------------------------------

    if not INPUT_FILE.exists():
        raise FileNotFoundError(
            f"Cleaned price file not found: {INPUT_FILE}"
        )

    # ---------------------------------------------------------
    # 2. Load cleaned dataset
    # ---------------------------------------------------------

    df = pd.read_csv(INPUT_FILE)

    print(f"\nRows: {len(df)}")
    print(f"Columns: {len(df.columns)}")

    # ---------------------------------------------------------
    # 3. Required columns
    # ---------------------------------------------------------

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

    print("\nRequired columns: OK")

    # ---------------------------------------------------------
    # 4. Record ID
    # ---------------------------------------------------------

    missing_record_id = df["record_id"].isna().sum()

    duplicate_record_id = (
        df["record_id"]
        .dropna()
        .duplicated()
        .sum()
    )

    print(f"Missing record_id: {missing_record_id}")
    print(f"Duplicate record_id: {duplicate_record_id}")

    # ---------------------------------------------------------
    # 5. Dates
    # ---------------------------------------------------------

    missing_dates = df["date"].isna().sum()

    print(f"Missing dates: {missing_dates}")

    # ---------------------------------------------------------
    # 6. Mandi and district
    # ---------------------------------------------------------

    missing_mandi_id = df["mandi_id"].isna().sum()
    missing_district = df["district"].isna().sum()

    print(f"Missing mandi_id: {missing_mandi_id}")
    print(f"Missing district: {missing_district}")

    # ---------------------------------------------------------
    # 7. Crop names
    # ---------------------------------------------------------

    print("\nCrop names:")
    print(
        df["crop_name"]
        .value_counts(dropna=False)
    )

    # ---------------------------------------------------------
    # 8. Price validation
    # ---------------------------------------------------------

    price_columns = [
        "min_price",
        "max_price",
        "modal_price",
        "msp",
    ]

    print("\nPrice validation:")

    for column in price_columns:

        numeric = pd.to_numeric(
            df[column],
            errors="coerce"
        )

        invalid_numeric = (
            df[column].notna()
            & numeric.isna()
        ).sum()

        negative = (
            numeric < 0
        ).sum()

        print(
            f"{column}: "
            f"missing={numeric.isna().sum()}, "
            f"invalid={invalid_numeric}, "
            f"negative={negative}"
        )

    # ---------------------------------------------------------
    # 9. Business rule:
    # min_price <= modal_price <= max_price
    # ---------------------------------------------------------

    complete_prices = (
        df["min_price"].notna()
        & df["modal_price"].notna()
        & df["max_price"].notna()
    )

    invalid_price_order = (
        complete_prices
        & (
            (df["min_price"] > df["modal_price"])
            | (df["modal_price"] > df["max_price"])
        )
    )

    invalid_price_order_count = int(
        invalid_price_order.sum()
    )

    print(
        "\nInvalid min <= modal <= max rows:",
        invalid_price_order_count
    )

    # ---------------------------------------------------------
    # 10. Duplicate rows
    # ---------------------------------------------------------

    duplicate_rows = int(
        df.duplicated().sum()
    )

    print(
        "Duplicate rows:",
        duplicate_rows
    )

    # ---------------------------------------------------------
    # 11. Final validation checks
    # ---------------------------------------------------------

    assert (
        df["min_price"]
        .dropna()
        .ge(0)
        .all()
    ), "Negative min_price found"

    assert (
        df["max_price"]
        .dropna()
        .ge(0)
        .all()
    ), "Negative max_price found"

    assert (
        df["modal_price"]
        .dropna()
        .ge(0)
        .all()
    ), "Negative modal_price found"

    assert (
        df["msp"]
        .dropna()
        .ge(0)
        .all()
    ), "Negative MSP found"

    assert (
        invalid_price_order_count == 0
    ), "Invalid min/modal/max price relationship found"

    assert (
        duplicate_rows == 0
    ), "Duplicate rows found"

    # ---------------------------------------------------------
    # 12. Validation passed
    # ---------------------------------------------------------

    print("\n" + "=" * 70)
    print("PRICE VALIDATION PASSED")
    print("=" * 70)

    print("✓ Required columns present")
    print("✓ Price columns validated")
    print("✓ No negative analytical prices")
    print("✓ min_price <= modal_price <= max_price")
    print("✓ No duplicate rows")
    print("✓ Validation completed successfully")


if __name__ == "__main__":
    validate_prices()