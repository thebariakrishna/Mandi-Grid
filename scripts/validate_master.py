import pandas as pd

from utils.file_utils import PROCESSED_DIR


INPUT_FILE = PROCESSED_DIR / "clean_mandi_master.csv"


def validate_master():
    """Validate the cleaned mandi master dataset."""

    print("=" * 70)
    print("MANDI MASTER VALIDATION")
    print("=" * 70)

    if not INPUT_FILE.exists():
        raise FileNotFoundError(
            f"Cleaned master file not found: {INPUT_FILE}"
        )

    df = pd.read_csv(INPUT_FILE)

    errors = []

    # ---------------------------------------------------------
    # Check 1: mandi_id must exist
    # ---------------------------------------------------------

    missing_mandi_ids = int(df["mandi_id"].isna().sum())

    if missing_mandi_ids > 0:
        errors.append(
            f"Missing mandi_id values: {missing_mandi_ids}"
        )

    # ---------------------------------------------------------
    # Check 2: mandi_id must be unique
    # ---------------------------------------------------------

    duplicate_mandi_ids = int(
        df["mandi_id"].duplicated().sum()
    )

    if duplicate_mandi_ids > 0:
        errors.append(
            f"Duplicate mandi_id values: {duplicate_mandi_ids}"
        )

    # ---------------------------------------------------------
    # Check 3: area must be positive when present
    # ---------------------------------------------------------

    invalid_area = int(
        (df["total_area_acres"].dropna() <= 0).sum()
    )

    if invalid_area > 0:
        errors.append(
            f"Invalid total_area_acres values: {invalid_area}"
        )

    # ---------------------------------------------------------
    # Check 4: mandi_type should use expected values
    # ---------------------------------------------------------

    allowed_mandi_types = {
        "APMC",
        "Private",
        "Direct",
    }

    invalid_types = df[
        df["mandi_type"].notna()
        & ~df["mandi_type"].isin(allowed_mandi_types)
    ]

    if len(invalid_types) > 0:
        errors.append(
            f"Unexpected mandi_type values: {len(invalid_types)}"
        )

    # ---------------------------------------------------------
    # Final result
    # ---------------------------------------------------------

    print(f"\nRows checked: {len(df)}")

    if errors:
        print("\nVALIDATION FAILED")

        for error in errors:
            print(f"✗ {error}")

        raise SystemExit(1)

    print("\nVALIDATION PASSED")

    print("✓ mandi_id is present")
    print("✓ mandi_id is unique")
    print("✓ Area values are valid")
    print("✓ mandi_type values are standardized")


if __name__ == "__main__":
    validate_master()