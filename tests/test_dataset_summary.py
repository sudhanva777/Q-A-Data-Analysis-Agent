"""Unit tests for src/dataset_summary.py"""

import unittest
import pandas as pd
import numpy as np

from src.dataset_summary import build_rich_dataset_summary
from src.data_profiler import profile_dataset
from src.quality_score import calculate_quality_score
from src.data_validator import validate_dataset


class TestDatasetSummary(unittest.TestCase):
    def setUp(self):
        self.df = pd.DataFrame({
            "numeric": [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
            "category": ["A", "B", "A", "C", "B", "A", "C", "C", "B", "A"],
            "date": pd.date_range("2024-01-01", periods=10, freq="D"),
            "with_nulls": [1, None, 3, None, 5, None, 7, None, 9, None],
        })
        
        self.profile = profile_dataset(self.df, dataset_name="test.csv", log_audit=False)
        val_report = validate_dataset(self.df)
        self.quality = calculate_quality_score(self.df, val_report)

    def test_build_rich_dataset_summary_basic(self):
        summary = build_rich_dataset_summary(
            self.df, 
            dataset_name="test.csv", 
            profile=self.profile, 
            quality=self.quality
        )
        
        self.assertIsInstance(summary, str)
        self.assertIn("DATASET SUMMARY", summary)
        self.assertIn("test.csv", summary)
        self.assertIn("10 rows", summary)
        self.assertIn("4 columns", summary)

    def test_summary_includes_quality_score(self):
        summary = build_rich_dataset_summary(
            self.df, 
            dataset_name="test.csv", 
            profile=self.profile, 
            quality=self.quality
        )
        
        self.assertIn(str(self.quality["score"]), summary)
        self.assertIn(self.quality["status"], summary)

    def test_summary_includes_column_details(self):
        summary = build_rich_dataset_summary(
            self.df, 
            dataset_name="test.csv", 
            profile=self.profile, 
            quality=self.quality
        )
        
        for col in self.df.columns:
            self.assertIn(col, summary)

    def test_summary_includes_numeric_stats(self):
        summary = build_rich_dataset_summary(
            self.df, 
            dataset_name="test.csv", 
            profile=self.profile, 
            quality=self.quality
        )
        
        # Should include min, max, mean, median for numeric column
        self.assertIn("min=", summary)
        self.assertIn("max=", summary)
        self.assertIn("mean=", summary)
        self.assertIn("median=", summary)

    def test_summary_includes_date_range(self):
        summary = build_rich_dataset_summary(
            self.df, 
            dataset_name="test.csv", 
            profile=self.profile, 
            quality=self.quality
        )
        
        self.assertIn("date range", summary.lower())
        self.assertIn("2024-01-01", summary)
        self.assertIn("2024-01-10", summary)

    def test_summary_includes_correlations(self):
        # Create df with correlated columns
        corr_df = pd.DataFrame({
            "a": range(100),
            "b": [x * 2 for x in range(100)],
            "c": [x + 10 for x in range(100)],
        })
        profile = profile_dataset(corr_df, dataset_name="corr.csv", log_audit=False)
        val_report = validate_dataset(corr_df)
        quality = calculate_quality_score(corr_df, val_report)
        
        summary = build_rich_dataset_summary(
            corr_df, 
            dataset_name="corr.csv", 
            profile=profile, 
            quality=quality
        )
        
        self.assertIn("CORRELATION", summary.upper())

    def test_summary_includes_special_columns(self):
        special_df = pd.DataFrame({
            "constant": ["same"] * 10,
            "empty": [None] * 10,
            "ws_issues": [" A ", "B ", " C", " D", " E", " F", " G", " H", " I", " J"],
            "mixed_case": ["Male", "female", "MALE", "Female", "male", "FEMALE", "Male", "female", "MALE", "Female"],
        })
        profile = profile_dataset(special_df, dataset_name="special.csv", log_audit=False)
        val_report = validate_dataset(special_df)
        quality = calculate_quality_score(special_df, val_report)
        
        summary = build_rich_dataset_summary(
            special_df, 
            dataset_name="special.csv", 
            profile=profile, 
            quality=quality
        )
        
        self.assertIn("Constant Columns", summary)
        self.assertIn("Empty Columns", summary)
        self.assertIn("Whitespace Issues", summary)
        self.assertIn("Mixed Text Casing", summary)

    def test_summary_includes_sample_rows(self):
        summary = build_rich_dataset_summary(
            self.df, 
            dataset_name="test.csv", 
            profile=self.profile, 
            quality=self.quality
        )
        
        self.assertIn("FIRST 3 ROWS SAMPLE", summary)
        # Should have markdown table
        self.assertIn("|", summary)

    def test_summary_truncation(self):
        # Create a large dataframe to test truncation
        large_df = pd.DataFrame({f"col_{i}": range(100) for i in range(50)})
        profile = profile_dataset(large_df, dataset_name="large.csv", log_audit=False)
        val_report = validate_dataset(large_df)
        quality = calculate_quality_score(large_df, val_report)
        
        summary = build_rich_dataset_summary(
            large_df, 
            dataset_name="large.csv", 
            profile=profile, 
            quality=quality
        )
        
        # Should be truncated at ~6000 chars
        self.assertLessEqual(len(summary), 6500)

    def test_summary_without_profile_quality(self):
        # Should auto-generate profile and quality if not provided
        summary = build_rich_dataset_summary(self.df, dataset_name="test.csv")
        
        self.assertIsInstance(summary, str)
        self.assertIn("DATASET SUMMARY", summary)
        self.assertIn("test.csv", summary)


if __name__ == "__main__":
    unittest.main()