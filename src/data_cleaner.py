import os
import time
from typing import Any, Dict, List, Optional
import numpy as np
import pandas as pd

from src import db
from src.sandbox import run_code


def generate_cleaning_code(operations: List[str], df: pd.DataFrame) -> str:
    """Generate safe, clean pandas code lines for specified cleaning operations."""
    lines: List[str] = [
        "cleaned_df = df.copy()",
    ]

    ops_set = set(operations)

    if "trim_whitespace" in ops_set:
        lines.append("# Trim leading and trailing whitespace in string columns")
        lines.append("for col in cleaned_df.select_dtypes(include=['object', 'string']).columns:")
        lines.append("    cleaned_df[col] = cleaned_df[col].apply(lambda x: x.strip() if isinstance(x, str) else x)")

    if "normalize_casing" in ops_set:
        lines.append("# Normalize categorical text casing (title case for low-cardinality text)")
        lines.append("for col in cleaned_df.select_dtypes(include=['object', 'string']).columns:")
        lines.append("    if cleaned_df[col].nunique(dropna=True) < 50:")
        lines.append("        cleaned_df[col] = cleaned_df[col].apply(lambda x: x.title() if isinstance(x, str) else x)")

    if "normalize_currencies" in ops_set:
        lines.append("# Strip currency symbols and parse float")
        lines.append("for col in cleaned_df.select_dtypes(include=['object', 'string']).columns:")
        lines.append("    s_str = cleaned_df[col].astype(str)")
        lines.append("    # Match common currency symbols: $ and any non-ascii currency chars")
        lines.append("    # Use a simple approach: remove $ and any character with ord > 127 that looks like currency")
        lines.append("    if s_str.str.contains(r'\\$', regex=True).any():")
        lines.append("        cleaned = s_str.str.replace(r'[\\$,]', '', regex=True)")
        lines.append("        num = pd.to_numeric(cleaned, errors='coerce')")
        lines.append("        if num.notnull().sum() > 0.5 * len(num):")
        lines.append("            cleaned_df[col] = num")

    if "normalize_percentages" in ops_set:
        lines.append("# Strip % symbols and convert to float")
        lines.append("for col in cleaned_df.select_dtypes(include=['object', 'string']).columns:")
        lines.append("    s_str = cleaned_df[col].astype(str)")
        lines.append("    if s_str.str.contains(r'%').any():")
        lines.append("        cleaned = s_str.str.replace('%', '', regex=False)")
        lines.append("        num = pd.to_numeric(cleaned, errors='coerce')")
        lines.append("        if num.notnull().sum() > 0.5 * len(num):")
        lines.append("            cleaned_df[col] = num")

    if "fix_date_formats" in ops_set or "convert_dtypes" in ops_set:
        lines.append("# Parse dates and numeric dtypes stored as text")
        lines.append("for col in cleaned_df.columns:")
        lines.append("    if 'date' in str(col).lower() or 'time' in str(col).lower():")
        lines.append("        try:")
        lines.append("            cleaned_df[col] = pd.to_datetime(cleaned_df[col], errors='coerce')")
        lines.append("        except Exception:")
        lines.append("            pass")

    if "remove_duplicates" in ops_set:
        lines.append("# Remove duplicate rows")
        lines.append("cleaned_df = cleaned_df.drop_duplicates()")

    if "remove_empty_columns" in ops_set:
        lines.append("# Remove empty (100% null) columns")
        lines.append("cleaned_df = cleaned_df.dropna(how='all', axis=1)")

    if "remove_constant_columns" in ops_set:
        lines.append("# Remove constant columns")
        lines.append("constant_cols = [c for c in cleaned_df.columns if cleaned_df[c].nunique(dropna=True) <= 1 and cleaned_df[c].isnull().sum() < len(cleaned_df)]")
        lines.append("cleaned_df = cleaned_df.drop(columns=constant_cols)")

    if "handle_missing" in ops_set:
        lines.append("# Fill missing values (median for numeric, mode for text)")
        lines.append("for col in cleaned_df.columns:")
        lines.append("    if cleaned_df[col].isnull().sum() > 0:")
        lines.append("        if pd.api.types.is_numeric_dtype(cleaned_df[col]):")
        lines.append("            cleaned_df[col] = cleaned_df[col].fillna(cleaned_df[col].median())")
        lines.append("        elif pd.api.types.is_object_dtype(cleaned_df[col]) or pd.api.types.is_string_dtype(cleaned_df[col]):")
        lines.append("            mode_val = cleaned_df[col].mode()")
        lines.append("            if not mode_val.empty:")
        lines.append("                cleaned_df[col] = cleaned_df[col].fillna(mode_val.iloc[0])")

    if "handle_outliers" in ops_set:
        lines.append("# Clip numeric outliers to IQR bounds")
        lines.append("for col in cleaned_df.select_dtypes(include=[np.number]).columns:")
        lines.append("    q25, q75 = cleaned_df[col].quantile(0.25), cleaned_df[col].quantile(0.75)")
        lines.append("    iqr = q75 - q25")
        lines.append("    if iqr > 0:")
        lines.append("        lower_b = q25 - 1.5 * iqr")
        lines.append("        upper_b = q75 + 1.5 * iqr")
        lines.append("        cleaned_df[col] = cleaned_df[col].clip(lower=lower_b, upper=upper_b)")

    lines.append("result = cleaned_df")
    return "\n".join(lines)


