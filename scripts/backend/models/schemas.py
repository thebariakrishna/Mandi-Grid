from pydantic import BaseModel
from typing import Optional, Dict, Any, List

class Filters(BaseModel):
    state: Optional[str] = None
    crop: Optional[str] = None
    time_window: Optional[str] = None

class AskRequest(BaseModel):
    question: str
    filters: Optional[Filters] = None
    history: Optional[List[Dict[str, str]]] = None

class AskResponse(BaseModel):
    answer: str
    insights: Optional[List[str]] = None
    chart: Optional[Dict[str, Any]] = None
    data_source: Optional[str] = None
    filters_applied: Optional[Dict[str, Any]] = None

class QueryFilter(BaseModel):
    column: str
    operator: str
    value: Any

class StructuredAnalysisPlan(BaseModel):
    dataset: str
    operation: Optional[str] = None
    measure_columns: Optional[List[str]] = None
    group_by: Optional[List[str]] = None
    time_grain: Optional[str] = None
    filters: Optional[List[QueryFilter]] = None
    sort_by: Optional[str] = None
    sort_order: Optional[str] = None
    limit: Optional[int] = None
    visualization_required: Optional[bool] = False
    chart_type: Optional[str] = None
