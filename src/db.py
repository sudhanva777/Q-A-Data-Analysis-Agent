import os
import sqlite3
from datetime import datetime

DB_DIR = "logs"
DB_PATH = os.path.join(DB_DIR, "agent_logs.db")


def init_db():
    """Create logs directory and logs table if not present."""
    os.makedirs(DB_DIR, exist_ok=True)
    with sqlite3.connect(DB_PATH, timeout=10) as conn:
        conn.execute("PRAGMA journal_mode=WAL")
        conn.execute("PRAGMA synchronous=NORMAL")
        conn.execute("""
            CREATE TABLE IF NOT EXISTS logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp TEXT,
                dataset_name TEXT,
                question TEXT,
                generated_code TEXT,
                result_summary TEXT,
                chart_path TEXT,
                answer TEXT,
                status TEXT,
                error_message TEXT,
                latency_ms REAL
            )
        """)


def log_interaction(
    dataset_name: str,
    question: str,
    generated_code: str | None,
    result_summary: str | None,
    chart_path: str | None,
    answer: str | None,
    status: str,
    error_message: str | None,
    latency_ms: float,
):
    """Insert a single interaction log row."""
    init_db()
    timestamp = datetime.now().isoformat()
    # Truncate result summary if too long
    if result_summary and len(result_summary) > 1000:
        result_summary = result_summary[:1000] + "... (truncated)"
    with sqlite3.connect(DB_PATH) as conn:
        conn.execute(
            """
            INSERT INTO logs (
                timestamp, dataset_name, question, generated_code,
                result_summary, chart_path, answer, status, error_message, latency_ms
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                timestamp,
                dataset_name,
                question,
                generated_code,
                result_summary,
                chart_path,
                answer,
                status,
                error_message,
                latency_ms,
            ),
        )


def fetch_logs(limit: int = 50) -> list[dict]:
    """Fetch recent log rows ordered newest first."""
    init_db()
    with sqlite3.connect(DB_PATH) as conn:
        conn.row_factory = sqlite3.Row
        cursor = conn.execute(
            "SELECT * FROM logs ORDER BY id DESC LIMIT ?", (limit,)
        )
        return [dict(row) for row in cursor.fetchall()]
