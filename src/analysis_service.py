import glob
import json
import math
import os
import re
import time
from datetime import date, datetime, time as dt_time, timedelta
from typing import Any, Dict, List, Optional

import numpy as np
import pandas as pd

from src import agent, db
from src.cache_store import get_cached, make_dataset_cache_key, set_cached
from src.data_loader import load_dataset
from src.dataset_summary import build_rich_dataset_summary
from src.data_profiler import profile_dataset
from src.data_validator import validate_dataset
from src.quality_score import calculate_quality_score
from src.data_cleaner import clean_dataset
from src.insight_generator import generate_auto_insights
from src.chart_selector import select_and_build_chart


DATASET_ID_PATTERN = re.compile(r"^[A-Za-z0-9 _\.\-]+$")


def sanitize_for_json(value: Any) -> Any:
    """Normalize pandas/numpy values into JSON-safe Python types."""
    if isinstance(value, dict):
        return {k: sanitize_for_json(v) for k, v in value.items()}
    if isinstance(value, (pd.Series, pd.Index)):
        return [sanitize_for_json(v) for v in value.tolist()]
    if pd.api.types.is_list_like(value) and not isinstance(value, (str, bytes, dict)):
        return [sanitize_for_json(v) for v in list(value)]
    if value is pd.NA:
        return None
    if isinstance(value, np.generic):
        return sanitize_for_json(value.item())
    if pd.isna(value):
        return None
    if isinstance(value, (datetime, date, dt_time, timedelta, pd.Timestamp, pd.Timedelta)):
        return str(value)
    if isinstance(value, float):
        if math.isnan(value) or math.isinf(value):
            return None
        return float(value)
    if isinstance(value, (np.integer, np.floating, np.bool_)):
        return value.item()
    return value


def dataframe_to_json_records(df: pd.DataFrame) -> list[dict[str, Any]]:
    """Convert a DataFrame into JSON-safe records, preserving ISO datetimes and nulls."""
    records = df.where(pd.notnull(df), None).to_dict(orient="records")
    return sanitize_for_json(records)


def format_table_result(result: Any) -> dict:
    """Format pandas output into a JSON-serializable table payload."""
    if pd.api.types.is_list_like(result) and not isinstance(result, (str, bytes, dict, pd.Series, pd.DataFrame)):
        result = pd.Series(list(result))

    if isinstance(result, pd.DataFrame):
        rows = dataframe_to_json_records(result)
        return {
            "columns": [str(c) for c in result.columns],
            "rows": rows,
            "shape": [len(result), len(result.columns)],
        }
    if isinstance(result, pd.Series):
        s_df = result.reset_index()
        s_df.columns = [str(c) for c in s_df.columns]
        rows = dataframe_to_json_records(s_df)
        return {
            "columns": [str(c) for c in s_df.columns],
            "rows": rows,
            "shape": [len(s_df), len(s_df.columns)],
        }
    return {
        "columns": ["Result"],
        "rows": [{"Result": str(result)}],
        "shape": [1, 1],
    }


def wrap_scalar_as_table(result: Any) -> Any:
    """Ensure result is always a pandas DataFrame or Series for guaranteed tabular rendering."""
    if isinstance(result, (pd.DataFrame, pd.Series)):
        return result
    if pd.api.types.is_list_like(result) and not isinstance(result, (str, bytes, dict)):
        return pd.Series(list(result))
    if result is None:
        return pd.DataFrame({"Result": ["None"]})
    return pd.DataFrame({"Computed Value": [result]})


def build_chart_payload(table_payload: dict | None, question: str = "") -> dict | None:
    """Create a smart Recharts chart payload with full chart_selector support."""
    return select_and_build_chart(table_payload, question=question)


def validate_dataset_id(dataset_id: str) -> str:
    """Validate uploaded dataset names and path-like identifiers."""
    if not dataset_id or not isinstance(dataset_id, str):
        raise ValueError("Invalid dataset identifier.")
    if ".." in dataset_id or dataset_id.startswith("/") or dataset_id.startswith("\\"):
        raise ValueError("Invalid dataset identifier.")
    if not DATASET_ID_PATTERN.fullmatch(dataset_id):
        raise ValueError("Dataset identifier contains unsupported characters.")
    return os.path.basename(dataset_id)


def get_dataset_path(dataset_id: str) -> str:
    """Resolve dataset id to a file path under the data directory."""
    filename = validate_dataset_id(dataset_id)
    path = os.path.join("data", filename)
    if not os.path.exists(path):
        raise FileNotFoundError(f"Dataset '{filename}' not found.")
    return path


def compute_dataset_intelligence(df: pd.DataFrame, dataset_name: str) -> dict[str, Any]:
    """Run profiling, validation, quality scoring, and insight generation once."""
    profile = profile_dataset(df, dataset_name=dataset_name, log_audit=True)
    val_report = validate_dataset(df)
    quality_info = calculate_quality_score(df, validation_report=val_report)
    insights_info = generate_auto_insights(
        df,
        dataset_name=dataset_name,
        profile=profile,
        log_audit=True,
    )
    return {
        "profile": profile,
        "validation": val_report,
        "quality_score": quality_info,
        "insights": insights_info.get("insights", []),
        "insights_meta": insights_info,
    }


