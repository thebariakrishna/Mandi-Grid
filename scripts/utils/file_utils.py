from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[2]

RAW_DIR = PROJECT_ROOT / "data" / "raw"
PROCESSED_DIR = PROJECT_ROOT / "data" / "processed"
QUALITY_DIR = PROJECT_ROOT / "data" / "quality"


def get_raw_file(filename: str) -> Path:
    """Return the path to a file in the raw data directory."""
    return RAW_DIR / filename


def get_processed_file(filename: str) -> Path:
    """Return the path to a file in the processed data directory."""
    return PROCESSED_DIR / filename


def ensure_output_directories() -> None:
    """Create output directories if they do not exist."""
    PROCESSED_DIR.mkdir(parents=True, exist_ok=True)
    QUALITY_DIR.mkdir(parents=True, exist_ok=True)