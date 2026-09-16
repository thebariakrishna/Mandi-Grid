from typing import Dict, Any, List
import pandas as pd

def generate_chart_spec(kind: str, data: pd.DataFrame, x_col: str, y_col: str, x_label: str = "", y_label: str = "") -> Dict[str, Any]:
    if kind not in ["bar", "line", "scatter"]:
        return None
    
    if kind == "scatter":
        chart_data = []
        for _, row in data.iterrows():
            chart_data.append({"x": float(row[x_col]), "y": float(row[y_col])})
        return {
            "kind": "scatter",
            "data": chart_data,
            "xLabel": x_label or x_col,
            "yLabel": y_label or y_col
        }
    else:
        chart_data = []
        for _, row in data.iterrows():
            # For bar/line, x is label, y is value
            chart_data.append({"label": str(row[x_col]), "value": float(row[y_col])})
        return {
            "kind": kind,
            "data": chart_data
        }
