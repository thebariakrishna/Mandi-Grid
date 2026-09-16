import re
from models.schemas import StructuredAnalysisPlan, QueryFilter

def get_fallback_intent(question: str) -> StructuredAnalysisPlan:
    """
    Deterministic offline fallback for common queries when Groq fails.
    """
    q_lower = question.lower().strip()
    
    # 1. Which crop has the highest total arrivals?
    if "crop" in q_lower and "highest" in q_lower and "arrival" in q_lower:
        return StructuredAnalysisPlan(
            dataset="crop_summary",
            operation="max",
            measure_columns=["total_arrival_qtl"],
            group_by=["crop_name"],
            visualization_required=False
        )
        
    # 2. Show the top 5 mandis by arrivals.
    if "top 5 mandis" in q_lower or ("biggest mandis" in q_lower):
        return StructuredAnalysisPlan(
            dataset="mandi_summary",
            operation="sum",
            measure_columns=["total_arrival_qtl"],
            group_by=["mandi_name"],
            sort_by="total_arrival_qtl",
            sort_order="desc",
            limit=5,
            visualization_required=("graph" in q_lower or "chart" in q_lower or "plot" in q_lower or "show" in q_lower),
            chart_type="bar" if "show" in q_lower or "chart" in q_lower else None
        )
        
    # 3. Which crops have the highest below-MSP rate?
    if "below-msp rate" in q_lower and "crop" in q_lower:
        return StructuredAnalysisPlan(
            dataset="price_msp_analysis",
            operation="max",
            measure_columns=["below_msp_count"],
            group_by=["crop_name"],
            visualization_required=False
        )

    # 4. Which warehouse has the highest delay rate?
    if "warehouse" in q_lower and "delay rate" in q_lower:
        return StructuredAnalysisPlan(
            dataset="transport_summary",
            operation="max",
            measure_columns=["transit_delay_rate_percent"],
            group_by=["destination_warehouse"],
            visualization_required=False
        )
        
    # 5. Show rainfall versus arrivals.
    if "rainfall versus arrival" in q_lower or "rainfall vs arrival" in q_lower:
        return StructuredAnalysisPlan(
            dataset="weather_arrival_analysis",
            operation="mean",
            measure_columns=["total_arrival_qtl", "avg_rainfall_mm"],
            group_by=["mandi_id"],
            visualization_required=True,
            chart_type="scatter"
        )
        
    # 6. Show rainfall patterns.
    if "rainfall pattern" in q_lower:
        return StructuredAnalysisPlan(
            dataset="weather_arrival_analysis",
            operation="mean",
            measure_columns=["avg_rainfall_mm"],
            group_by=["date"],
            visualization_required=True,
            chart_type="line"
        )
        
    # 7. Show Wheat arrivals over time.
    if "wheat arrival" in q_lower and "over time" in q_lower:
        return StructuredAnalysisPlan(
            dataset="daily_mandi_analytics",
            operation="sum",
            measure_columns=["total_arrival_qtl"],
            group_by=["date"],
            filters=[QueryFilter(column="crop_name", operator="==", value="Wheat")],
            visualization_required=True,
            chart_type="line"
        )
        
    # 8 & 9. Compare Wheat and Rice/Maize against MSP.
    if "compare" in q_lower and "against msp" in q_lower:
        crops = []
        if "wheat" in q_lower: crops.append("Wheat")
        if "rice" in q_lower: crops.append("Rice")
        if "maize" in q_lower: crops.append("Maize")
        
        return StructuredAnalysisPlan(
            dataset="price_msp_analysis",
            operation="price_vs_msp",
            measure_columns=["avg_modal_price", "avg_msp"],
            group_by=["crop_name"],
            filters=[QueryFilter(column="crop_name", operator="in", value=crops)] if crops else None,
            visualization_required=("graph" in q_lower or "chart" in q_lower or "plot" in q_lower),
            chart_type="bar" if ("graph" in q_lower or "chart" in q_lower or "plot" in q_lower) else None
        )
        
    # 10. What is the average transit time?
    if "average transit time" in q_lower:
        return StructuredAnalysisPlan(
            dataset="transport_summary",
            operation="mean",
            measure_columns=["avg_transit_hours"],
            group_by=["destination_warehouse"],
            visualization_required=False
        )
        
    # 11. What is the below-MSP rate?
    if "below-msp rate" in q_lower:
        return StructuredAnalysisPlan(
            dataset="price_msp_analysis",
            operation="below_msp_rate",
            measure_columns=["below_msp_count"],
            group_by=["crop_name"],
            visualization_required=False
        )
        
    # 12. Which mandi has the highest arrivals?
    if "mandi" in q_lower and "highest arrival" in q_lower:
        return StructuredAnalysisPlan(
            dataset="mandi_summary",
            operation="max",
            measure_columns=["total_arrival_qtl"],
            group_by=["mandi_name"],
            visualization_required=False
        )
        
    raise ValueError("Fallback intent could not confidently map this question.")
