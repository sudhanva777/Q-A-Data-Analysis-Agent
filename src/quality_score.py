from typing import Any, Dict
import pandas as pd

from src.data_validator import validate_dataset


def calculate_quality_score(df: pd.DataFrame, validation_report: Dict[str, Any] | None = None) -> Dict[str, Any]:
    """Compute overall quality score (0-100), status, and dimension breakdown."""
    if validation_report is None:
        validation_report = validate_dataset(df)

    row_count = len(df)
    col_count = len(df.columns)

    if row_count == 0 or col_count == 0:
        return {
            "score": 0,
            "status": "Critical",
            "status_color": "red",
            "dimensions": {
                "completeness": 0,
                "consistency": 0,
                "validity": 0,
                "uniqueness": 0,
                "structure": 0,
            },
            "issue_counts": {"critical": 1, "high": 0, "medium": 0, "low": 0},
            "total_issues": 1,
        }

    # 1. Completeness Score (0 - 100)
    total_cells = row_count * col_count
    null_cells = int(df.isnull().sum().sum())
    completeness_score = max(0.0, round((1.0 - (null_cells / max(total_cells, 1))) * 100, 1))

    # 2. Uniqueness Score (0 - 100)
    dup_rows = int(df.duplicated().sum())
    uniqueness_score = max(0.0, round((1.0 - (dup_rows / max(row_count, 1))) * 100, 1))

    # 3. Consistency & Validity Scores from validation issues
    summary = validation_report.get("summary", {})
    crit_cnt = summary.get("critical", 0)
    high_cnt = summary.get("high", 0)
    med_cnt = summary.get("medium", 0)
    low_cnt = summary.get("low", 0)

    # Base score 100 minus weighted penalties
    penalty = (crit_cnt * 30.0) + (high_cnt * 8.0) + (med_cnt * 3.0) + (low_cnt * 1.0)
    # Cap total penalty to 100
    overall_score = max(0, min(100, int(round(100.0 - penalty))))

    consistency_penalty = sum(
        2 for issue in validation_report.get("issues", [])
        if issue["type"] in ["Whitespace Issues", "Mixed Casing", "Currency Inconsistent", "Unit Inconsistent"]
    )
    consistency_score = max(0, 100 - consistency_penalty * 5)

    validity_penalty = sum(
        3 for issue in validation_report.get("issues", [])
        if issue["type"] in ["Unparsed Date", "Unparsed Numeric", "IQR Outliers", "Z-Score Outliers", "Incorrect Data Type"]
    )
    validity_score = max(0, 100 - validity_penalty * 5)

    structure_penalty = sum(
        5 for issue in validation_report.get("issues", [])
        if issue["type"] in ["Null-Only Column", "Constant Column"]
    )
    structure_score = max(0, 100 - structure_penalty * 5)

    # Determine status
    if overall_score >= 90:
        status = "Excellent"
        status_color = "emerald"
    elif overall_score >= 75:
        status = "Good"
        status_color = "blue"
    elif overall_score >= 60:
        status = "Needs Review"
        status_color = "amber"
    elif overall_score >= 40:
        status = "Needs Cleaning"
        status_color = "orange"
    else:
        status = "Critical"
        status_color = "red"

    return {
        "score": overall_score,
        "status": status,
        "status_color": status_color,
        "dimensions": {
            "completeness": int(completeness_score),
            "consistency": int(consistency_score),
            "validity": int(validity_score),
            "uniqueness": int(uniqueness_score),
            "structure": int(structure_score),
        },
        "issue_counts": {
            "critical": crit_cnt,
            "high": high_cnt,
            "medium": med_cnt,
            "low": low_cnt,
        },
        "total_issues": validation_report.get("total_issues", 0),
    }
