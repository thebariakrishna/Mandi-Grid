import pandas as pd

FILE = "data/raw/track3_mandi_arrivals.csv"

df = pd.read_csv(FILE)

# Convert quantity to numeric
df["arrival_quantity"] = pd.to_numeric(
    df["arrival_quantity"],
    errors="coerce"
)

# Check missing quantity vs missing unit
missing_quantity = df["arrival_quantity"].isna()
missing_unit = df["unit"].isna()

print("Total rows:", len(df))

print("\nMissing quantity:", missing_quantity.sum())
print("Missing unit:", missing_unit.sum())

print("\nMissing quantity + missing unit:",
      (missing_quantity & missing_unit).sum())

print("\nMissing quantity + unit present:",
      (missing_quantity & ~missing_unit).sum())

print("\nQuantity present + unit missing:",
      (~missing_quantity & missing_unit).sum())

print("\nQuantity present + unit present:",
      (~missing_quantity & ~missing_unit).sum())

print("\nQuantity statistics:")
print(df["arrival_quantity"].describe())

print("\nUnit distribution:")
print(df["unit"].value_counts(dropna=False))