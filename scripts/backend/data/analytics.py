import pandas as pd
from models.schemas import Filters, StructuredAnalysisPlan, QueryFilter
from data.loaders import load_dataset, get_mandi_summary

def apply_global_filters(df: pd.DataFrame, filters: Filters, dataset_name: str) -> pd.DataFrame:
    if not filters:
        return df

    filtered = df.copy()
    
    # 1. Crop Filter
    if filters.crop and filters.crop != "All":
        if "crop_name" in filtered.columns:
            filtered = filtered[filtered["crop_name"] == filters.crop]

    # 2. State Filter
    if filters.state and filters.state != "All":
        if "state" in filtered.columns:
            filtered = filtered[filtered["state"] == filters.state]
        elif "mandi_id" in filtered.columns:
            mandi_df = get_mandi_summary()
            state_mandis = mandi_df[mandi_df["state"] == filters.state]["mandi_id"].unique()
            filtered = filtered[filtered["mandi_id"].isin(state_mandis)]

    # 3. Time Window
    if filters.time_window and filters.time_window != "All":
        date_col = None
        if "date" in filtered.columns:
            date_col = "date"
        elif "departure_time" in filtered.columns:
            date_col = "departure_time"
            
        if date_col:
            filtered[date_col] = pd.to_datetime(filtered[date_col])
            max_date = pd.to_datetime("2026-12-08")
            if filters.time_window == "30d":
                cutoff = max_date - pd.Timedelta(days=30)
            elif filters.time_window == "90d":
                cutoff = max_date - pd.Timedelta(days=90)
            else:
                cutoff = None
                
            if cutoff:
                filtered = filtered[(filtered[date_col] <= max_date) & (filtered[date_col] >= cutoff)]

    return filtered

def apply_nlp_filters(df: pd.DataFrame, query_filters: list[QueryFilter]) -> pd.DataFrame:
    if not query_filters:
        return df
    
    filtered = df.copy()
    for f in query_filters:
        col = f.column
        if col not in filtered.columns:
            continue
            
        val = f.value
        op = f.operator.lower()
        
        try:
            if op == "eq":
                filtered = filtered[filtered[col] == val]
            elif op == "neq":
                filtered = filtered[filtered[col] != val]
            elif op == "gt":
                filtered = filtered[filtered[col] > val]
            elif op == "lt":
                filtered = filtered[filtered[col] < val]
            elif op == "gte":
                filtered = filtered[filtered[col] >= val]
            elif op == "lte":
                filtered = filtered[filtered[col] <= val]
            elif op == "in" and isinstance(val, list):
                filtered = filtered[filtered[col].isin(val)]
        except Exception:
            pass # ignore incompatible filters gracefully
            
    return filtered

def execute_intent(plan: StructuredAnalysisPlan, global_filters: Filters) -> tuple[pd.DataFrame, str]:
    if plan.dataset == "unsupported" or not plan.dataset:
        raise ValueError("Unsupported or unknown dataset.")

    df = load_dataset(plan.dataset)
    df = apply_global_filters(df, global_filters, plan.dataset)
    df = apply_nlp_filters(df, plan.filters)
    
    if df.empty:
        raise ValueError("The available MandiGrid data does not contain enough information to calculate that.")

    result_df = df.copy()
    op = plan.operation.lower()
    
    # --- Special Domain Operations ---
    if op == "below_msp_rate" and "records_count" in result_df.columns and "below_msp_count" in result_df.columns:
        group_cols = plan.group_by if plan.group_by else []
        if group_cols:
            agg_df = result_df.groupby(group_cols)[["below_msp_count", "records_count"]].sum().reset_index()
            agg_df["below_msp_rate_pct"] = (agg_df["below_msp_count"] / agg_df["records_count"]) * 100
            result_df = agg_df
        else:
            total_below = result_df["below_msp_count"].sum()
            total_records = result_df["records_count"].sum()
            rate = (total_below / total_records) * 100 if total_records > 0 else 0
            result_df = pd.DataFrame([{"below_msp_rate_pct": rate}])
            
    elif op == "price_vs_msp" and "avg_modal_price" in result_df.columns and "avg_msp" in result_df.columns:
        group_cols = plan.group_by if plan.group_by else []
        if group_cols:
            # We average the prices over the group
            result_df = result_df.groupby(group_cols)[["avg_modal_price", "avg_msp"]].mean().reset_index()
        else:
            avg_price = result_df["avg_modal_price"].mean()
            avg_msp = result_df["avg_msp"].mean()
            result_df = pd.DataFrame([{"avg_modal_price": avg_price, "avg_msp": avg_msp}])
            
    # --- Generic Aggregation Operations ---
    elif op in ["sum", "mean", "median", "min", "max", "count", "nunique"]:
        measure_cols = plan.measure_columns if plan.measure_columns else []
        valid_measures = [c for c in measure_cols if c in result_df.columns]
        
        group_cols = plan.group_by if plan.group_by else []
        valid_groups = [c for c in group_cols if c in result_df.columns]
        
        if valid_groups and valid_measures:
            if op == "sum":
                result_df = result_df.groupby(valid_groups)[valid_measures].sum().reset_index()
            elif op == "mean":
                result_df = result_df.groupby(valid_groups)[valid_measures].mean().reset_index()
            elif op == "median":
                result_df = result_df.groupby(valid_groups)[valid_measures].median().reset_index()
            elif op == "min":
                result_df = result_df.groupby(valid_groups)[valid_measures].min().reset_index()
            elif op == "max":
                result_df = result_df.groupby(valid_groups)[valid_measures].max().reset_index()
            elif op == "count":
                result_df = result_df.groupby(valid_groups)[valid_measures].count().reset_index()
            elif op == "nunique":
                result_df = result_df.groupby(valid_groups)[valid_measures].nunique().reset_index()
        elif valid_measures:
            # Global aggregation
            if op == "sum":
                result_df = pd.DataFrame([result_df[valid_measures].sum().to_dict()])
            elif op == "mean":
                result_df = pd.DataFrame([result_df[valid_measures].mean().to_dict()])
            elif op == "median":
                result_df = pd.DataFrame([result_df[valid_measures].median().to_dict()])
            elif op == "min":
                result_df = pd.DataFrame([result_df[valid_measures].min().to_dict()])
            elif op == "max":
                result_df = pd.DataFrame([result_df[valid_measures].max().to_dict()])
            elif op == "count":
                result_df = pd.DataFrame([result_df[valid_measures].count().to_dict()])
            elif op == "nunique":
                result_df = pd.DataFrame([result_df[valid_measures].nunique().to_dict()])

    # --- Sorting ---
    if plan.sort_by and plan.sort_by in result_df.columns:
        ascending = plan.sort_order == "asc"
        result_df = result_df.sort_values(by=plan.sort_by, ascending=ascending)

    # --- Limits ---
    if plan.limit and plan.limit > 0:
        result_df = result_df.head(plan.limit)

    return result_df, plan.dataset
