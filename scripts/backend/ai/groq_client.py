import os
import json
import re
from typing import Tuple, List
from groq import Groq
from ai.prompts import SYSTEM_PROMPT, INSIGHTS_PROMPT
from models.schemas import StructuredAnalysisPlan
from dotenv import load_dotenv
from pathlib import Path

env_path = Path(__file__).resolve().parent.parent / '.env'
load_dotenv(dotenv_path=env_path, override=True)

api_key = os.environ.get("GROQ_API_KEY")
if not api_key or api_key == "YOUR_KEY_HERE":
    raise RuntimeError("GROQ_API_KEY is missing or invalid in backend/.env")
    
client = Groq(api_key=api_key, max_retries=0)

def get_intent_from_groq(question: str, history: List[dict] = None) -> StructuredAnalysisPlan:
    messages = [{"role": "system", "content": SYSTEM_PROMPT}]
    
    if history:
        for msg in history:
            # ensure valid role mapping
            role = msg.get("role", "user")
            if role not in ["user", "assistant"]:
                role = "user"
            messages.append({"role": role, "content": msg.get("content", "")})
            
    messages.append({"role": "user", "content": question})
    
    try:
        completion = client.chat.completions.create(
            model="groq/compound-mini",
            messages=messages,
            temperature=0,
            response_format={"type": "json_object"}
        )
        response_text = completion.choices[0].message.content
        
        # Use regex to extract JSON object if the model wrapped it in markdown
        json_match = re.search(r'```(?:json)?\s*(\{.*?\})\s*```', response_text, re.DOTALL)
        if json_match:
            response_text = json_match.group(1)
        else:
            # Fallback to finding the first { and last }
            start = response_text.find('{')
            end = response_text.rfind('}')
            if start != -1 and end != -1:
                response_text = response_text[start:end+1]
            
        data = json.loads(response_text)
        return StructuredAnalysisPlan(**data)
    except Exception as e:
        print(f"Error parsing intent JSON: {e} | Raw response: {completion.choices[0].message.content if 'completion' in locals() else 'N/A'}")
        return StructuredAnalysisPlan(
            dataset="unsupported",
            operation="unsupported",
            visualization_required=False
        )

def get_insights_from_groq(question: str, data_csv: str) -> Tuple[str, List[str]]:
    prompt = f"User Question: {question}\n\nPandas Calculated Data (CSV):\n{data_csv}"
    
    try:
        completion = client.chat.completions.create(
            model="groq/compound-mini",
            messages=[
                {"role": "system", "content": INSIGHTS_PROMPT},
                {"role": "user", "content": prompt}
            ],
            temperature=0,
            response_format={"type": "json_object"}
        )
        
        response_text = completion.choices[0].message.content
        
        json_match = re.search(r'```(?:json)?\s*(\{.*?\})\s*```', response_text, re.DOTALL)
        if json_match:
            response_text = json_match.group(1)
        else:
            start = response_text.find('{')
            end = response_text.rfind('}')
            if start != -1 and end != -1:
                response_text = response_text[start:end+1]
                
        data = json.loads(response_text)
        return data.get("answer", "Analysis complete."), data.get("insights", [])
    except Exception as e:
        return f"Could not generate insights: {e}", []

def get_conversational_answer_from_groq(question: str, history: List[dict] = None) -> str:
    history = history or []
    
    messages = [
        {"role": "system", "content": "You are a helpful conversational AI assistant inside the MandiGrid agricultural analytics dashboard. The user asked a question that does not require querying our internal structured datasets. Please provide a normal, helpful text response. Do not invent any agricultural statistics."}
    ]
    messages.extend(history)
    messages.append({"role": "user", "content": question})
    
    client = Groq(api_key=os.getenv("GROQ_API_KEY"), max_retries=0)
    
    completion = client.chat.completions.create(
        model="groq/compound-mini",
        messages=messages,
        temperature=0.3
    )
    
    return completion.choices[0].message.content.strip()
