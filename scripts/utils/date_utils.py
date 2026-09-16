import pandas as pd


def parse_datetime_series(series: pd.Series) -> pd.Series:
    """
    Convert a pandas Series into datetime values.

    Invalid values become missing rather than crashing the pipeline.
    """
    return pd.to_datetime(
        series,
        errors="coerce"
    )