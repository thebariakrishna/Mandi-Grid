import json
from pathlib import Path

import pandas as pd

from utils.file_utils import RAW_DIR, QUALITY_DIR


def profile_dataframe(df: pd.DataFrame, dataset_name: str) -> dict:
    """Generate a basic data-quality profile for a DataFrame."""

    profile = {
        "dataset": dataset_name,
        "rows": int(df.shape[0]),
        "columns": int(df.shape[1]),
        "column_names": df.columns.tolist(),
        "duplicate_rows": int(df.duplicated().sum()),
        "columns_info": {}
    }

    for column in df.columns:
        series = df[column]

        info = {
            "dtype": str(series.dtype),
            "missing_count": int(series.isna().sum()),
            "missing_percentage": round(
                float(series.isna().mean() * 100), 2
            ),
            "unique_count": int(series.nunique(dropna=True)),
        }

        if pd.api.types.is_numeric_dtype(series):
            info["min"] = (
                float(series.min())
                if not series.dropna().empty
                else None
            )
            info["max"] = (
                float(series.max())
                if not series.dropna().empty
                else None
            )
            info["mean"] = (
                float(series.mean())
                if not series.dropna().empty
                else None
            )
            info["median"] = (
                float(series.median())
                if not series.dropna().empty
                else None
            )

        else:
            value_counts = (
                series
                .value_counts(dropna=False)
                .head(15)
                .to_dict()
            )

            info["top_values"] = {
                str(key): int(value)
                for key, value in value_counts.items()
            }

        profile["columns_info"][column] = info

    return profile


def profile_csv(filename: str) -> dict:
    """Profile a CSV dataset."""
    path = RAW_DIR / filename

    df = pd.read_csv(path)

    return profile_dataframe(df, filename)


def profile_json(filename: str) -> dict:
    """Profile a JSON dataset."""
    path = RAW_DIR / filename

    df = pd.read_json(path)

    return profile_dataframe(df, filename)


def profile_excel(filename: str) -> dict:
    """Profile the first sheet of an Excel dataset."""
    path = RAW_DIR / filename

    df = pd.read_excel(path)

    return profile_dataframe(df, filename)


def main():
    """Profile all project datasets."""

    reports = []

    reports.append(
        profile_csv("track3_mandi_arrivals.csv")
    )

    reports.append(
        profile_csv("track3_mandi_master.csv")
    )

    reports.append(
        profile_json("track3_price_and_msp.json")
    )

    reports.append(
        profile_csv("track3_transport_logistics.csv")
    )

    reports.append(
        profile_excel("track3_weather_sensors.xlsx")
    )

    output_path = QUALITY_DIR / "profiling_report.json"

    QUALITY_DIR.mkdir(parents=True, exist_ok=True)

    with open(output_path, "w", encoding="utf-8") as file:
        json.dump(
            reports,
            file,
            indent=2,
            ensure_ascii=False
        )

    print(f"Profiling complete.")
    print(f"Report saved to: {output_path}")


if __name__ == "__main__":
    main()