import pandas as pd


def count_missing(df: pd.DataFrame) -> pd.Series:
    """Return missing-value counts for every column."""
    return df.isna().sum()


def count_duplicates(df: pd.DataFrame) -> int:
    """Return the number of exact duplicate rows."""
    return int(df.duplicated().sum())


def find_invalid_positive_values(
    df: pd.DataFrame,
    column: str
) -> pd.DataFrame:
    """Return rows where a numeric column is zero or negative."""
    return df[df[column] <= 0].copy()