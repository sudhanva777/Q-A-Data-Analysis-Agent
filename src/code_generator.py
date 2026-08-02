import json

from src.config import client, MODEL_NAME
from src.prompts import CODE_GEN_SYSTEM_PROMPT


def generate_code(
    question: str, schema_summary: str, retry_error: str | None = None
) -> dict:
    """Call Groq to translate a natural-language question into pandas code.

    Returns a dict with keys: reasoning, code, needs_chart.
    """
    user_message = f"Dataset schema:\n{schema_summary}\n\nQuestion: {question}"

    if retry_error:
        user_message += (
            f"\n\nPrevious attempt errored with:\n{retry_error}\n"
            "Fix the root cause and try again."
        )

    response = client.chat.completions.create(
        model=MODEL_NAME,
        messages=[
            {"role": "system", "content": CODE_GEN_SYSTEM_PROMPT},
            {"role": "user", "content": user_message},
        ],
        response_format={"type": "json_object"},
        temperature=0,
    )

    raw = response.choices[0].message.content
    try:
        plan = json.loads(raw)
    except json.JSONDecodeError as e:
        raise ValueError(f"LLM returned invalid JSON: {e}\nRaw output: {raw}")

    for key in ("reasoning", "code", "needs_chart"):
        if key not in plan:
            raise ValueError(f"LLM response missing required key '{key}': {raw}")

    return plan
