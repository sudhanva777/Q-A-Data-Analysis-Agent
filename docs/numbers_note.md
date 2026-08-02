# How Numbers Are Computed (Anti-Hallucination Architecture)

This document explains the technical architecture, safety boundaries, and correctness design of the CSV / Data Q&A Agent.

---

## 1. Two-Call LLM Isolation Architecture

Large Language Models (LLMs) are statistical text generators; they are notoriously unreliable at mental math, table aggregations, and numerical calculations. To eliminate numeric hallucinations entirely, this system enforces a strict **Two-Call Isolation Architecture**:

```
User Question ──▶ [Groq Call #1: Code Generator] ──▶ [Sandbox Executor] ──▶ [Groq Call #2: Answer Composer] ──▶ Final Answer
                       (Schema context only)            (Real pandas math)            (Narrates computed result)
```

1. **Groq Call #1 (Code Generation)**:
   - Receives **only** the dataset schema summary (column names, dtypes, null counts, and a 3-row sample) along with the user's question.
   - **Never sees raw data values** and is forbidden from generating numeric answers directly.
   - Outputs a structured JSON object containing executable pandas Python code and a `needs_chart` flag.

2. **Sandbox Execution (Real Math)**:
   - The generated Python code is validated statically via Python's `ast` module in `src/sandbox.py`.
   - The code is executed in a restricted namespace against the real dataset DataFrame loaded in memory from `src/data_loader.py`.
   - All arithmetic, grouping, filtering, and aggregation is performed by pandas. The LLM does not calculate numbers directly.

3. **Groq Call #2 (Answer Composition)**:
   - Receives the user's question and the **exact, already-computed result** from pandas.
   - `src/answer_composer.py` formats the computed result and sends it to Groq with a prompt that forbids invented values.
   - The final answer is phrased in plain English using only the provided result values.

---

## 2. Agentic Sandbox Hardening & Security

Code execution inside Python `exec()` is restricted to ensure safe local execution:

- **AST Static Analysis**: Prior to execution, code is parsed into an Abstract Syntax Tree (`ast`). The validator blocks:
  - Import statements (`Import`, `ImportFrom`).
  - File / system I/O functions (`open`, `eval`, `exec`, `compile`, `__import__`).
  - Reflection functions (`globals`, `locals`, `getattr`, `setattr`, `vars`).
  - Walrus operators (`:=`).
  - Dunder attribute access (`__class__`, `__dict__`, `__globals__`).
- **Restricted builtins**: only a minimal safe builtin set is exposed (`len`, `round`, `sorted`, `sum`, `min`, `max`, `str`, `int`, `float`, `list`, `dict`, `range`, `abs`, and a few exception classes).
- **Execution Watchdog Timeout**: `exec()` is wrapped in a 10-second thread watchdog. If generated code exceeds the time limit, the system returns a clear timeout error instead of hanging.
- **Result Row Capping**: DataFrames or Series returned by execution exceeding 1,000 rows are automatically truncated to `.head(1000)` to protect memory and UI rendering.

---

## 3. Date Column Handling

Many raw datasets store dates as strings rather than datetime types.

- **The issue**: string dates sort lexicographically, producing incorrect chronological order.
- `src/data_loader.py` detects date-like columns stored as text and flags them in the schema summary sent to the model.
- `src/prompts.py` instructs the code generator to convert date text to `pd.to_datetime(...)` before grouping, sorting, or plotting.

---

## 4. Chart Storage and History Traceability

- The generated code saves charts to `outputs/chart.png` when a chart is requested.
- `src/agent.py` renames the saved chart to a unique file such as `outputs/chart_<uuid8>.png` after successful execution.
- This preserves one chart per interaction and prevents history entries from being overwritten.
- `src/analysis_service.py` exposes saved charts via the backend static `/outputs` mount.

---

## 5. Dataset Loading and Encoding Fallback

- CSV input is loaded with UTF-8 by default.
- On a `UnicodeDecodeError`, the loader falls back to `latin-1` automatically.
- Excel files are supported via `pd.read_excel(...)`.
- This ensures robust dataset ingestion for common regional export formats.

---

## 6. Current runtime ports

- Backend API: `http://localhost:8000`
- Frontend dev server: `http://localhost:5174`
- The Windows launcher `run.bat` is configured to start both processes with these ports.
