import os
import uuid
import pandas as pd

from src.code_generator import generate_code
from src.sandbox import validate_code, run_code
from src.answer_composer import compose_answer

MAX_QUESTION_LENGTH = 2000


def wrap_scalar_as_table(result):
    """Ensure result is always a pandas DataFrame or Series for guaranteed tabular rendering."""
    if isinstance(result, (pd.DataFrame, pd.Series)):
        return result
    if result is None:
        return pd.DataFrame({"Result": ["None"]})
    return pd.DataFrame({"Computed Value": [result]})


def answer_question(question: str, df: pd.DataFrame, schema_summary: str) -> dict:
    """Orchestrate the full pipeline with input validation, code generation, execution, and composition."""
    if len(question) > MAX_QUESTION_LENGTH:
        raise ValueError(
            f"Question length ({len(question)} chars) exceeds maximum limit of {MAX_QUESTION_LENGTH} characters."
        )

    plan = generate_code(question, schema_summary)
    validate_code(plan["code"])

    exec_result = run_code(plan["code"], df)

    # If execution errored, try one self-correction retry
    if exec_result.get("error"):
        plan = generate_code(question, schema_summary, retry_error=exec_result["error"])
        validate_code(plan["code"])
        exec_result = run_code(plan["code"], df)
        if exec_result.get("error"):
            raise RuntimeError(
                f"Code failed after retry: {exec_result['error']}"
            )

    # Rename generated chart to unique filename if present to prevent log overwrites
    chart_path = exec_result.get("chart_path")
    if chart_path and os.path.exists(chart_path):
        unique_id = uuid.uuid4().hex[:8]
        ext = os.path.splitext(chart_path)[1] or ".png"
        new_chart_path = os.path.join(os.path.dirname(chart_path), f"chart_{unique_id}{ext}")
        os.rename(chart_path, new_chart_path)
        chart_path = new_chart_path
        exec_result["chart_path"] = new_chart_path

    final_answer = compose_answer(question, plan, exec_result)
    tabular_result = wrap_scalar_as_table(exec_result["result"])

    return {
        "answer": final_answer,
        "code": plan["code"],
        "result": tabular_result,
        "raw_result": exec_result["result"],
        "chart_path": chart_path,
    }
