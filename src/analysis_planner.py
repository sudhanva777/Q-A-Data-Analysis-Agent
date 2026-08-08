import json
import os
from typing import Any, Dict
import pandas as pd

from src.config import client, MODEL_NAME

PLANNER_SYSTEM_PROMPT = """You are a senior data analysis planner. Analyze the user's question against the dataset schema and return an explicit structured execution plan.

Plan elements to identify:
1. intent: High-level purpose (e.g., aggregation, comparison, trend, filtering, correlation, distribution).
2. relevant_columns: List of specific column names needed.
3. need_cleaning: Boolean (true if text casing/whitespace/date parsing is needed before analysis).
4. need_aggregation: Boolean (true if groupby/sum/mean/count is required).
5. need_statistical_analysis: Boolean (true if correlation, std, median, percentiles required).
6. need_visualization: Boolean (true if chart should be plotted).
7. chart_type_recommendation: String (bar, line, scatter, pie, box, or none).
8. plan_summary: A 1-2 sentence step-by-step technical plan for generating pandas code.

Respond ONLY with a JSON object in this format:
{
  "intent": "...",
  "relevant_columns": ["col1", "col2"],
  "need_cleaning": false,
  "need_aggregation": true,
  "need_statistical_analysis": false,
  "need_visualization": true,
  "chart_type_recommendation": "bar",
  "plan_summary": "Group by col1, calculate sum of col2, and plot a bar chart."
}"""


def is_planner_enabled() -> bool:
    """Check if the analysis planner feature flag is active."""
    val = os.environ.get("ENABLE_PLANNER", "false").lower()
    return val in ("1", "true", "yes")


def create_analysis_plan(question: str, schema_summary: str, df: pd.DataFrame) -> Dict[str, Any]:
    """Decompose user question into a structured execution plan."""
    if not is_planner_enabled():
        return {
            "enabled": False,
            "intent": "direct_execution",
            "plan_summary": "Direct query execution without pre-planning.",
        }

    try:
        user_msg = f"Dataset Summary:\n{schema_summary[:2000]}\n\nUser Question: {question}"
        response = client.chat.completions.create(
            model=MODEL_NAME,
            messages=[
                {"role": "system", "content": PLANNER_SYSTEM_PROMPT},
                {"role": "user", "content": user_msg},
            ],
            response_format={"type": "json_object"},
            temperature=0,
        )
        plan_json = json.loads(response.choices[0].message.content)
        plan_json["enabled"] = True
        return plan_json
    except Exception as exc:
        # Fallback gracefully if planning LLM call fails
        return {
            "enabled": False,
            "intent": "direct_execution",
            "plan_summary": f"Fallback plan due to planner error: {exc}",
        }
