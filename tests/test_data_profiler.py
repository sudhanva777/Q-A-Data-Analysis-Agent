"""Unit tests for src/data_profiler.py"""

import unittest
import pandas as pd
import numpy as np

from src.data_profiler import profile_dataset


class TestDataProfiler(unittest.TestCase):
    def setUp(self):
        self.df = pd.DataFrame({
            "numeric_col": [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
            "text_col": ["A", "B", "A", "C", "B", "A", "C", "C", "B", "A"],
            "date_col": pd.date_range("2024-01-01", periods=10, freq="D"),
            "null_col": [1, None, 3, None, 5, None, 7, None, 9, None],
            "constant_col": ["same"] * 10,
        })

    def test_profile_dataset_basic(self):
        profile = profile_dataset(self.df, dataset_name="test.csv", log_audit=False)
        
        self.assertEqual(profile["dataset_name"], "test.csv")
        self.assertEqual(profile["dimensions"]["rows"], 10)
        self.assertEqual(profile["dimensions"]["columns"], 5)
        self.assertIn("memory", profile)
        self.assertIn("duplication", profile)
        self.assertIn("missingness", profile)
        self.assertIn("columns", profile)
        self.assertIn("correlations", profile)
        self.assertIn("special_columns", profile)
        self.assertIn("has_time_series", profile)

    def test_missingness_calculation(self):
        profile = profile_dataset(self.df, dataset_name="test.csv", log_audit=False)
        
        # null_col has 5 nulls out of 10
        null_col_meta = profile["columns"]["null_col"]
        self.assertEqual(null_col_meta["null_count"], 5)
        self.assertEqual(null_col_meta["null_pct"], 50.0)
        
        # Overall missing: 5 nulls in null_col / 50 total cells = 10%
        self.assertEqual(profile["missingness"]["overall_missing_pct"], 10.0)

    def test_constant_column_detection(self):
        profile = profile_dataset(self.df, dataset_name="test.csv", log_audit=False)
        
        self.assertIn("constant_col", profile["special_columns"]["constant_columns"])

    def test_numeric_statistics(self):
        profile = profile_dataset(self.df, dataset_name="test.csv", log_audit=False)
        
        numeric_meta = profile["columns"]["numeric_col"]
        self.assertIn("stats", numeric_meta)
        stats = numeric_meta["stats"]
        self.assertEqual(stats["min"], 1)
        self.assertEqual(stats["max"], 10)
        self.assertAlmostEqual(stats["mean"], 5.5)
        self.assertEqual(stats["median"], 5.5)

    def test_date_range_detection(self):
        profile = profile_dataset(self.df, dataset_name="test.csv", log_audit=False)
        
        date_meta = profile["columns"]["date_col"]
        self.assertIn("date_stats", date_meta)
        self.assertEqual(date_meta["date_stats"]["range_days"], 9)

    def test_correlation_matrix(self):
        profile = profile_dataset(self.df, dataset_name="test.csv", log_audit=False)
        
        # Should have correlation between numeric_col and null_col (both numeric)
        self.assertIn("numeric_col", profile["correlations"])
        self.assertIn("null_col", profile["correlations"])

    def test_special_column_flags(self):
        profile = profile_dataset(self.df, dataset_name="test.csv", log_audit=False)
        
        special = profile["special_columns"]
        self.assertIn("constant_col", special["constant_columns"])
        # null_col is not empty (only 50% null), so should not be in empty_columns
        self.assertNotIn("null_col", special["empty_columns"])
        # Create a truly empty column
        empty_df = self.df.copy()
        empty_df["truly_empty"] = [None] * 10
        profile2 = profile_dataset(empty_df, dataset_name="test2.csv", log_audit=False)
        self.assertIn("truly_empty", profile2["special_columns"]["empty_columns"])

    def test_time_series_detection(self):
        profile = profile_dataset(self.df, dataset_name="test.csv", log_audit=False)
        
        # date_col should be detected as time series
        self.assertTrue(profile["has_time_series"])

    def test_categorical_distributions(self):
        profile = profile_dataset(self.df, dataset_name="test.csv", log_audit=False)
        
        text_meta = profile["columns"]["text_col"]
        self.assertIn("top_categories", text_meta)
        self.assertEqual(len(text_meta["top_categories"]), 3)  # A, B, C

    def test_empty_dataframe(self):
        empty_df = pd.DataFrame()
        profile = profile_dataset(empty_df, dataset_name="empty.csv", log_audit=False)
        
        self.assertEqual(profile["dimensions"]["rows"], 0)
        self.assertEqual(profile["dimensions"]["columns"], 0)


if __name__ == "__main__":
    unittest.main()