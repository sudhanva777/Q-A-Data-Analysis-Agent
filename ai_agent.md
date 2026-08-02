# CSV / Data Q&A Agent — Build Blueprint

> **Purpose of this document:** This is a current engineering spec and project overview for the Q&A Data Analysis Agent repository. It describes the actual architecture, repo layout, and runtime behavior for the FastAPI backend plus React frontend application.

---

## 1. Core Job Definition

This app takes a tabular dataset (CSV or Excel) and a plain-English question, then returns a factually grounded answer computed directly from the dataset via pandas. The answer is accompanied by supporting output: tables, charts, generated code, and execution metadata.

**Current scope:**
- FastAPI backend exposing dataset upload, question answering, history, and dataset inspection
- React + Vite frontend for dataset selection, chat-style question entry, and result display
- Real pandas execution inside a sandboxed environment for correctness
- SQLite logging of interaction history and chart assets

**Non-goals:**
- No multi-table joins or relational database queries across datasets
- No persistent conversational memory beyond history logs
- No arbitrary remote code execution
- No open-ended chat unrelated to the selected dataset

---

## 2. Architecture Overview

```
User Question ──▶ React Frontend (Dashboard.jsx) ──▶ FastAPI /api/query ──▶ src/analysis_service.py
                                                            └───▶ src/agent.py ──▶ src/code_generator.py (Groq #1)
                                                                          └───▶ src/sandbox.py (safe pandas execution)
                                                                                        └───▶ src/answer_composer.py (Groq #2)
                                                                                            └───▶ Response to frontend
```

### Data flow
1. Frontend submits `{ dataset_id, question }` to `/api/query`.
2. Backend loads the dataset from `data/` and builds a schema summary.
3. `src/code_generator.py` calls Groq to generate executable pandas code.
4. `src/sandbox.py` validates and executes the code safely against the real DataFrame.
5. `src/answer_composer.py` calls Groq again to turn the computed result into natural language.
6. Backend returns answer text, table payload, chart URL, generated code, and latency.

---

## 3. Repo Structure

```
e-ai_agent/
├── README.md
├── ai_agent.md
├── requirements.txt
├── run.bat
├── .env.example
├── api.py
├── data/
│   └── sales_data.csv
├── docs/
│   ├── frontend.md
│   ├── numbers_note.md
│   └── sample_questions.md
├── frontend/
│   ├── README.md
│   ├── package.json
│   ├── vite.config.js
│   └── src/
├── outputs/
├── logs/
├── src/
│   ├── __init__.py
│   ├── agent.py
│   ├── analysis_service.py
│   ├── answer_composer.py
│   ├── code_generator.py
│   ├── config.py
│   ├── data_loader.py
│   ├── db.py
│   ├── prompts.py
│   └── sandbox.py
└── tests/
    ├── test_api_e2e.py
    ├── test_sandbox.py
    └── test_analysis_service.py
```

---

## 4. Runtime Overview

- Backend: `uvicorn api:app --host 0.0.0.0 --port 8000`
- Frontend: `cd frontend && npm run dev -- --host 0.0.0.0 --port 5174`
- Windows launcher: `run.bat`

### Available API endpoints
- `GET /api/health`
- `GET /api/datasets`
- `GET /api/datasets/{dataset_id}`
- `POST /api/upload`
- `POST /api/query`
- `GET /api/history`

---

## 5. Key Implementation Notes

### Sandbox safety
- Static AST validation prevents imports, system I/O, reflection, walrus assignments, and dunder access.
- Code executes with a minimal safe builtin set, plus `pd`, `np`, and `plt`.
- Execution is bounded by a 10-second watchdog thread.
- Charts are saved to `outputs/chart.png` and renamed to unique files before returning results.

### Frontend alignment
- The React UI fetches datasets and history from the backend.
- The chat workspace shows answers with tabs for summary, table, chart, code, and logs.
- History replay maintains trust by preserving dataset availability checks.

### Anti-hallucination design
- Groq #1 generates code only, never a final numeric answer.
- The Python sandbox computes actual values using pandas.
- Groq #2 composes a natural-language answer using the computed result as ground truth.

---

## 6. Verification

Run the backend tests:

```bash
python -m unittest tests.test_api_e2e tests.test_sandbox tests.test_analysis_service
```

