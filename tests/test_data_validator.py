"""Unit tests for src/data_validator.py"""

import unittest
import pandas as pd
import numpy as np

from src.data_validator import validate_dataset


class TestDataValidator(unittest.TestCase):
    def setUp(self):
        self.df = pd.DataFrame({
            "clean_numeric": [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
            "numeric_with_nulls": [1, None, 3, None, 5, None, 7, None, 9, None],
            "text_col": ["A", "B", "A", "C", "B", "A", "C", "C", "B", "A"],
            "text_with_whitespace": ["  A  ", "B", " A ", "C", "B", "A", "C", "C", "B", "A"],
            "mixed_case": ["Male", "female", "MALE", "Female", "male", "FEMALE", "Male", "female", "MALE", "Female"],
            "duplicate_rows": [1, 2, 3, 4, 5, 1, 2, 3, 4, 5],
            "constant_col": ["same"] * 10,
            "null_only": [None] * 10,
            "date_as_text": ["2024-01-01", "2024-01-02", "2024-01-03", "2024-01-04", "2024-01-05",
                           "2024-01-06", "2024-01-07", "2024-01-08", "2024-01-09", "2024-01-10"],
            "currency_text": ["$100", "$200", "$300", "$400", "$500",
                            "$600", "$700", "$800", "$900", "$1000"],
        })
        # Add duplicate rows - duplicate first 5 rows
        dup_df = pd.concat([self.df.iloc[:5], self.df.iloc[:5]], ignore_index=True)
        self.df = dup_df

    def test_validate_dataset_basic(self):
        result = validate_dataset(self.df)
        
        self.assertIn("total_issues", result)
        self.assertIn("issues", result)
        self.assertIn("summary", result)
        self.assertIsInstance(result["issues"], list)

    def test_missing_values_detection(self):
        result = validate_dataset(self.df)
        
        missing_issues = [i for i in result["issues"] if i["type"] == "Missing Values"]
        self.assertGreater(len(missing_issues), 0)
        
        # Check numeric_with_nulls has missing values issue
        null_col_issue = next((i for i in missing_issues if i["column"] == "numeric_with_nulls"), None)
        self.assertIsNotNone(null_col_issue)
        # After duplicating first 5 rows (2 nulls in first 5), we have 4 nulls in 20 rows
        self.assertEqual(null_col_issue["count"], 4)

    def test_null_only_column_detection(self):
        result = validate_dataset(self.df)
        
        null_only_issues = [i for i in result["issues"] if i["type"] == "Null-Only Column"]
        self.assertEqual(len(null_only_issues), 1)
        self.assertEqual(null_only_issues[0]["column"], "null_only")
        self.assertEqual(null_only_issues[0]["severity"], "HIGH")

    def test_duplicate_rows_detection(self):
        result = validate_dataset(self.df)
        
        dup_issues = [i for i in result["issues"] if i["type"] == "Duplicate Rows"]
        self.assertEqual(len(dup_issues), 1)
        self.assertEqual(dup_issues[0]["count"], 5)  # 5 duplicate rows
        self.assertIn(dup_issues[0]["severity"], ["MEDIUM", "HIGH"])

    def test_constant_column_detection(self):
        result = validate_dataset(self.df)
        
        const_issues = [i for i in result["issues"] if i["type"] == "Constant Column"]
        self.assertEqual(len(const_issues), 1)
        self.assertEqual(const_issues[0]["column"], "constant_col")
        self.assertEqual(const_issues[0]["severity"], "LOW")

    def test_whitespace_detection(self):
        result = validate_dataset(self.df)
        
        ws_issues = [i for i in result["issues"] if i["type"] == "Whitespace Issues"]
        self.assertEqual(len(ws_issues), 1)
        self.assertEqual(ws_issues[0]["column"], "text_with_whitespace")
        self.assertEqual(ws_issues[0]["severity"], "LOW")

    def test_mixed_casing_detection(self):
        result = validate_dataset(self.df)
        
        casing_issues = [i for i in result["issues"] if i["type"] == "Mixed Casing"]
        self.assertEqual(len(casing_issues), 1)
        self.assertEqual(casing_issues[0]["column"], "mixed_case")
        self.assertEqual(casing_issues[0]["severity"], "MEDIUM")

    def test_unparsed_date_detection(self):
        result = validate_dataset(self.df)
        
        date_issues = [i for i in result["issues"] if i["type"] == "Incorrect Data Type" and "date" in i["message"].lower()]
        self.assertEqual(len(date_issues), 1)
        self.assertEqual(date_issues[0]["column"], "date_as_text")
        self.assertEqual(date_issues[0]["severity"], "MEDIUM")

    def test_unparsed_numeric_detection(self):
        result = validate_dataset(self.df)
        
        currency_issues = [i for i in result["issues"] if i["type"] == "Unparsed Numeric"]
        self.assertEqual(len(currency_issues), 1)
        self.assertEqual(currency_issues[0]["column"], "currency_text")
        self.assertEqual(currency_issues[0]["severity"], "MEDIUM")

    def test_outlier_detection(self):
        # Create dataframe with obvious outliers
        outlier_df = pd.DataFrame({
            "normal": list(range(100)),
            "with_outliers": list(range(98)) + [1000, -1000],  # Two extreme outliers
        })
        result = validate_dataset(outlier_df)
        
        iqr_issues = [i for i in result["issues"] if i["type"] == "IQR Outliers"]
        self.assertGreater(len(iqr_issues), 0)
        self.assertEqual(iqr_issues[0]["column"], "with_outliers")

    def test_empty_dataframe(self):
        empty_df = pd.DataFrame()
        result = validate_dataset(empty_df)
        
        self.assertEqual(result["total_issues"], 1)
        self.assertEqual(result["issues"][0]["type"], "Empty Dataset")
        self.assertEqual(result["issues"][0]["severity"], "CRITICAL")

    def test_summary_counts(self):
        result = validate_dataset(self.df)
        
        summary = result["summary"]
        self.assertIn("critical", summary)
        self.assertIn("high", summary)
        self.assertIn("medium", summary)
        self.assertIn("low", summary)
        
        # Total should match
        total = summary["critical"] + summary["high"] + summary["medium"] + summary["low"]
        self.assertEqual(total, result["total_issues"])


if __name__ == "__main__":
    unittest.main()