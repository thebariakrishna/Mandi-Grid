import pandas as pd
from pathlib import Path

repo_dir = Path(r"C:\Users\Himanshu Kansal\Desktop\AgriMandi\agritech_repo")
processed_dir = repo_dir / "data" / "processed"

print("--- MANDI MASTER ---")
master = pd.read_csv(processed_dir / "clean_mandi_master.csv")
print(f"Master rows: {len(master)}")
print("Unique master IDs:", master["mandi_id"].nunique())
print("Master IDs format samples:", master["mandi_id"].dropna().sample(5).tolist() if len(master) >= 5 else master["mandi_id"].tolist())

files = [
    "clean_mandi_arrivals.csv",
    "clean_price_and_msp.csv",
    "clean_transport_logistics.csv",
    "weather_cleaned.csv"
]

for file in files:
    print(f"\n--- {file} ---")
    df = pd.read_csv(processed_dir / file)
    print(f"Rows: {len(df)}")
    if "mandi_id" in df.columns:
        print("Unique IDs:", df["mandi_id"].nunique())
        # Print non-matching IDs
        unmatched = set(df["mandi_id"].dropna()) - set(master["mandi_id"].dropna())
        print(f"Unmatched unique IDs: {len(unmatched)}")
        print(f"Sample unmatched: {list(unmatched)[:10]}")
    if "crop_name" in df.columns:
        print("Unique crops:", df["crop_name"].nunique())
        print("Crops:", sorted([str(x) for x in df["crop_name"].dropna().unique()]))

