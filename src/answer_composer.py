import pandas as pd

from src.config import client, MODEL_NAME
from src.prompts import ANSWER_SYSTEM_PROMPT


def compose_answer(question: str, plan: dict, exec_result: dict) -> str:
    """Call Groq to compose a natural-language answer grounded on the real computed result."""
    result = exec_result["result"]

    # Format the result as text, capping large tables to prevent token limit errors
    if isinstance(result, (pd.DataFrame, pd.Series)):
        if len(result) > 50:
            result_sample = result.head(50)
            result_text = (
                result_sample.to_markdown()
                + f"\n\n... (table truncated to first 50 rows of {len(result)} total rows)"
            )
        else:
            result_text = (
                result.to_markdown(index=True)
                if isinstance(result, pd.DataFrame)
                else result.to_markdown()
            )
    else:
        result_text = str(result)

    user_message = (
        f"Question: {question}\n\n"
        f"Reasoning: {plan['reasoning']}\n\n"
        f"Computed result:\n{result_text}"
    )

    response = client.chat.completions.create(
        model=MODEL_NAME,
        messages=[
            {"role": "system", "content": ANSWER_SYSTEM_PROMPT},
            {"role": "user", "content": user_message},
        ],
        temperature=0,
    )

    return response.choices[0].message.content
