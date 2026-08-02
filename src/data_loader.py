import os
import pandas as pd


def load_dataset(path: str) -> pd.DataFrame:
    """Load a CSV or Excel file into a pandas DataFrame."""
    ext = os.path.splitext(path)[1].lower()
    if ext == ".csv":
        try:
            return pd.read_csv(path, encoding="utf-8")
        except UnicodeDecodeError:
            print(f"[WARNING] UTF-8 decoding failed for {path}. Falling back to latin-1 encoding.")
            return pd.read_csv(path, encoding="latin-1")
    elif ext in (".xlsx", ".xls"):
        return pd.read_excel(path)
    else:
        raise ValueError(f"Unsupported file format: {ext}. Use .csv or .xlsx/.xls")


def build_schema_summary(df: pd.DataFrame) -> str:
    """Build a robust, compact text summary of the DataFrame schema for LLM context."""
    lines = []
    lines.append(f"Rows: {len(df)}")
    lines.append(f"Columns ({len(df.columns)}): {', '.join([repr(c) for c in df.columns])}")
    lines.append("")

    # Date column check & note for non-datetime dtypes
    date_cols = [
        col for col in df.columns
        if pd.api.types.is_datetime64_any_dtype(df[col]) or "date" in str(col).lower() or "time" in str(col).lower()
    ]
    if date_cols:
        date_notes = []
        for c in date_cols:
            if not pd.api.types.is_datetime64_any_dtype(df[c]):
                date_notes.append(
                    f"{repr(c)} (stored as text, not datetime — must be converted before chronological sorting)"
                )
            else:
                date_notes.append(f"{repr(c)} (datetime64)")
        lines.append(f"Detected Date/Time Columns: {'; '.join(date_notes)}")
    else:
        lines.append("Detected Date/Time Columns: None")

    lines.append("")
    lines.append("Column details:")
    for col in df.columns:
        dtype = df[col].dtype
        null_count = df[col].isnull().sum()
        null_str = f", {null_count} nulls" if null_count > 0 else ", 0 nulls"
        col_name_repr = repr(col)

        if pd.api.types.is_numeric_dtype(df[col]):
            non_null = df[col].dropna()
            if len(non_null) > 0:
                lines.append(
                    f"  - {col_name_repr} ({dtype}{null_str}): min={non_null.min()}, "
                    f"max={non_null.max()}, mean={non_null.mean():.2f}"
                )
            else:
                lines.append(f"  - {col_name_repr} ({dtype}{null_str}): all null")
        else:
            n_unique = df[col].nunique()
            if n_unique < 20:
                unique_vals = df[col].dropna().unique().tolist()
                vals_str = str(unique_vals)
                if len(vals_str) > 200:
                    vals_str = vals_str[:200] + "..."
                lines.append(f"  - {col_name_repr} (object, {n_unique} unique{null_str}): {vals_str}")
            else:
                lines.append(f"  - {col_name_repr} (object, {n_unique} unique values{null_str})")

    lines.append("")
    lines.append("First 3 rows sample:")
    lines.append(df.head(3).to_markdown(index=False))

    summary = "\n".join(lines)
    # Cap at ~1500 tokens (~6000 chars)
    if len(summary) > 6000:
        summary = summary[:6000] + "\n... (truncated)"
    return summary


if __name__ == "__main__":
    df = load_dataset("data/sample_dataset.csv")
    print(f"Loaded {len(df)} rows, {len(df.columns)} columns")
    print()
    print(build_schema_summary(df))
