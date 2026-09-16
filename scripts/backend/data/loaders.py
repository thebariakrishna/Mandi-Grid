import pandas as pd
from pathlib import Path

# Cache to hold loaded dataframes
_cache = {}

# Repository-relative path to Analytics so it works on Windows locally and Linux/Render
BASE_DIR = Path(__file__).resolve().parent.parent.parent
ANALYTICS_DIR = BASE_DIR / "Analytics"

def load_dataset(name: str) -> pd.DataFrame:
    if name in _cache:
        return _cache[name]
    
    file_path = ANALYTICS_DIR / f"{name}.csv"
    if file_path.exists():
        df = pd.read_csv(file_path)
        _cache[name] = df
        return df
    
    raise ValueError(f"Dataset {name} not found. Expected file at: {file_path}. Ensure the Analytics directory is present.")

def get_mandi_summary() -> pd.DataFrame:
    return load_dataset("mandi_summary")
