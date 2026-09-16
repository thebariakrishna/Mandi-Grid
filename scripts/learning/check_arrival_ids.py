import pandas as pd

FILE = "data/raw/track3_mandi_arrivals.csv"

df = pd.read_csv(FILE)

missing_id = df["arrival_id"].isna()

print("Total rows:", len(df))
print("Missing arrival_id:", missing_id.sum())

print("\nRows with missing arrival_id:")
print(
    df.loc[
        missing_id,
        [
            "date",
            "mandi_id",
            "crop_name",
            "variety",
            "arrival_quantity",
            "unit",
            "farmer_count",
        ],
    ].head(20)
)

print("\nMissing arrival IDs by crop:")
print(
    df.loc[missing_id, "crop_name"]
    .value_counts(dropna=False)
)

print("\nMissing arrival IDs by mandi:")
print(
    df.loc[missing_id, "mandi_id"]
    .value_counts(dropna=False)
)

print("\nDuplicate arrival IDs among non-missing:")
print(
    df.loc[df["arrival_id"].notna(), "arrival_id"]
    .duplicated()
    .sum()
)