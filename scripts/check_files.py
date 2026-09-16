from pathlib import Path

RAW_DIR = Path("data/raw")

print("Checking raw data files...\n")

for file in RAW_DIR.iterdir():
    if file.is_file():
        print(f"✓ {file.name}")