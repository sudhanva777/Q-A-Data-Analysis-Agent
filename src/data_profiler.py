import math
import os
import re
from typing import Any, Dict, List, Optional
import numpy as np
import pandas as pd

from src import db

GEO_KEYWORDS = {"country", "city", "state", "province", "zip", "zipcode", "postal", "lat", "latitude", "lon", "longitude", "region", "address", "location"}
CURRENCY_SYMBOLS = {"$", "€", "£", "¥", "₹", "usd", "eur", "gbp", "cad", "aud", "inr"}
UNIT_KEYWORDS = {"kg", "g", "lb", "oz", "cm", "m", "km", "inch", "ft", "ml", "l", "mb", "gb", "tb", "hrs", "hours", "min", "sec", "pct", "%", "usd"}


def _sanitize_value(val: Any) -> Any:
    """Ensure value is JSON-serializable."""
    if pd.isna(val) or val is None:
        return None
    if isinstance(val, (np.integer, np.floating, np.bool_)):
        val = val.item()
    if isinstance(val, float):
        if math.isnan(val) or math.isinf(val):
            return None
        return round(val, 4)
    return str(val) if not isinstance(val, (int, float, bool, list, dict)) else val


def profile_dataset(
    df: pd.DataFrame,
    dataset_name: str = "dataset",
    log_audit: bool = True,
) -> Dict[str, Any]:
    """Perform exhaustive profiling on a DataFrame and optionally log audit trail."""
    row_count = len(df)
    col_count = len(df.columns)
    mem_bytes = int(df.memory_usage(deep=True).sum())
    mem_formatted = (
        f"{round(mem_bytes / 1024, 1)} KB"
        if mem_bytes < 1024 * 1024
        else f"{round(mem_bytes / (1024 * 1024), 2)} MB"
    )

    duplicate_rows = int(df.duplicated().sum())
    duplicate_pct = round((duplicate_rows / max(row_count, 1)) * 100, 2)
    total_cells = row_count * col_count
    total_nulls = int(df.isnull().sum().sum())
    overall_missing_pct = round((total_nulls / max(total_cells, 1)) * 100, 2)

    columns_profile: Dict[str, Any] = {}
    constant_columns: List[str] = []
    empty_columns: List[str] = []
    high_cardinality_columns: List[str] = []
    potential_primary_keys: List[str] = []
    potential_target_columns: List[str] = []
    geographic_columns: List[str] = []
    boolean_columns: List[str] = []
    currency_columns: List[str] = []
    percentage_columns: List[str] = []
    unit_columns: List[str] = []
    incorrect_type_columns: List[str] = []
    whitespace_issues_columns: List[str] = []
    mixed_casing_columns: List[str] = []

    has_time_series = False

    for col in df.columns:
        col_str = str(col)
        col_lower = col_str.lower()
        series = df[col]
        dtype_str = str(series.dtype)
        null_cnt = int(series.isnull().sum())
        null_pct = round((null_cnt / max(row_count, 1)) * 100, 2)
        unique_cnt = int(series.nunique(dropna=True))
        cardinality_pct = round((unique_cnt / max(row_count, 1)) * 100, 2)

        col_meta: Dict[str, Any] = {
            "name": col_str,
            "dtype": dtype_str,
            "null_count": null_cnt,
            "null_pct": null_pct,
            "unique_count": unique_cnt,
            "cardinality_pct": cardinality_pct,
        }

        # Check empty & constant
        if null_cnt == row_count:
            empty_columns.append(col_str)
        elif unique_cnt == 1:
            constant_columns.append(col_str)

        # Check potential primary key
        if null_cnt == 0 and unique_cnt == row_count and row_count > 0:
            potential_primary_keys.append(col_str)

        # Check high cardinality
        if pd.api.types.is_object_dtype(series) or pd.api.types.is_string_dtype(series):
            if unique_cnt > 50 and cardinality_pct > 40:
                high_cardinality_columns.append(col_str)

        # Check geographic columns
        if any(geo in col_lower for geo in GEO_KEYWORDS):
            geographic_columns.append(col_str)

        # Check boolean
        if pd.api.types.is_bool_dtype(series) or (unique_cnt <= 2 and set(series.dropna().unique()).issubset({0, 1, "0", "1", "True", "False", "true", "false", "T", "F", "Y", "N", "yes", "no"})):
            boolean_columns.append(col_str)

        # Check currency / percentage / units in column name or sample values
        non_null_samples = series.dropna().head(100).astype(str).tolist()
        sample_str = " ".join(non_null_samples).lower()

        if any(sym in col_lower or sym in sample_str for sym in CURRENCY_SYMBOLS):
            currency_columns.append(col_str)

        if "%" in col_lower or "percent" in col_lower or "%" in sample_str:
            percentage_columns.append(col_str)

        if any(re.search(r'\b' + re.escape(u) + r'\b', col_lower) for u in UNIT_KEYWORDS):
            unit_columns.append(col_str)

        # Check whitespace and mixed casing in text columns
        if pd.api.types.is_object_dtype(series) or pd.api.types.is_string_dtype(series):
            has_ws = any(val != val.strip() for val in non_null_samples if isinstance(val, str))
            if has_ws:
                whitespace_issues_columns.append(col_str)

            # Mixed casing check (e.g., 'Male', 'male', 'MALE')
            lowered = [v.lower() for v in non_null_samples if isinstance(v, str)]
            if len(set(lowered)) < len(set(non_null_samples)) and unique_cnt < 50:
                mixed_casing_columns.append(col_str)

            # Check if numeric/date stored as text
            # Try numeric
            numeric_converted = pd.to_numeric(series.dropna().head(50), errors="coerce")
            if numeric_converted.notnull().sum() > 0.8 * min(len(series.dropna()), 50):
                incorrect_type_columns.append(col_str)
                col_meta["suggested_type"] = "numeric"
            else:
                # Try date
                if "date" in col_lower or "time" in col_lower:
                    try:
                        date_converted = pd.to_datetime(series.dropna().head(50), errors="coerce")
                        if date_converted.notnull().sum() > 0.8 * min(len(series.dropna()), 50):
                            incorrect_type_columns.append(col_str)
                            col_meta["suggested_type"] = "datetime"
                    except Exception:
                        pass

        # Numeric stats (exclude boolean — quantile unsupported on bool dtype)
        if pd.api.types.is_numeric_dtype(series) and not pd.api.types.is_bool_dtype(series):
            clean_s = series.dropna()
            if len(clean_s) > 0:
                col_meta["stats"] = {
                    "min": _sanitize_value(clean_s.min()),
                    "max": _sanitize_value(clean_s.max()),
                    "mean": _sanitize_value(clean_s.mean()),
                    "std": _sanitize_value(clean_s.std()) if len(clean_s) > 1 else 0.0,
                    "median": _sanitize_value(clean_s.median()),
                    "q25": _sanitize_value(clean_s.quantile(0.25)),
                    "q75": _sanitize_value(clean_s.quantile(0.75)),
                    "skew": _sanitize_value(clean_s.skew()) if len(clean_s) > 2 else 0.0,
                    "zeros_count": int((clean_s == 0).sum()),
                }

        # Date range stats & time series detection
        if pd.api.types.is_datetime64_any_dtype(series) or "date" in col_lower or "time" in col_lower:
            try:
                date_s = pd.to_datetime(series.dropna(), errors="coerce").dropna()
                if len(date_s) > 0:
                    col_meta["date_stats"] = {
                        "min_date": str(date_s.min()),
                        "max_date": str(date_s.max()),
                        "range_days": int((date_s.max() - date_s.min()).days),
                    }
                    if len(date_s) > 5 and date_s.is_monotonic_increasing or date_s.is_monotonic_decreasing:
                        has_time_series = True
            except Exception:
                pass

        # Category distributions (top 5)
        if unique_cnt <= 100 and len(series.dropna()) > 0:
            top_vc = series.value_counts(dropna=True).head(5)
            col_meta["top_categories"] = [
                {"category": str(k), "count": int(v), "percentage": round((int(v) / max(row_count, 1)) * 100, 2)}
                for k, v in top_vc.items()
            ]

        # Potential target columns (e.g. classification or regression target)
        if "target" in col_lower or "label" in col_lower or "class" in col_lower or "churn" in col_lower or "price" in col_lower or "outcome" in col_lower:
            potential_target_columns.append(col_str)

        columns_profile[col_str] = col_meta

    # Correlation matrix for numeric columns
    numeric_df = df.select_dtypes(include=[np.number])
    correlation_matrix: Dict[str, Dict[str, float]] = {}
    if len(numeric_df.columns) >= 2:
        try:
            corr = numeric_df.corr().fillna(0.0)
            for c1 in corr.columns:
                correlation_matrix[str(c1)] = {
                    str(c2): round(float(corr.loc[c1, c2]), 3) for c2 in corr.columns
                }
        except Exception:
            pass

    report = {
        "dataset_name": dataset_name,
        "dimensions": {"rows": row_count, "columns": col_count},
        "memory": {"bytes": mem_bytes, "formatted": mem_formatted},
        "duplication": {"duplicate_rows": duplicate_rows, "duplicate_pct": duplicate_pct},
        "missingness": {"total_nulls": total_nulls, "overall_missing_pct": overall_missing_pct},
        "columns": columns_profile,
        "correlations": correlation_matrix,
        "special_columns": {
            "constant_columns": constant_columns,
            "empty_columns": empty_columns,
            "high_cardinality_columns": high_cardinality_columns,
            "potential_primary_keys": potential_primary_keys,
            "potential_target_columns": potential_target_columns,
            "geographic_columns": geographic_columns,
            "boolean_columns": boolean_columns,
            "currency_columns": currency_columns,
            "percentage_columns": percentage_columns,
            "unit_columns": unit_columns,
            "incorrect_type_columns": incorrect_type_columns,
            "whitespace_issues_columns": whitespace_issues_columns,
            "mixed_casing_columns": mixed_casing_columns,
        },
        "has_time_series": has_time_series,
    }

    if log_audit:
        try:
            db.log_interaction(
                dataset_name=dataset_name,
                question="[AUTOMATIC] Profile Dataset",
                generated_code=None,
                result_summary=f"Profiled {row_count} rows, {col_count} cols. Missing: {overall_missing_pct}%, Dups: {duplicate_pct}%",
                chart_path=None,
                answer=f"Data profiling complete for {dataset_name}.",
                status="success",
                error_message=None,
                latency_ms=0.0,
            )
        except Exception:
            pass

    return report
