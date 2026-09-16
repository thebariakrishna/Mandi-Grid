import pandas as pd

FILE = "data/raw/track3_mandi_arrivals.csv"

df = pd.read_csv(FILE)

print("Total rows:", len(df))
print("\nUnique date examples:\n")

print(df["date"].dropna().astype(str).value_counts().head(50))