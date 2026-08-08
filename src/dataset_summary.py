import math
import numpy as np
import pandas as pd

from src.data_profiler import profile_dataset
from src.quality_score import calculate_quality_score


def build_rich_dataset_summary(
    df: pd.DataFrame,
    dataset_name: str = "dataset",
    profile: dict | None = None,
    quality: dict | None = None,
) -> str:
    """Build a comprehensive, structured text summary of the dataset for Groq LLM context."""
    row_count = len(df)
    col_count = len(df.columns)

    if profile is None:
        profile = profile_dataset(df, dataset_name, log_audit=False)
    if quality is None:
        quality = calculate_quality_score(df)

    lines = []
    lines.append(f"=== DATASET SUMMARY: {dataset_name} ===")
    lines.append(f"Dimensions: {row_count} rows, {col_count} columns")
    lines.append(f"Memory: {profile['memory']['formatted']}")
    lines.append(f"Quality Score: {quality['score']}/100 ({quality['status']})")
    lines.append(f"Duplicates: {profile['duplication']['duplicate_rows']} ({profile['duplication']['duplicate_pct']}%)")
    lines.append(f"Overall Missing Cells: {profile['missingness']['total_nulls']} ({profile['missingness']['overall_missing_pct']}%)")
    lines.append("")

    # Columns detail
    lines.append("COLUMN DETAILS & DISTRIBUTIONS:")
    for col in df.columns:
        col_str = str(col)
        meta = profile["columns"].get(col_str, {})
        dtype = meta.get("dtype", str(df[col].dtype))
        null_cnt = meta.get("null_count", df[col].isnull().sum())
        null_pct = meta.get("null_pct", 0.0)
        unique_cnt = meta.get("unique_count", df[col].nunique())

        col_header = f"  - '{col_str}' ({dtype}): {unique_cnt} unique values, {null_cnt} nulls ({null_pct}%)"

        if "stats" in meta:
            st = meta["stats"]
            col_header += f" | min={st['min']}, max={st['max']}, mean={st['mean']}, median={st['median']}"
        elif "date_stats" in meta:
            dst = meta["date_stats"]
            col_header += f" | date range: {dst['min_date']} to {dst['max_date']}"
        elif "top_categories" in meta:
            cats = [f"'{c['category']}': {c['count']}" for c in meta["top_categories"][:3]]
            col_header += f" | top: {', '.join(cats)}"

        lines.append(col_header)

    lines.append("")

    # Detected Relationships / Correlations
    corrs = profile.get("correlations", {})
    strong_corrs = []
    for c1, target_map in corrs.items():
        for c2, val in target_map.items():
            if c1 < c2 and abs(val) >= 0.5:
                strong_corrs.append(f"'{c1}' and '{c2}': r = {val}")

    if strong_corrs:
        lines.append("DETECTED STRONG CORRELATIONS:")
        for sc in strong_corrs[:5]:
            lines.append(f"  - {sc}")
        lines.append("")

    # Special Column Flags
    spec = profile.get("special_columns", {})
    if spec.get("constant_columns"):
        lines.append(f"Constant Columns (single value): {', '.join(spec['constant_columns'])}")
    if spec.get("empty_columns"):
        lines.append(f"Empty Columns (all null): {', '.join(spec['empty_columns'])}")
    if spec.get("whitespace_issues_columns"):
        lines.append(f"Whitespace Issues Detected In: {', '.join(spec['whitespace_issues_columns'])}")
    if spec.get("mixed_casing_columns"):
        lines.append(f"Mixed Text Casing Detected In: {', '.join(spec['mixed_casing_columns'])}")

    lines.append("")
    lines.append("FIRST 3 ROWS SAMPLE:")
    lines.append(df.head(3).to_markdown(index=False))

    summary_text = "\n".join(lines)
    # Cap token budget (~6000 chars)
    if len(summary_text) > 6000:
        summary_text = summary_text[:6000] + "\n... (summary truncated)"

    return summary_text
