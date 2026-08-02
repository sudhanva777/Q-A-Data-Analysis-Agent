"""Unit tests for src/sandbox.py — the safety-critical module."""

import unittest
import pandas as pd

from src.sandbox import validate_code, run_code


class TestValidateCode(unittest.TestCase):
    """Test that validate_code rejects unsafe patterns."""

    def test_rejects_import(self):
        with self.assertRaises(ValueError):
            validate_code("import os")

    def test_rejects_from_import(self):
        with self.assertRaises(ValueError):
            validate_code("from os import path")

    def test_rejects_eval(self):
        with self.assertRaises(ValueError):
            validate_code("eval('1+1')")

    def test_rejects_exec(self):
        with self.assertRaises(ValueError):
            validate_code("exec('print(1)')")

    def test_rejects_open(self):
        with self.assertRaises(ValueError):
            validate_code("open('file.txt')")

    def test_rejects___import__(self):
        with self.assertRaises(ValueError):
            validate_code("__import__('os')")

    def test_rejects_compile(self):
        with self.assertRaises(ValueError):
            validate_code("compile('1+1', '<string>', 'exec')")

    def test_rejects_dunder_access(self):
        with self.assertRaises(ValueError):
            validate_code("df.__class__")

    def test_rejects_dunder_getattr(self):
        with self.assertRaises(ValueError):
            validate_code("x = df.__dict__")

    def test_rejects_globals_and_reflection(self):
        with self.assertRaises(ValueError):
            validate_code("globals()")
        with self.assertRaises(ValueError):
            validate_code("locals()")
        with self.assertRaises(ValueError):
            validate_code("getattr(df, 'head')")

    def test_accepts_valid_pandas_code(self):
        validate_code("result = df['a'].sum()")

    def test_accepts_groupby(self):
        validate_code("result = df.groupby('region')['sales'].mean()")

    def test_accepts_plt_savefig(self):
        validate_code(
            "df.plot(kind='bar')\nplt.savefig('outputs/chart.png')\n"
            "chart_path = 'outputs/chart.png'"
        )


class TestRunCode(unittest.TestCase):
    """Test that run_code executes safely, respects timeouts, and caps results."""

    def setUp(self):
        self.df = pd.DataFrame({
            "region": ["East", "West", "East", "West"],
            "sales": [100, 200, 150, 250],
        })

    def test_basic_aggregation(self):
        out = run_code("result = df['sales'].sum()", self.df)
        self.assertIsNone(out["error"])
        self.assertEqual(out["result"], 700)

    def test_groupby(self):
        out = run_code(
            "result = df.groupby('region')['sales'].sum()", self.df
        )
        self.assertIsNone(out["error"])
        self.assertEqual(out["result"]["East"], 250)
        self.assertEqual(out["result"]["West"], 450)

    def test_result_default_none(self):
        out = run_code("x = 42", self.df)
        self.assertIsNone(out["result"])

    def test_runtime_error_returns_error_message(self):
        out = run_code("result = df['nonexistent'].sum()", self.df)
        self.assertIsNotNone(out["error"])
        self.assertIn("nonexistent", out["error"])

    def test_df_is_copied(self):
        run_code("df['new_col'] = 1\nresult = df['new_col'].sum()", self.df)
        self.assertNotIn("new_col", self.df.columns)

    def test_import_blocked_at_runtime(self):
        with self.assertRaises(ValueError):
            run_code("import os\nresult = 1", self.df)

    def test_result_row_capping(self):
        large_df = pd.DataFrame({"a": range(1200)})
        out = run_code("result = df", large_df)
        self.assertEqual(len(out["result"]), 1000)

    def test_execution_timeout(self):
        sleep_code = "import time\ntime.sleep(2)"  # validate_code blocks import
        # Testing loop timeout via busy-wait loop that passes AST validation
        busy_code = "i = 0\nwhile True:\n    i += 1"
        out = run_code(busy_code, self.df, timeout_sec=0.2)
        self.assertIsNotNone(out["error"])
        self.assertIn("timed out", out["error"].lower())


if __name__ == "__main__":
    unittest.main()
