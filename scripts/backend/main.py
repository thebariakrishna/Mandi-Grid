from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, Dict, Any

from models.schemas import AskRequest, AskResponse
from ai.intent import process_question

import logging

app = FastAPI(title="MandiGrid AI Backend")

# Allow React frontend to connect
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/api/ask", response_model=AskResponse)
def ask_endpoint(request: AskRequest):
    try:
        print("[ASK] request received")
        print(f"[ASK] question = {request.question}")
        response = process_question(request.question, request.filters, request.history)
        print("[ASK] response returned")
        return response
    except Exception as e:
        logging.exception("Error processing question")
        raise HTTPException(status_code=500, detail=str(e))
