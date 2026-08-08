import os
from typing import Any, Dict, List
import numpy as np
import pandas as pd

from src import db
from src.data_profiler import profile_dataset


def generate_auto_insights(
    df: pd.DataFrame,
    dataset_name: str = "dataset",
    profile: Dict[str, Any] | None = None,
    log_audit: bool = True,
) -> Dict[str, Any]:
    """Analyze DataFrame and generate structured automated insights cards."""
    row_count = len(df)
    col_count = len(df.columns)

    if row_count == 0 or col_count == 0:
        return {
            "status": "error",
            "message": "Dataset is empty.",
            "insights": [],
        }

    if profile is None:
        profile = profile_dataset(df, dataset_name, log_audit=False)
    insights: List[Dict[str, Any]] = []

    # 1. Dataset Overview
    insights.append({
        "category": "Dataset Overview",
        "title": f"Dataset Dimension & Structure",
        "description": f"The dataset contains {row_count:,} rows and {col_count} columns ({profile['memory']['formatted']} memory).",
        "icon": "Database",
        "type": "info",
    })

    # 2. Missing Data Summary
    total_nulls = profile["missingness"]["total_nulls"]
    overall_null_pct = profile["missingness"]["overall_missing_pct"]
    if total_nulls > 0:
        high_null_cols = [
            f"'{col}' ({meta['null_pct']}%)"
            for col, meta in profile["columns"].items()
            if meta.get("null_pct", 0) > 10.0
        ]
        null_desc = f"Overall missingness is {overall_null_pct}% ({total_nulls:,} empty cells)."
        if high_null_cols:
            null_desc += f" Columns with high null rates: {', '.join(high_null_cols)}."
        insights.append({
            "category": "Missing Data Summary",
            "title": "Data Completeness",
            "description": null_desc,
            "icon": "AlertTriangle",
            "type": "warning" if overall_null_pct > 5 else "info",
        })
    else:
        insights.append({
            "category": "Missing Data Summary",
            "title": "Data Completeness",
            "description": "Perfect completeness — 0 missing values detected across all columns.",
            "icon": "CheckCircle",
            "type": "success",
        })

    # 3. Highest & Lowest Values (Key Extremes)
    numeric_cols = df.select_dtypes(include=[np.number]).columns
    for col in numeric_cols[:3]:
        s = df[col].dropna()
        if len(s) > 0:
            min_val = round(float(s.min()), 2)
            max_val = round(float(s.max()), 2)
            mean_val = round(float(s.mean()), 2)
            insights.append({
                "category": "Highest & Lowest Values",
                "title": f"Extremes for '{col}'",
                "description": f"Values for '{col}' range from {min_val} to {max_val} with an average of {mean_val}.",
                "icon": "TrendingUp",
                "type": "info",
            })

    # 4. Strong Correlations
    corrs = profile.get("correlations", {})
    strong_pairs = []
    for c1, target_map in corrs.items():
        for c2, val in target_map.items():
            if c1 < c2 and abs(val) >= 0.6:
                relation = "positive" if val > 0 else "negative"
                strong_pairs.append(f"Strong {relation} correlation between '{c1}' and '{c2}' (r = {val}).")

    if strong_pairs:
        insights.append({
            "category": "Strong Correlations",
            "title": "Key Relationships",
            "description": " ".join(strong_pairs[:3]),
            "icon": "Zap",
            "type": "info",
        })

    # 5. Outliers & Anomalies
    outlier_cols = []
    for col in numeric_cols:
        s = df[col].dropna()
        if len(s) >= 10:
            q25, q75 = s.quantile(0.25), s.quantile(0.75)
            iqr = q75 - q25
            if iqr > 0:
                cnt = int(((s < q25 - 1.5 * iqr) | (s > q75 + 1.5 * iqr)).sum())
                if cnt > 0:
                    outlier_cols.append(f"'{col}' ({cnt} outliers)")

    if outlier_cols:
        insights.append({
            "category": "Potential Outliers",
            "title": "Statistical Anomalies",
            "description": f"IQR outliers detected in: {', '.join(outlier_cols[:4])}.",
            "icon": "AlertOctagon",
            "type": "warning",
        })

    # 6. Category Distribution Insights
    cat_cols = df.select_dtypes(include=["object", "string"]).columns
    for col in cat_cols[:2]:
        top_cats = profile["columns"].get(str(col), {}).get("top_categories", [])
        if top_cats:
            top_1 = top_cats[0]
            insights.append({
                "category": "Category Distribution",
                "title": f"Dominant Category in '{col}'",
                "description": f"'{top_1['category']}' is the top category, making up {top_1['percentage']}% ({top_1['count']} occurrences).",
                "icon": "PieChart",
                "type": "info",
            })

    # 7. Potential Business Insights
    business_tips: List[str] = []
    if profile["special_columns"].get("mixed_casing_columns"):
        business_tips.append("Clean text casing to prevent duplicate records during aggregation.")
    if profile["special_columns"].get("currency_columns"):
        business_tips.append("Format currency columns to numeric float before running financial calculations.")
    if profile["special_columns"].get("potential_primary_keys"):
        business_tips.append(f"Primary key candidate: '{profile['special_columns']['potential_primary_keys'][0]}'.")

    if business_tips:
        insights.append({
            "category": "Potential Business Insights",
            "title": "Actionable Analytics Recommendations",
            "description": " ".join(business_tips),
            "icon": "Lightbulb",
            "type": "success",
        })

    if log_audit:
        try:
            db.log_interaction(
                dataset_name=dataset_name,
                question="[AUTOMATIC] Auto Insights Generation",
                generated_code=None,
                result_summary=f"Generated {len(insights)} automated insights for {dataset_name}.",
                chart_path=None,
                answer="Auto insights generated successfully.",
                status="success",
                error_message=None,
                latency_ms=0.0,
            )
        except Exception:
            pass

    return {
        "status": "success",
        "dataset_name": dataset_name,
        "total_insights": len(insights),
        "insights": insights,
    }
