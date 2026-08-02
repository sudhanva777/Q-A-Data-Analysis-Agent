import argparse
import os
import time
import pandas as pd

from src import agent, db
from src.data_loader import build_schema_summary, load_dataset

# Ensure outputs directory exists for chart saves
os.makedirs("outputs", exist_ok=True)


def run_and_log_question(question: str, df: pd.DataFrame, schema_summary: str, dataset_name: str):
    """Execute question via agent pipeline and print structured 3-part answer + log to SQLite."""
    start_time = time.perf_counter()
    try:
        out = agent.answer_question(question, df, schema_summary)
        latency_ms = (time.perf_counter() - start_time) * 1000

        print("\nAnswer:")
        print(out['answer'])
        print("\nSupporting data:")
        res = out['result']
        if isinstance(res, pd.DataFrame):
            print(res.to_markdown(index=False))
        elif isinstance(res, pd.Series):
            print(res.to_markdown())
        else:
            print(str(res))

        if out["chart_path"]:
            print("\nChart:")
            print(f"[Saved visualization]: {out['chart_path']}")

        print(f"\n[code executed]: {out['code']}")

        db.log_interaction(
            dataset_name=dataset_name,
            question=question,
            generated_code=out["code"],
            result_summary=str(out["raw_result"]),
            chart_path=out.get("chart_path"),
            answer=out["answer"],
            status="success",
            error_message=None,
            latency_ms=latency_ms,
        )
    except Exception as e:
        latency_ms = (time.perf_counter() - start_time) * 1000
        print(f"\n[ERROR] Couldn't answer that: {e}")
        db.log_interaction(
            dataset_name=dataset_name,
            question=question,
            generated_code=None,
            result_summary=None,
            chart_path=None,
            answer=None,
            status="error",
            error_message=str(e),
            latency_ms=latency_ms,
        )


def main():
    parser = argparse.ArgumentParser(description="CSV / Data Q&A Agent")
    parser.add_argument(
        "--file", required=True, help="Path to a CSV or Excel file"
    )
    parser.add_argument(
        "--question", default=None, help="Single question (non-interactive mode)"
    )
    args = parser.parse_args()

    df = load_dataset(args.file)
    schema_summary = build_schema_summary(df)
    dataset_name = os.path.basename(args.file)

    # Single-shot mode
    if args.question:
        run_and_log_question(args.question, df, schema_summary, dataset_name)
        return

    # REPL mode
    path = args.file
    print(f"Loaded {path} — {len(df)} rows, {len(df.columns)} columns.")
    print("Ask a question about your data (or 'quit' to exit).\n")
    while True:
        try:
            q = input("> ").strip()
        except (EOFError, KeyboardInterrupt):
            print()
            break
        if q.lower() in ("quit", "exit"):
            break
        if not q:
            continue
        run_and_log_question(q, df, schema_summary, dataset_name)
        print()


if __name__ == "__main__":
    main()
