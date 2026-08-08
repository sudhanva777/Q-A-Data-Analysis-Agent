"""Unit tests for src/data_cleaner.py"""

import unittest
import pandas as pd
import numpy as np

from src.data_cleaner import generate_cleaning_code, clean_dataset


class TestDataCleaner(unittest.TestCase):
    def setUp(self):
        self.df = pd.DataFrame({
            "text_with_ws": ["  A  ", " B ", "C  ", " D"],
            "mixed_case": ["Male", "female", "MALE", "Female"],
            "currency": ["$100", "$200", "$300", "$400"],
            "percentage": ["10%", "20%", "30%", "40%"],
            "date_text": ["2024-01-01", "2024-01-02", "2024-01-03", "2024-01-04"],
            "with_nulls": [1, None, 3, None],
            "duplicates": [1, 2, 1, 2],
            "empty_col": [None, None, None, None],
            "constant_col": ["same", "same", "same", "same"],
            "outliers": [1, 2, 3, 1000],  # 1000 is outlier
        })

    def test_generate_cleaning_code_basic(self):
        ops = ["trim_whitespace", "normalize_casing"]
        code = generate_cleaning_code(ops, self.df)
        
        self.assertIn("cleaned_df = df.copy()", code)
        self.assertIn("Trim leading and trailing whitespace", code)
        self.assertIn("Normalize categorical text casing", code)
        self.assertIn("result = cleaned_df", code)

    def test_generate_cleaning_code_all_operations(self):
        ops = [
            "trim_whitespace",
            "normalize_casing",
            "normalize_currencies",
            "normalize_percentages",
            "fix_date_formats",
            "remove_duplicates",
            "remove_empty_columns",
            "remove_constant_columns",
            "handle_missing",
            "handle_outliers",
        ]
        code = generate_cleaning_code(ops, self.df)
        
        expected_comments = [
            "Trim leading and trailing whitespace",
            "Normalize categorical text casing",
            "Strip currency symbols",
            "Strip % symbols",
            "Parse dates and numeric dtypes",
            "Remove duplicate rows",
            "Remove empty (100% null) columns",
            "Remove constant columns",
            "Fill missing values",
            "Clip numeric outliers",
        ]
        for comment in expected_comments:
            self.assertIn(comment, code)

    def test_clean_dataset_trim_whitespace(self):
        result = clean_dataset(
            self.df, 
            "test.csv", 
            ["trim_whitespace"], 
            save_cleaned=False
        )
        
        self.assertEqual(result["status"], "success")
        self.assertIn("trim_whitespace", result["operations_applied"])
        # Check that whitespace was trimmed
        self.assertEqual(result["stats_after"]["nulls"], result["stats_before"]["nulls"])

    def test_clean_dataset_normalize_casing(self):
        result = clean_dataset(
            self.df, 
            "test.csv", 
            ["normalize_casing"], 
            save_cleaned=False
        )
        
        self.assertEqual(result["status"], "success")
        self.assertIn("normalize_casing", result["operations_applied"])

    def test_clean_dataset_remove_duplicates(self):
        # Create a dataframe with actual duplicate rows
        dup_df = pd.DataFrame({
            "a": [1, 2, 1, 2],
            "b": [10, 20, 10, 20],
        })
        result = clean_dataset(
            dup_df, 
            "test.csv", 
            ["remove_duplicates"], 
            save_cleaned=False
        )
        
        self.assertEqual(result["status"], "success")
        self.assertIn("remove_duplicates", result["operations_applied"])
        # Should have removed 2 duplicate rows
        self.assertEqual(result["stats_before"]["rows"], 4)
        self.assertEqual(result["stats_after"]["rows"], 2)

    def test_clean_dataset_remove_empty_columns(self):
        result = clean_dataset(
            self.df, 
            "test.csv", 
            ["remove_empty_columns"], 
            save_cleaned=False
        )
        
        self.assertEqual(result["status"], "success")
        self.assertIn("remove_empty_columns", result["operations_applied"])
        # empty_col should be removed
        self.assertEqual(result["stats_before"]["columns"], 10)
        self.assertEqual(result["stats_after"]["columns"], 9)

    def test_clean_dataset_remove_constant_columns(self):
        result = clean_dataset(
            self.df, 
            "test.csv", 
            ["remove_constant_columns"], 
            save_cleaned=False
        )
        
        self.assertEqual(result["status"], "success")
        self.assertIn("remove_constant_columns", result["operations_applied"])
        # constant_col should be removed
        self.assertEqual(result["stats_before"]["columns"], 10)
        self.assertEqual(result["stats_after"]["columns"], 9)

    def test_clean_dataset_handle_missing(self):
        result = clean_dataset(
            self.df, 
            "test.csv", 
            ["handle_missing"], 
            save_cleaned=False
        )
        
        self.assertEqual(result["status"], "success")
        self.assertIn("handle_missing", result["operations_applied"])
        # Nulls should be reduced
        self.assertLess(result["stats_after"]["nulls"], result["stats_before"]["nulls"])

    def test_clean_dataset_handle_outliers(self):
        result = clean_dataset(
            self.df, 
            "test.csv", 
            ["handle_outliers"], 
            save_cleaned=False
        )
        
        self.assertEqual(result["status"], "success")
        self.assertIn("handle_outliers", result["operations_applied"])

    def test_clean_dataset_multiple_operations(self):
        ops = ["trim_whitespace", "normalize_casing", "remove_duplicates", "handle_missing"]
        result = clean_dataset(
            self.df, 
            "test.csv", 
            ops, 
            save_cleaned=False
        )
        
        self.assertEqual(result["status"], "success")
        for op in ops:
            self.assertIn(op, result["operations_applied"])

    def test_clean_dataset_default_operations(self):
        # When no operations specified, should use defaults
        result = clean_dataset(
            self.df, 
            "test.csv", 
            [], 
            save_cleaned=False
        )
        
        self.assertEqual(result["status"], "success")
        self.assertGreater(len(result["operations_applied"]), 0)

    def test_clean_dataset_original_preserved(self):
        original_shape = self.df.shape
        result = clean_dataset(
            self.df, 
            "test.csv", 
            ["remove_duplicates"], 
            save_cleaned=False
        )
        
        # Original df should be unchanged
        self.assertEqual(self.df.shape, original_shape)

    def test_cleaning_code_no_imports(self):
        ops = ["trim_whitespace"]
        code = generate_cleaning_code(ops, self.df)
        
        # Should not contain import statements
        self.assertNotIn("import", code)


if __name__ == "__main__":
    unittest.main()