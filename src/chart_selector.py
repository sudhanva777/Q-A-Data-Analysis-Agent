from typing import Any, Dict, List, Optional
import pandas as pd
import numpy as np


def select_and_build_chart(
    table_payload: Optional[Dict[str, Any]],
    question: str = "",
    df_result: Optional[Any] = None,
) -> Optional[Dict[str, Any]]:
    """Determine best visualization type and build Recharts-compatible JSON payload."""
    if not table_payload or not table_payload.get("rows") or not table_payload.get("columns"):
        return None

    columns = table_payload["columns"]
    rows = table_payload["rows"]

    if len(columns) == 0 or len(rows) == 0:
        return None

    q_lower = question.lower()

    # Case 1: Single Numeric Column Distribution
    if len(columns) == 1:
        col = columns[0]
        vals = [r.get(col) for r in rows if r.get(col) is not None]
        numeric_vals = [float(v) for v in vals if isinstance(v, (int, float)) or (isinstance(v, str) and v.replace('.', '', 1).replace('-', '', 1).isdigit())]
        if len(numeric_vals) >= 5:
            # Build 10-bin histogram data
            counts, bin_edges = pd.cut(pd.Series(numeric_vals), bins=min(10, len(numeric_vals)), retbins=True)
            vc = counts.value_counts().sort_index()
            hist_data = []
            for interval, count in vc.items():
                hist_data.append({
                    "name": f"{round(interval.left, 1)}-{round(interval.right, 1)}",
                    "value": int(count),
                })
            return {
                "type": "bar",
                "title": f"Distribution of {col}",
                "xKey": "name",
                "yKey": "value",
                "data": hist_data,
                "config": {"xAxisLabel": col, "yAxisLabel": "Frequency"},
            }
        return None

    # Case 2: Two or more columns
    col1, col2 = columns[0], columns[1]

    # Sample rows (up to 30 for performance)
    sample_rows = rows[:30]

    # Check for correlation matrix pattern (square matrix with same row/col names)
    is_correlation_matrix = (
        len(columns) >= 3 and
        len(rows) >= 3 and
        len(columns) - 1 == len(rows) and  # first column is row names
        all(str(r.get(columns[0], "")) in columns[1:] for r in rows)
    )

    if is_correlation_matrix:
        # Build heatmap data for correlation matrix
        heatmap_data = []
        for r in rows:
            row_name = str(r.get(columns[0], ""))
            for c in columns[1:]:
                try:
                    val = float(r.get(c, 0.0))
                except (ValueError, TypeError):
                    val = 0.0
                heatmap_data.append({
                    "x": row_name,
                    "y": c,
                    "value": val,
                })
        return {
            "type": "heatmap",
            "title": "Correlation Matrix",
            "data": heatmap_data,
            "config": {
                "xAxisLabel": "",
                "yAxisLabel": "",
            },
        }

    # Parse numeric y values
    data_points: List[Dict[str, Any]] = []
    is_time_series = any(k in col1.lower() for k in ["date", "time", "year", "month", "day"]) or "trend" in q_lower or "over time" in q_lower

    is_scatter = ("scatter" in q_lower or "correlation" in q_lower or "relationship" in q_lower) and len(columns) >= 2

    is_pie = ("proportion" in q_lower or "share" in q_lower or "percentage" in q_lower or "composition" in q_lower or "pie" in q_lower) and len(sample_rows) <= 10

    chart_type = "bar"
    if is_time_series:
        chart_type = "line"
    elif is_pie:
        chart_type = "pie"
    elif is_scatter:
        chart_type = "scatter"

    for r in sample_rows:
        x_val = str(r.get(col1, ""))
        y_raw = r.get(col2)
        try:
            y_val = float(y_raw) if y_raw is not None else 0.0
        except (ValueError, TypeError):
            y_val = 0.0

        point: Dict[str, Any] = {"name": x_val, "value": y_val}
        if is_scatter:
            point["x"] = x_val
            point["y"] = y_val

        # Include additional numeric columns as series if present
        for col_extra in columns[2:5]:
            try:
                point[col_extra] = float(r.get(col_extra, 0.0))
            except (ValueError, TypeError):
                point[col_extra] = 0.0

        data_points.append(point)

    if not data_points:
        return None

    return {
        "type": chart_type,
        "title": f"{col2} by {col1}",
        "xKey": "name" if not is_scatter else "x",
        "yKey": "value" if not is_scatter else "y",
        "seriesKeys": columns[1:5],
        "data": data_points,
        "config": {
            "xAxisLabel": col1,
            "yAxisLabel": col2,
        },
    }
