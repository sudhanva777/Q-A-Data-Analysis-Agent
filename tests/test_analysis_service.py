import unittest
import pandas as pd

from src.analysis_service import format_table_result, sanitize_for_json, wrap_scalar_as_table


class TestAnalysisServiceFormatting(unittest.TestCase):
    def test_format_table_result_for_list_like_arrow_array(self):
        values = pd.Series(["Bob", "David", "Charlie", "Eve", "Alice"]).unique()
        table = format_table_result(values)

        self.assertEqual(table["columns"], ["index", "0"])
        self.assertEqual(table["shape"], [5, 2])
        self.assertEqual(table["rows"][0]["0"], "Bob")
        self.assertEqual(table["rows"][4]["0"], "Alice")

    def test_wrap_scalar_as_table_for_list_like(self):
        values = pd.Series(["a", "b", "c"]).unique()
        result = wrap_scalar_as_table(values)

        self.assertIsInstance(result, pd.Series)
        self.assertEqual(list(result), ["a", "b", "c"])

    def test_sanitize_for_json_handles_index(self):
        idx = pd.Index(["x", "y", "z"])
        sanitized = sanitize_for_json(idx)
        self.assertEqual(sanitized, ["x", "y", "z"])

    def test_sanitize_for_json_handles_extension_array(self):
        values = pd.array(["A", "B", "C"], dtype="string")
        sanitized = sanitize_for_json(values)
        self.assertEqual(sanitized, ["A", "B", "C"])


if __name__ == "__main__":
    unittest.main()
