import pytest
from fastapi.testclient import TestClient
from main import app
from unittest.mock import patch
from models.schemas import StructuredAnalysisPlan

client = TestClient(app)

@patch("ai.intent.get_intent_from_groq")
@patch("ai.intent.get_conversational_answer_from_groq")
def test_unrelated_query(mock_conversational, mock_groq):
    mock_groq.return_value = StructuredAnalysisPlan(
        dataset="unsupported", 
        operation="unsupported", 
        visualization_required=False
    )
    mock_conversational.return_value = "London is usually rainy this time of year."
    response = client.post("/api/ask", json={
        "question": "What is the weather in London?",
        "filters": {"state": None, "crop": None, "time_window": None}
    })
    assert response.status_code == 200
    data = response.json()
    assert "London is usually rainy" in data["answer"]

@patch("ai.intent.get_intent_from_groq")
@patch("ai.groq_client.get_insights_from_groq")
def test_highest_arrivals(mock_insights, mock_groq):
    mock_groq.return_value = StructuredAnalysisPlan(
        dataset="crop_summary",
        operation="ranking",
        measure_columns=["total_arrival_qtl"],
        group_by=["crop_name"],
        sort_by="total_arrival_qtl",
        sort_order="desc",
        limit=1,
        visualization_required=True,
        chart_type="bar"
    )
    mock_insights.return_value = ("The highest value is Wheat.", ["Wheat dominates", "Rice is second"])
    
    response = client.post("/api/ask", json={
        "question": "Which crop has the highest total arrivals?",
        "filters": {"state": None, "crop": None, "time_window": None}
    })
    assert response.status_code == 200
    data = response.json()
    assert "The highest value is Wheat." in data["answer"]
    assert len(data["insights"]) == 2
    assert data["chart"] is not None
    assert data["chart"]["kind"] in ["bar", "pie"]

if __name__ == "__main__":
    pytest.main(["-v", "test_app.py"])