def get_or_load_dataset_intelligence(dataset_id: str, df: pd.DataFrame | None = None) -> dict[str, Any]:
    """Return cached dataset intelligence or compute and cache it."""
    path = get_dataset_path(dataset_id)
    cache_key = make_dataset_cache_key(path)
    cached = get_cached(cache_key)
    if cached is not None:
        return cached

    if df is None:
        df = load_dataset(path)
    intelligence = compute_dataset_intelligence(df, os.path.basename(path))
    set_cached(cache_key, intelligence)
    return intelligence


def list_datasets() -> list[dict[str, Any]]:
    """Return a lightweight list of uploaded datasets."""
    files = sorted(glob.glob("data/*.csv") + glob.glob("data/*.xlsx") + glob.glob("data/*.xls"))
    datasets = []
    for path in files:
        filename = os.path.basename(path)
        size_bytes = os.path.getsize(path)
        datasets.append(
            {
                "dataset_id": filename,
                "filename": filename,
                "size_bytes": size_bytes,
                "size_formatted": (
                    f"{round(size_bytes / 1024, 1)} KB"
                    if size_bytes < 1024 * 1024
                    else f"{round(size_bytes / (1024 * 1024), 2)} MB"
                ),
            }
        )
    return datasets


def get_dataset_details(dataset_id: str) -> dict[str, Any]:
    """Inspect a dataset and return metadata, preview data, quality score, and insights."""
    path = get_dataset_path(dataset_id)
    df = load_dataset(path)
    intelligence = get_or_load_dataset_intelligence(dataset_id, df=df)

    null_total = int(df.isnull().sum().sum())
    cell_count = len(df) * len(df.columns)
    completeness = round((1 - null_total / max(cell_count, 1)) * 100, 1)

    quality_info = intelligence["quality_score"]
    val_report = intelligence["validation"]
    insights_info = intelligence["insights"]

    columns_info = []
    for col in df.columns:
        columns_info.append(
            {
                "name": str(col),
                "dtype": str(df[col].dtype),
                "null_count": int(df[col].isnull().sum()),
                "unique_count": int(df[col].nunique()),
            }
        )

    preview_sample = df.head(10)
    return {
        "status": "success",
        "dataset_id": os.path.basename(path),
        "filename": os.path.basename(path),
        "record_count": len(df),
        "column_count": len(df.columns),
        "null_cells": null_total,
        "completeness": completeness,
        "quality_score": quality_info,
        "validation": val_report,
        "insights": insights_info,
        "columns": columns_info,
        "preview": {
            "columns": [str(c) for c in preview_sample.columns],
            "rows": dataframe_to_json_records(preview_sample),
        },
    }


def upload_dataset_file(upload_filename: str, contents: bytes) -> dict[str, Any]:
    """Persist an uploaded CSV/XLSX file and return metadata, quality score, and insights."""
    filename = os.path.basename(upload_filename)
    filename = validate_dataset_id(filename)
    if not (filename.endswith(".csv") or filename.endswith(".xlsx") or filename.endswith(".xls")):
        raise ValueError("Invalid file format. Only .csv, .xlsx, and .xls files are supported.")

    target_path = os.path.join("data", filename)
    with open(target_path, "wb") as handle:
        handle.write(contents)

    df = load_dataset(target_path)
    intelligence = compute_dataset_intelligence(df, filename)
    cache_key = make_dataset_cache_key(target_path)
    set_cached(cache_key, intelligence)

    null_total = int(df.isnull().sum().sum())
    cell_count = len(df) * len(df.columns)
    completeness = round((1 - null_total / max(cell_count, 1)) * 100, 1)

    quality_info = intelligence["quality_score"]
    val_report = intelligence["validation"]
    insights_info = intelligence["insights"]

    columns_info = [
        {
            "name": str(col),
            "dtype": str(df[col].dtype),
            "null_count": int(df[col].isnull().sum()),
        }
        for col in df.columns
    ]

    preview_sample = df.head(5)
    return {
        "status": "success",
        "message": "File uploaded successfully",
        "dataset_id": filename,
        "filename": filename,
        "size_bytes": len(contents),
        "record_count": len(df),
        "column_count": len(df.columns),
        "completeness": completeness,
        "quality_score": quality_info,
        "validation": val_report,
        "insights": insights_info,
        "columns": columns_info,
        "preview": {
            "columns": [str(c) for c in preview_sample.columns],
            "rows": dataframe_to_json_records(preview_sample),
        },
    }


def get_dataset_profile(dataset_id: str) -> dict[str, Any]:
    """Return comprehensive profiling report for dataset."""
    intelligence = get_or_load_dataset_intelligence(dataset_id)
    return intelligence["profile"]