def clean_dataset(
    df: pd.DataFrame,
    dataset_name: str,
    operations: List[str],
    save_cleaned: bool = True,
) -> Dict[str, Any]:
    """Execute cleaning operations through the hardened sandbox, write output, and log audit trail."""
    start_time = time.perf_counter()
    initial_rows = len(df)
    initial_cols = len(df.columns)
    initial_nulls = int(df.isnull().sum().sum())

    if not operations:
        operations = [
            "trim_whitespace",
            "normalize_casing",
            "normalize_currencies",
            "normalize_percentages",
            "fix_date_formats",
            "remove_duplicates",
            "remove_empty_columns",
            "remove_constant_columns",
            "handle_missing",
        ]

    code = generate_cleaning_code(operations, df)

    # Route execution EXCLUSIVELY through existing hardened sandbox!
    exec_res = run_code(code, df)

    if exec_res.get("error"):
        raise RuntimeError(f"Cleaning execution failed in sandbox: {exec_res['error']}")

    cleaned_df = exec_res.get("result")
    if not isinstance(cleaned_df, pd.DataFrame):
        raise RuntimeError("Cleaning code did not produce a valid DataFrame result.")

    final_rows = len(cleaned_df)
    final_cols = len(cleaned_df.columns)
    final_nulls = int(cleaned_df.isnull().sum().sum())

    modifications: List[str] = []
    if final_rows != initial_rows:
        modifications.append(f"Removed {initial_rows - final_rows} duplicate or empty rows.")
    if final_cols != initial_cols:
        modifications.append(f"Removed {initial_cols - final_cols} empty or constant columns.")
    if final_nulls != initial_nulls:
        modifications.append(f"Imputed/cleaned {initial_nulls - final_nulls} null cells.")

    cleaned_dataset_id = dataset_name
    if save_cleaned:
        base, ext = os.path.splitext(dataset_name)
        if not base.endswith("_cleaned"):
            cleaned_filename = f"{base}_cleaned{ext if ext else '.csv'}"
        else:
            cleaned_filename = dataset_name

        cleaned_path = os.path.join("data", cleaned_filename)
        cleaned_df.to_csv(cleaned_path, index=False)
        cleaned_dataset_id = cleaned_filename

    latency_ms = (time.perf_counter() - start_time) * 1000

    # Log audit entry in SQLite DB
    try:
        db.log_interaction(
            dataset_name=dataset_name,
            question=f"[USER APPROVED CLEANING] Operations: {', '.join(operations)}",
            generated_code=code,
            result_summary=f"Cleaned {dataset_name}. Rows: {initial_rows}->{final_rows}, Nulls: {initial_nulls}->{final_nulls}",
            chart_path=None,
            answer=f"Dataset cleaned successfully as {cleaned_dataset_id}.",
            status="success",
            error_message=None,
            latency_ms=latency_ms,
        )
    except Exception:
        pass

    return {
        "status": "success",
        "message": "Dataset cleaned successfully.",
        "original_dataset_id": dataset_name,
        "cleaned_dataset_id": cleaned_dataset_id,
        "operations_applied": operations,
        "generated_code": code,
        "modifications": modifications,
        "stats_before": {"rows": initial_rows, "columns": initial_cols, "nulls": initial_nulls},
        "stats_after": {"rows": final_rows, "columns": final_cols, "nulls": final_nulls},
        "latency_ms": round(latency_ms, 2),
    }