Build the frontend:

```bash
cd frontend
npm run build
```

---

## 7. Notes

- The current frontend port is `5174`.
- The backend serves chart assets from `/outputs`.
- The repo is designed to separate UI concerns from backend execution and correctness validation.

   and briefly say so in "reasoning" — do not ask a follow-up question.
8. If a previous attempt errored, you will be shown the error message. Fix the root
   cause; do not repeat the same mistake.

Respond with ONLY a JSON object in this exact shape, no prose outside the JSON:
{
  "reasoning": "<one sentence: what you are computing and why>",
  "code": "<the pandas code as a single string, using \\n for newlines>",
  "needs_chart": <true or false>
}
```

### `ANSWER_SYSTEM_PROMPT`
```
You are a precise data analyst reporting results. You will be given a user's
question and the EXACT, ALREADY-COMPUTED result from running real code against
their dataset. You did not compute this number yourself — it was computed by
pandas, not by you.

RULES:
1. Answer using ONLY the numbers/values given to you in "computed_result". Do not
   estimate, round differently than shown, or introduce any figure not present in
   the provided result.
2. Never say "approximately" or hedge on a number that was explicitly computed —
   state it plainly and confidently.
3. If the computed result is a table (multiple rows), summarize the key
   finding in one sentence, then note that the full table is shown separately —
   do not retype the entire table into prose.
4. Keep the answer to 2–4 sentences. No preamble like "Based on the data...".
5. If the computed result looks empty, null, or clearly wrong, say so plainly
   instead of fabricating an answer.

Output plain text only. No JSON, no markdown headers.
```

---

## 7. `docs/numbers_note.md` — Anti-Hallucination Design Note (deliverable — write this after building)

This file must explain, in plain terms, why the agent's numbers can be trusted. Cover these points (this is a **required deliverable** — draft it for real once the agent is built and tested):

1. **The LLM never does arithmetic.** All numeric computation happens in `sandbox.py` via real pandas execution against the real, complete DataFrame — not a summary or a sample.
2. **Two-call separation of concerns.** Call #1 (code generation) never sees the actual data values beyond the schema summary — it can't hallucinate a number because it isn't asked to produce one. Call #2 (answer composition) is handed the real computed result as text and is instructed to cite it, not invent it.
3. **Static validation before execution.** Every generated snippet is AST-checked before running, so even a malformed or unsafe generation can't silently do something other than compute over `df`.
4. **Self-correction, not silent failure.** If generated code throws a runtime error (bad column name, type mismatch), the error is fed back to the LLM once for a corrected attempt, rather than the agent guessing an answer.
5. **Traceability.** Every answer is printed alongside the exact code that produced it, so any number can be manually verified by re-running that one line against the CSV.
6. **Known limitation to disclose honestly:** if the LLM's *interpretation* of an ambiguous question is wrong (e.g., "last quarter" when the data has no date column), the arithmetic will still be correct — but for the wrong sub-question. This is a comprehension risk, not a hallucination risk, and should be called out in the README tradeoffs section.

---

## 8. Dataset Requirements (for you to source from Kaggle — not generated here)

Pick a dataset that supports genuinely interesting aggregation questions. Good fit criteria:
- At least one categorical/grouping column (e.g., region, category, department, product)
- At least one date/time column (to support "last quarter", "year-over-year", "trend" style questions)
- At least one or two numeric metric columns (revenue, sales, units, price)
- A few hundred to a few thousand rows — enough to make groupby/aggregation meaningful, small enough to keep the schema summary cheap

Reasonable Kaggle search terms: "regional sales dataset", "superstore sales dataset", "retail sales by category", "e-commerce sales dataset". Save the chosen file as `data/sample_dataset.csv` (or `.xlsx`).

---

## 9. `docs/sample_questions.md` — 8–10 Q&A Deliverable (produce after the agent runs)

Once the agent is functional, run it against your real dataset with `--question` single-shot mode and capture the transcript in this format for each of 8–10 questions:

```markdown
### Q: Which region had the highest total revenue?
**Answer:** ...
**Computation:** `result = df.groupby('region')['revenue'].sum().sort_values(ascending=False)`
**Result table:**
| region | revenue |
|---|---|
| ... | ... |
```

Aim for a mix of question types to demonstrate "smart NLP logic" breadth:
1. A simple aggregation ("total X")
2. A "which/top" ranking question
3. A trend/comparison-over-time question ("did X grow from Q1 to Q2")
4. A filter + aggregate question ("average X for category Y")
5. A question requiring a computed ratio/percentage
6. A chart-request question ("show me a bar chart of X by Y")
7. An edge-case question with an ambiguous or missing column, to demonstrate graceful failure
8. A multi-condition filter question
9. A "how many / count" question
10. A min/max outlier question ("which single row has the lowest X")

---

## 10. `README.md` Structure (write last, this is a scored deliverable — 15 pts)

```markdown
# CSV / Data Q&A Agent