def get_dataset_quality(dataset_id: str) -> dict[str, Any]:
    """Return quality score and issue report for dataset."""
    intelligence = get_or_load_dataset_intelligence(dataset_id)
    return {
        "status": "success",
        "dataset_id": dataset_id,
        "quality_score": intelligence["quality_score"],
        "validation": intelligence["validation"],
    }


def get_dataset_insights(dataset_id: str) -> dict[str, Any]:
    """Return automated insights for dataset."""
    intelligence = get_or_load_dataset_intelligence(dataset_id)
    meta = intelligence.get("insights_meta") or {}
    return {
        "status": meta.get("status", "success"),
        "dataset_name": meta.get("dataset_name", dataset_id),
        "total_insights": meta.get("total_insights", len(intelligence["insights"])),
        "insights": intelligence["insights"],
    }


def clean_dataset_file(dataset_id: str, operations: list[str], save_cleaned: bool = True) -> dict[str, Any]:
    """Clean dataset using sandbox execution and save result."""
    path = get_dataset_path(dataset_id)
    df = load_dataset(path)
    return clean_dataset(df, dataset_name=os.path.basename(path), operations=operations, save_cleaned=save_cleaned)


def delete_dataset_file(dataset_id: str) -> dict[str, Any]:
    """Remove a dataset file from the data directory."""
    filename = validate_dataset_id(dataset_id)
    target_path = os.path.join("data", filename)
    if not os.path.exists(target_path):
        raise FileNotFoundError(f"Dataset '{filename}' not found.")

    os.remove(target_path)
    return {
        "status": "success",
        "message": "Dataset removed successfully",
        "dataset_id": filename,
    }


def answer_question(dataset_id: str, question: str) -> dict[str, Any]:
    """Run the agent pipeline against a dataset and package the result for UI consumption."""
    path = get_dataset_path(dataset_id)
    start_time = time.perf_counter()
    try:
        df = load_dataset(path)
        intelligence = get_or_load_dataset_intelligence(dataset_id, df=df)
        rich_summary = build_rich_dataset_summary(
            df,
            dataset_name=os.path.basename(path),
            profile=intelligence["profile"],
            quality=intelligence["quality_score"],
        )
        out = agent.answer_question(question, df, rich_summary)
        latency_ms = (time.perf_counter() - start_time) * 1000

        table_payload = format_table_result(out["result"])
        chart_payload = build_chart_payload(table_payload, question=question)

        chart_path = out.get("chart_path")
        chart_url = None
        if chart_path and os.path.exists(chart_path):
            rel_path = os.path.relpath(chart_path, "outputs").replace("\\", "/")
            chart_url = f"/outputs/{rel_path}"

        db.log_interaction(
            dataset_name=os.path.basename(path),
            question=question,
            generated_code=out["code"],
            result_summary=str(out["raw_result"]),
            chart_path=chart_path,
            answer=out["answer"],
            status="success",
            error_message=None,
            latency_ms=latency_ms,
        )

        return {
            "status": "success",
            "dataset_id": dataset_id,
            "question": question,
            "answer": out["answer"],
            "explanation": out["answer"],
            "table": table_payload,
            "chart_url": chart_url,
            "chart_data": chart_payload,
            "generated_code": out["code"],
            "analysis_plan": out.get("analysis_plan"),
            "latency_ms": round(latency_ms, 2),
            "timestamp": time.time(),
        }
    except Exception as exc:
        latency_ms = (time.perf_counter() - start_time) * 1000
        db.log_interaction(
            dataset_name=os.path.basename(path),
            question=question,
            generated_code=None,
            result_summary=None,
            chart_path=None,
            answer=None,
            status="error",
            error_message=str(exc),
            latency_ms=latency_ms,
        )
        raise RuntimeError(str(exc)) from exc


def fetch_history(limit: int = 50) -> dict[str, Any]:
    """Return recent interaction logs for the frontend history sidebar."""
    logs = db.fetch_logs(limit=limit)
    formatted_logs = []
    for log in logs:
        chart_url = None
        chart_path = log.get("chart_path")
        if chart_path and os.path.exists(chart_path):
            rel_path = os.path.relpath(chart_path, "outputs").replace("\\", "/")
            chart_url = f"/outputs/{rel_path}"

        formatted_logs.append(
            {
                "id": log.get("id"),
                "timestamp": log.get("timestamp"),
                "dataset_name": log.get("dataset_name"),
                "question": log.get("question"),
                "generated_code": log.get("generated_code"),
                "result_summary": log.get("result_summary"),
                "chart_url": chart_url,
                "answer": log.get("answer"),
                "status": log.get("status"),
                "error_message": log.get("error_message"),
                "latency_ms": round(log.get("latency_ms", 0), 2) if log.get("latency_ms") else None,
            }
        )
    return {"status": "success", "count": len(formatted_logs), "logs": formatted_logs}
