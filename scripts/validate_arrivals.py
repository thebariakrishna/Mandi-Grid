import pandas as pd

INPUT = "data/processed/clean_mandi_arrivals.csv"

df = pd.read_csv(INPUT)

print(f"Rows: {len(df)}")
print(f"Columns: {len(df.columns)}")

# 1. Arrival ID
assert df["arrival_id"].notna().all() or df["arrival_id"].isna().sum() > 0
print(f"Missing arrival_id: {df['arrival_id'].isna().sum()}")

# 2. Dates
print(f"Missing dates: {df['date'].isna().sum()}")

# 3. Quantity
print(f"Missing quantity: {df['arrival_quantity_qtl'].isna().sum()}")
print(f"Negative quantity: {(df['arrival_quantity_qtl'] < 0).sum()}")

# 4. Farmer count
print(f"Missing farmer_count: {df['farmer_count'].isna().sum()}")
print(f"Invalid farmer_count: {(df['farmer_count'] < 0).sum()}")

# 5. Crop names
print("\nCrop names:")
print(df["crop_name"].value_counts(dropna=False))

# 6. Units
print("\nOriginal units:")
print(df["unit_original"].value_counts(dropna=False))

# 7. Duplicate rows
print(f"\nDuplicate rows: {df.duplicated().sum()}")

print("\nARRIVALS VALIDATION COMPLETE")