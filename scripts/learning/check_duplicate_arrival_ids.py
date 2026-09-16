import pandas as pd

FILE = "data/raw/track3_mandi_arrivals.csv"

df = pd.read_csv(FILE)

# Find arrival IDs that occur more than once
duplicate_ids = (
    df["arrival_id"]
    .dropna()
    .value_counts()
)

duplicate_ids = duplicate_ids[duplicate_ids > 1]

print("Number of duplicated arrival IDs:", len(duplicate_ids))
print("Total rows involved:", duplicate_ids.sum())

print("\nTop duplicated arrival IDs:")
print(duplicate_ids.head(20))

# Show actual records for the first few duplicated IDs
sample_ids = duplicate_ids.head(5).index

print("\nDetailed examples:")

for arrival_id in sample_ids:
    print("\n" + "=" * 60)
    print("arrival_id:", arrival_id)

    print(
        df[df["arrival_id"] == arrival_id].to_string(index=False)
    )