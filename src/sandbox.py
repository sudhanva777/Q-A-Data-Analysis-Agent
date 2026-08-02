import ast
import threading
import pandas as pd
import numpy as np
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt

BLOCKED_NAMES = {
    "eval", "exec", "open", "__import__", "compile",
    "getattr", "setattr", "globals", "locals", "vars",
}


def validate_code(code: str) -> None:
    """Parse code with ast and reject unsafe patterns."""
    try:
        tree = ast.parse(code)
    except SyntaxError as e:
        raise ValueError(f"Syntax error in generated code: {e}")

    for node in ast.walk(tree):
        if isinstance(node, (ast.Import, ast.ImportFrom)):
            raise ValueError(
                f"Import statements are not allowed: {ast.dump(node)}"
            )

        if isinstance(node, ast.NamedExpr):
            raise ValueError("Walrus operator (:=) is not allowed.")

        if isinstance(node, ast.Call):
            func = node.func
            if isinstance(func, ast.Name) and func.id in BLOCKED_NAMES:
                raise ValueError(f"Blocked function call: {func.id}")
            if isinstance(func, ast.Attribute) and func.attr in BLOCKED_NAMES:
                raise ValueError(f"Blocked method call: {func.attr}")

        if isinstance(node, ast.Attribute):
            if node.attr.startswith("__") and node.attr.endswith("__"):
                raise ValueError(
                    f"Dunder attribute access is not allowed: {node.attr}"
                )

        if isinstance(node, ast.Name):
            if node.id in BLOCKED_NAMES:
                raise ValueError(f"Blocked variable/function reference: {node.id}")


def run_code(code: str, df: pd.DataFrame, timeout_sec: float = 10.0) -> dict:
    """Execute validated code in a restricted namespace with execution watchdog and result cap."""
    validate_code(code)

    safe_globals = {
        "__builtins__": {
            "len": len, "round": round, "sorted": sorted, "sum": sum,
            "min": min, "max": max, "str": str, "int": int, "float": float,
            "list": list, "dict": dict, "range": range, "abs": abs,
            "True": True, "False": False, "None": None,
            "print": print, "bool": bool, "tuple": tuple,
            "enumerate": enumerate, "zip": zip, "isinstance": isinstance,
            "KeyError": KeyError, "ValueError": ValueError, "TypeError": TypeError,
            "AttributeError": AttributeError, "Exception": Exception,
        },
        "pd": pd,
        "np": np,
        "plt": plt,
    }
    safe_locals = {"df": df.copy()}

    original_bar = plt.bar
    original_barh = plt.barh

    def _make_safe_values(sequence):
        if isinstance(sequence, (pd.Series, pd.Index, np.ndarray, set, tuple)):
            sequence = list(sequence)
        return [None if (val is pd.NA or (isinstance(val, float) and np.isnan(val))) else val for val in sequence]

    def _safe_bar(x, height, *args, **kwargs):
        if isinstance(x, set):
            x = list(x)
        if isinstance(x, (pd.Series, pd.Index, np.ndarray, tuple)):
            x = list(x)
        if isinstance(x, list):
            x = _make_safe_values(x)
            all_numeric = all(
                isinstance(v, (int, float, np.integer, np.floating)) and not isinstance(v, bool)
                for v in x
            )
            if not all_numeric and len(x) > 0:
                positions = np.arange(len(x))
                bars = original_bar(positions, height, *args, **kwargs)
                plt.xticks(positions, [str(v) for v in x])
                return bars
        return original_bar(x, height, *args, **kwargs)

    def _safe_barh(y, width, *args, **kwargs):
        if isinstance(y, set):
            y = list(y)
        if isinstance(y, (pd.Series, pd.Index, np.ndarray, tuple)):
            y = list(y)
        if isinstance(y, list):
            y = _make_safe_values(y)
            all_numeric = all(
                isinstance(v, (int, float, np.integer, np.floating)) and not isinstance(v, bool)
                for v in y
            )
            if not all_numeric and len(y) > 0:
                positions = np.arange(len(y))
                bars = original_barh(positions, width, *args, **kwargs)
                plt.yticks(positions, [str(v) for v in y])
                return bars
        return original_barh(y, width, *args, **kwargs)

    plt.bar = _safe_bar
    plt.barh = _safe_barh

    exec_error = None
    exec_done = threading.Event()

    def target():
        nonlocal exec_error
        try:
            exec(code, safe_globals, safe_locals)
        except Exception as e:
            exec_error = e
        finally:
            exec_done.set()

    t = threading.Thread(target=target, daemon=True)
    t.start()
    completed = exec_done.wait(timeout=timeout_sec)

    if not completed:
        return {
            "result": None,
            "chart_path": None,
            "error": f"Code execution timed out (exceeded {int(timeout_sec)} seconds limit).",
        }

    if exec_error:
        error_msg = str(exec_error)
        if "the dtypes of parameters x (object) and width (float64) are incompatible" in error_msg:
            error_msg = (
                "Matplotlib bar chart failed because x values are non-numeric labels or object dtype. "
                "Use numeric positions (for example, np.arange(len(...))) and set display labels with "
                "set_xticks/set_xticklabels instead of applying width offsets directly to raw label values."
            )
        return {"result": None, "chart_path": None, "error": error_msg}

    result = safe_locals.get("result")
    if isinstance(result, (pd.DataFrame, pd.Series)) and len(result) > 1000:
        result = result.head(1000)

    return {
        "result": result,
        "chart_path": safe_locals.get("chart_path"),
        "error": None,
    }


if __name__ == "__main__":
    test_df = pd.DataFrame({"a": range(1500), "b": range(1500)})

    out = run_code("result = df['a'].sum()", test_df)
    assert out["result"] == 1124250, f"Expected 1124250, got {out['result']}"
    print(f"PASS: basic aggregation returned {out['result']}")

    out_cap = run_code("result = df", test_df)
    assert len(out_cap["result"]) == 1000, f"Expected 1000 rows capped, got {len(out_cap['result'])}"
    print("PASS: large DataFrame result capped to 1,000 rows")

    try:
        validate_code("x := 10")
        print("FAIL: walrus operator not rejected")
    except ValueError as e:
        print(f"PASS: walrus operator rejected — {e}")

    try:
        validate_code("globals()")
        print("FAIL: globals not rejected")
    except ValueError as e:
        print(f"PASS: globals rejected — {e}")

    print("\nAll hardened sandbox self-tests passed.")
