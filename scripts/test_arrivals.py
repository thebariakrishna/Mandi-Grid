import pandas as pd

file_path = "data/raw/track3_mandi_arrivals.csv"

df = pd.read_csv(file_path)

print("Rows:", len(df))
print("Columns:", len(df.columns))

print("\nColumn names:")
print(df.columns.tolist())

print("\nFirst 5 rows:")
print(df.head())