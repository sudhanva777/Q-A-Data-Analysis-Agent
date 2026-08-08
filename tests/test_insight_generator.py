"""Unit tests for src/insight_generator.py"""

import unittest
import pandas as pd
import numpy as np

from src.insight_generator import generate_auto_insights
from src.data_profiler import profile_dataset


class TestInsightGenerator(unittest.TestCase):
    def setUp(self):
        self.df = pd.DataFrame({
            "numeric_1": range(100),
            "numeric_2": [x * 2 + 5 for x in range(100)],
            "category": ["A", "B", "C"] * 33 + ["A"],
            "date": pd.date_range("2024-01-01", periods=100, freq="D"),
            "with_nulls": [1 if i % 5 != 0 else None for i in range(100)],
            "constant": ["same"] * 100,
        })
        
        self.profile = profile_dataset(self.df, dataset_name="test.csv", log_audit=False)

    def test_generate_auto_insights_basic(self):
        insights = generate_auto_insights(self.df, "test.csv", self.profile, log_audit=False)
        
        self.assertEqual(insights["status"], "success")
        self.assertEqual(insights["dataset_name"], "test.csv")
        self.assertIn("insights", insights)
        self.assertIn("total_insights", insights)
        self.assertGreater(insights["total_insights"], 0)

    def test_insights_contain_overview(self):
        insights = generate_auto_insights(self.df, "test.csv", self.profile, log_audit=False)
        
        categories = [i["category"] for i in insights["insights"]]
        self.assertIn("Dataset Overview", categories)

    def test_insights_contain_missing_data(self):
        insights = generate_auto_insights(self.df, "test.csv", self.profile, log_audit=False)
        
        categories = [i["category"] for i in insights["insights"]]
        self.assertIn("Missing Data Summary", categories)

    def test_insights_contain_extremes(self):
        insights = generate_auto_insights(self.df, "test.csv", self.profile, log_audit=False)
        
        categories = [i["category"] for i in insights["insights"]]
        self.assertIn("Highest & Lowest Values", categories)

    def test_insights_contain_correlations(self):
        insights = generate_auto_insights(self.df, "test.csv", self.profile, log_audit=False)
        
        # numeric_1 and numeric_2 are perfectly correlated (r=1.0)
        categories = [i["category"] for i in insights["insights"]]
        self.assertIn("Strong Correlations", categories)

    def test_insights_contain_outliers(self):
        # Create df with outliers
        outlier_df = pd.DataFrame({
            "normal": list(range(100)),
            "outlier_col": list(range(98)) + [1000, -1000],  # 100 values total
        })
        profile = profile_dataset(outlier_df, dataset_name="outliers.csv", log_audit=False)
        insights = generate_auto_insights(outlier_df, "outliers.csv", profile, log_audit=False)
        
        categories = [i["category"] for i in insights["insights"]]
        self.assertIn("Potential Outliers", categories)

    def test_insights_contain_category_distribution(self):
        insights = generate_auto_insights(self.df, "test.csv", self.profile, log_audit=False)
        
        categories = [i["category"] for i in insights["insights"]]
        self.assertIn("Category Distribution", categories)

    def test_insights_contain_business_recommendations(self):
        insights = generate_auto_insights(self.df, "test.csv", self.profile, log_audit=False)
        
        categories = [i["category"] for i in insights["insights"]]
        self.assertIn("Potential Business Insights", categories)

    def test_empty_dataframe(self):
        empty_df = pd.DataFrame()
        insights = generate_auto_insights(empty_df, "empty.csv", log_audit=False)
        
        self.assertEqual(insights["status"], "error")
        self.assertEqual(insights["message"], "Dataset is empty.")
        self.assertEqual(insights["insights"], [])

    def test_perfect_completeness_insight(self):
        clean_df = pd.DataFrame({"a": range(10), "b": range(10, 20)})
        profile = profile_dataset(clean_df, dataset_name="clean.csv", log_audit=False)
        insights = generate_auto_insights(clean_df, "clean.csv", profile, log_audit=False)
        
        missing_insight = next((i for i in insights["insights"] if i["category"] == "Missing Data Summary"), None)
        self.assertIsNotNone(missing_insight)
        self.assertEqual(missing_insight["type"], "success")
        self.assertIn("Perfect completeness", missing_insight["description"])

    def test_high_missingness_warning(self):
        messy_df = pd.DataFrame({"a": [1, None, None, None, 5] * 20})
        profile = profile_dataset(messy_df, dataset_name="messy.csv", log_audit=False)
        insights = generate_auto_insights(messy_df, "messy.csv", profile, log_audit=False)
        
        missing_insight = next((i for i in insights["insights"] if i["category"] == "Missing Data Summary"), None)
        self.assertIsNotNone(missing_insight)
        self.assertEqual(missing_insight["type"], "warning")

    def test_insight_structure(self):
        insights = generate_auto_insights(self.df, "test.csv", self.profile, log_audit=False)
        
        for insight in insights["insights"]:
            self.assertIn("category", insight)
            self.assertIn("title", insight)
            self.assertIn("description", insight)
            self.assertIn("icon", insight)
            self.assertIn("type", insight)
            self.assertIn(insight["type"], ["info", "warning", "success", "error"])


if __name__ == "__main__":
    unittest.main()