from typing import Any, Dict, List
import numpy as np
import pandas as pd


def validate_dataset(df: pd.DataFrame) -> Dict[str, Any]:
    """Inspect dataset and return list of granular quality issues and warnings."""
    row_count = len(df)
    col_count = len(df.columns)

    issues: List[Dict[str, Any]] = []

    if row_count == 0:
        issues.append({
            "id": "empty_dataset",
            "type": "Empty Dataset",
            "severity": "CRITICAL",
            "column": None,
            "count": 0,
            "message": "Dataset contains no rows.",
            "recommendation": "Upload a non-empty dataset.",
        })
        return {"total_issues": 1, "issues": issues}

    # 1. Missing values & null-only columns
    for col in df.columns:
        col_str = str(col)
        null_cnt = int(df[col].isnull().sum())
        if null_cnt == row_count:
            issues.append({
                "id": f"null_only_{col_str}",
                "type": "Null-Only Column",
                "severity": "HIGH",
                "column": col_str,
                "count": null_cnt,
                "message": f"Column '{col_str}' contains 100% missing values.",
                "recommendation": f"Consider dropping empty column '{col_str}'.",
            })
        elif null_cnt > 0:
            null_pct = round((null_cnt / row_count) * 100, 1)
            severity = "HIGH" if null_pct > 30 else ("MEDIUM" if null_pct > 5 else "LOW")
            issues.append({
                "id": f"missing_values_{col_str}",
                "type": "Missing Values",
                "severity": severity,
                "column": col_str,
                "count": null_cnt,
                "message": f"Column '{col_str}' has {null_cnt} missing values ({null_pct}%).",
                "recommendation": f"Impute missing values in '{col_str}' with median/mode or drop missing rows.",
            })

    # 2. Duplicate rows
    dup_cnt = int(df.duplicated().sum())
    if dup_cnt > 0:
        dup_pct = round((dup_cnt / row_count) * 100, 1)
        severity = "HIGH" if dup_pct > 10 else "MEDIUM"
        issues.append({
            "id": "duplicate_rows",
            "type": "Duplicate Rows",
            "severity": severity,
            "column": None,
            "count": dup_cnt,
            "message": f"Found {dup_cnt} duplicate rows ({dup_pct}% of dataset).",
            "recommendation": "Deduplicate dataset by removing exact duplicate rows.",
        })

    # 3. Constant columns
    for col in df.columns:
        col_str = str(col)
        if df[col].isnull().sum() < row_count and df[col].nunique(dropna=True) == 1:
            issues.append({
                "id": f"constant_{col_str}",
                "type": "Constant Column",
                "severity": "LOW",
                "column": col_str,
                "count": row_count,
                "message": f"Column '{col_str}' has only one unique value: '{df[col].dropna().iloc[0]}'.",
                "recommendation": f"Remove constant column '{col_str}' as it provides no variance.",
            })

    # 4. Outliers (IQR & Z-score) for numeric columns
    for col in df.select_dtypes(include=[np.number]).columns:
        col_str = str(col)
        s = df[col].dropna()
        if len(s) >= 10:
            q25, q75 = s.quantile(0.25), s.quantile(0.75)
            iqr = q75 - q25
            if iqr > 0:
                lower_iqr = q25 - 1.5 * iqr
                upper_iqr = q75 + 1.5 * iqr
                iqr_outliers = int(((s < lower_iqr) | (s > upper_iqr)).sum())
                if iqr_outliers > 0:
                    iqr_pct = round((iqr_outliers / len(s)) * 100, 1)
                    severity = "HIGH" if iqr_pct > 10 else "LOW"
                    issues.append({
                        "id": f"iqr_outliers_{col_str}",
                        "type": "IQR Outliers",
                        "severity": severity,
                        "column": col_str,
                        "count": iqr_outliers,
                        "message": f"Column '{col_str}' has {iqr_outliers} IQR outliers ({iqr_pct}%). Range: [{round(q25, 2)}, {round(q75, 2)}].",
                        "recommendation": f"Cap or inspect potential extreme outliers in '{col_str}'.",
                    })

            # Z-score outliers
            std = s.std()
            if std > 0:
                mean = s.mean()
                z_scores = (s - mean).abs() / std
                z_outliers = int((z_scores > 3.0).sum())
                if z_outliers > 0 and f"iqr_outliers_{col_str}" not in [i["id"] for i in issues]:
                    issues.append({
                        "id": f"zscore_outliers_{col_str}",
                        "type": "Z-Score Outliers",
                        "severity": "LOW",
                        "column": col_str,
                        "count": z_outliers,
                        "message": f"Column '{col_str}' has {z_outliers} values exceeding |Z| > 3.0.",
                        "recommendation": f"Review extreme statistical outliers in '{col_str}'.",
                    })

    # 5. Whitespace and mixed casing issues in text columns
    for col in df.select_dtypes(include=["object", "string"]).columns:
        col_str = str(col)
        non_nulls = df[col].dropna().astype(str)
        ws_count = int(sum(1 for v in non_nulls if v != v.strip()))
        if ws_count > 0:
            issues.append({
                "id": f"whitespace_{col_str}",
                "type": "Whitespace Issues",
                "severity": "LOW",
                "column": col_str,
                "count": ws_count,
                "message": f"Column '{col_str}' has {ws_count} text values with leading or trailing whitespace.",
                "recommendation": f"Trim leading and trailing whitespace in '{col_str}'.",
            })

        # Mixed casing check
        lower_vals = [v.lower() for v in non_nulls]
        unique_raw = non_nulls.nunique()
        unique_lower = len(set(lower_vals))
        if unique_lower < unique_raw and unique_raw <= 100:
            casing_diff = unique_raw - unique_lower
            issues.append({
                "id": f"mixed_casing_{col_str}",
                "type": "Mixed Casing",
                "severity": "MEDIUM",
                "column": col_str,
                "count": casing_diff,
                "message": f"Column '{col_str}' contains {casing_diff} inconsistent casing variants (e.g. 'Male' vs 'male').",
                "recommendation": f"Normalize text casing in '{col_str}' to lower or title case.",
            })

        # Unparsed dates stored as object
        if "date" in col_str.lower() or "time" in col_str.lower() or "created" in col_str.lower():
            try:
                parsed = pd.to_datetime(non_nulls.head(50), errors="coerce")
                if parsed.notnull().sum() > 0.8 * min(len(non_nulls), 50):
                    issues.append({
                        "id": f"unparsed_date_{col_str}",
                        "type": "Incorrect Data Type",
                        "severity": "MEDIUM",
                        "column": col_str,
                        "count": len(non_nulls),
                        "message": f"Column '{col_str}' contains date strings but is stored as object dtype.",
                        "recommendation": f"Convert '{col_str}' to datetime64 type.",
                    })
            except Exception:
                pass

        # Unparsed numeric stored as object (e.g. '$100', '1,200', '15%')
        cleaned_num = non_nulls.str.replace(r'[\$,%]', '', regex=True)
        try:
            parsed_num = pd.to_numeric(cleaned_num.head(50), errors="coerce")
            if parsed_num.notnull().sum() > 0.8 * min(len(non_nulls), 50):
                issues.append({
                    "id": f"unparsed_numeric_{col_str}",
                    "type": "Unparsed Numeric",
                    "severity": "MEDIUM",
                    "column": col_str,
                    "count": len(non_nulls),
                    "message": f"Column '{col_str}' contains formatted numeric values (currencies/percentages) stored as text.",
                    "recommendation": f"Clean currency/percentage symbols in '{col_str}' and cast to numeric.",
                })
        except Exception:
            pass

    return {
        "total_issues": len(issues),
        "issues": issues,
        "summary": {
            "critical": len([i for i in issues if i["severity"] == "CRITICAL"]),
            "high": len([i for i in issues if i["severity"] == "HIGH"]),
            "medium": len([i for i in issues if i["severity"] == "MEDIUM"]),
            "low": len([i for i in issues if i["severity"] == "LOW"]),
        },
    }
