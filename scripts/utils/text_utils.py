import re
import pandas as pd
from utils.file_utils import PROCESSED_DIR

def normalize_text(value):
    """
    Normalize basic text formatting.

    Does not perform business-specific mappings such as
    Ganna -> Sugarcane.
    """
    if pd.isna(value):
        return pd.NA

    value = str(value).strip()
    value = re.sub(r"\s+", " ", value)

    return value

crop_mapping = {
    # Sugarcane
    "ganna": "Sugarcane",
    "ganne": "Sugarcane",
    "गन्ना": "Sugarcane",
    "sugarcane": "Sugarcane",

    # Mustard
    "sarson": "Mustard",
    "sarso": "Mustard",
    "सरसों": "Mustard",
    "mustard": "Mustard",

    # Cotton
    "kapas": "Cotton",
    "कपास": "Cotton",
    "cotton": "Cotton",

    # Maize
    "makka": "Maize",
    "मक्का": "Maize",
    "maize": "Maize",
    "corn": "Maize",
    "makki": "Maize",

    # Wheat
    "wheat": "Wheat",
    "गेहूं": "Wheat",
    "गेहूँ": "Wheat",
    "gehun": "Wheat",
    "kanak": "Wheat",

    # Rice
    "rice": "Rice",
    "chawal": "Rice",
    "paddy": "Rice",
    "चावल": "Rice",
    "धान": "Rice",
    "dhaan": "Rice",
}

def normalize_crop(value):
    """
    Convert known crop aliases into canonical English names.

    Unknown crop values are preserved rather than invented.
    """
    value = normalize_text(value)
    if pd.isna(value):
        return pd.NA

    lookup_value = str(value).lower()
    return crop_mapping.get(lookup_value, value)

_VALID_MANDI_IDS = None

def get_valid_mandi_ids():
    global _VALID_MANDI_IDS
    if _VALID_MANDI_IDS is not None:
        return _VALID_MANDI_IDS

    master_file = PROCESSED_DIR / "clean_mandi_master.csv"
    if master_file.exists():
        df = pd.read_csv(master_file)
        _VALID_MANDI_IDS = set(df["mandi_id"].dropna())
    else:
        # Fallback if master not yet processed
        _VALID_MANDI_IDS = set(f"MANDI{str(i).zfill(3)}" for i in range(1, 58))
    
    return _VALID_MANDI_IDS

def normalize_mandi_id(value):
    """
    Convert all supported mandi ID formats into canonical.
    Returns pd.NA if the ID cannot be deterministically mapped 
    to a valid Mandi Master ID.
    """
    if pd.isna(value):
        return pd.NA

    value = str(value).strip().upper()
    clean_val = value.replace("-", "").replace("_", "").replace(" ", "")

    candidate = None
    if clean_val.startswith("MANDI"):
        num = clean_val.replace("MANDI", "", 1)
        if num.isdigit():
            candidate = f"MANDI{num.zfill(3)}"
    elif clean_val.startswith("SEN"):
        num = clean_val.replace("SEN", "", 1)
        if num.isdigit():
            candidate = f"MANDI{num.zfill(3)}"
    elif clean_val.startswith("M"):
        num = clean_val[1:]
        if num.isdigit():
            candidate = f"MANDI{num.zfill(3)}"
    elif clean_val.isdigit():
        candidate = f"MANDI{clean_val.zfill(3)}"

    if candidate and candidate in get_valid_mandi_ids():
        return candidate

    return pd.NA