One-paragraph description + the core job statement from Section 1.

## Setup
1. `pip install -r requirements.txt`
2. `cp .env.example .env` and add your `GROQ_API_KEY`
3. Place your dataset in `data/`

## Usage
- REPL: `python main.py --file data/sample_dataset.csv`
- Single question: `python main.py --file data/sample_dataset.csv --question "..."`

## How it works
Short version of the Section 2 architecture diagram + the 2-call design.

## How numbers are computed (anti-hallucination)
Link to / summarize docs/numbers_note.md.

## Sample Q&A
Link to docs/sample_questions.md, paste 2–3 examples inline.

## Design tradeoffs
See Section 11 below — paste directly.

## Known limitations
- Single dataset per session, no multi-file joins
- Column-name-dependent: works best when questions reference real column concepts
- One self-correction retry on code errors, then fails gracefully
```

---

## 11. Tradeoff Documentation (deliverable — 10 pts, paste into README)

Write these up honestly once built. Talking points to cover:

| Decision | Tradeoff |
|---|---|
| Two Groq calls instead of one | Slightly higher latency & cost per question, but eliminates numeric hallucination — correctness was prioritized over speed |
| AST-based sandboxing instead of Docker/subprocess isolation | Faster to build, zero extra infra, sufficient for a single-user CLI tool — but not suitable for untrusted multi-tenant deployment as-is |
| No LangChain/agent framework | Full control and transparency over every prompt/step, easier to debug, fewer dependency/version failure points — at the cost of writing the orchestration loop by hand |
| Schema summary instead of sending the full dataset to the LLM | Keeps prompts small/fast/cheap and works on datasets far larger than context limits — but means the LLM's *planning* is based on a sample, not the full data (mitigated because execution always runs on the full `df`) |
| One bounded self-correction retry | Improves robustness to minor LLM code mistakes without risking runaway retry loops or cost |
| CLI instead of a web UI | Matches the "speed and reproducibility" instruction and removes an entire layer of frontend complexity — no charts rendered inline, saved to file instead |

---

## 12. Testing Checklist (do this before calling it done)

- [ ] `python src/config.py` prints a real Groq completion (Step 2 smoke test)
- [ ] Loading both a `.csv` and an `.xlsx` file works via `data_loader.py`
- [ ] `sandbox.py` rejects code containing `import os`, `open(...)`, `__class__`, etc. (write this as `tests/test_sandbox.py`)
- [ ] A basic aggregation question returns a correct, spot-checkable number
- [ ] A chart-request question produces a real PNG in `outputs/`
- [ ] Deliberately ask about a nonexistent column — confirm the self-correction retry fires, and if it still fails, confirm the CLI prints a clean error instead of a stack trace
- [ ] Full REPL session runs start-to-finish with `python main.py --file data/sample_dataset.csv`
- [ ] All 8–10 sample questions produce plausible, verifiable answers with correct arithmetic (manually check 2–3 against a spreadsheet formula)

---

## 13. Rubric Self-Check Mapping

| Rubric criterion | Where it's satisfied |
|---|---|
| Working End-to-End Functionality (30) | Sections 5 & 8 — full CLI runtime, tested per Section 12 |
| Smart Approach / NLP Logic (25) | Two-call code-gen + grounded-answer design (Section 2, 6, 7), self-correction retry |
| Clean Code Organization (20) | Section 4 module split — one responsibility per file, no framework bloat |
| Pristine README (15) | Section 10 |
| Tradeoff Documentation (10) | Section 11 |
