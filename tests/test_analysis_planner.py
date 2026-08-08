"""Unit tests for src/analysis_planner.py"""

import unittest
import os
import pandas as pd
from unittest.mock import patch, MagicMock

from src.analysis_planner import create_analysis_plan, is_planner_enabled


class TestAnalysisPlanner(unittest.TestCase):
    def setUp(self):
        self.df = pd.DataFrame({
            "region": ["East", "West", "East", "West", "North", "South"],
            "sales": [100, 200, 150, 250, 300, 180],
            "product": ["A", "B", "A", "C", "B", "A"],
            "date": pd.date_range("2024-01-01", periods=6, freq="ME"),
        })
        
        self.schema_summary = """=== DATASET SUMMARY: test.csv ===
Dimensions: 6 rows, 4 columns
Memory: 1.2 KB
Quality Score: 100/100 (Excellent)
Duplicates: 0 (0.0%)
Overall Missing Cells: 0 (0.0%)

COLUMN DETAILS & DISTRIBUTIONS:
  - 'region' (object): 4 unique values, 0 nulls (0.0%) | top: 'East': 2, 'West': 2, 'North': 1
  - 'sales' (int64): 6 unique values, 0 nulls (0.0%) | min=100, max=300, mean=196.67, median=190.0
  - 'product' (object): 3 unique values, 0 nulls (0.0%) | top: 'A': 3, 'B': 2, 'C': 1
  - 'date' (datetime64[ns]): 6 unique values, 0 nulls (0.0%) | date range: 2024-01-31 to 2024-06-30

FIRST 3 ROWS SAMPLE:
|    | region   |   sales | product   | date       |
|---:|:---------|--------:|:----------|:-----------|
|  0 | East     |     100 | A         | 2024-01-31 |
|  1 | West     |     200 | B         | 2024-02-29 |
|  2 | East     |     150 | A         | 2024-03-31 |"""

    def test_is_planner_enabled_false_by_default(self):
        # Ensure env var is not set
        if "ENABLE_PLANNER" in os.environ:
            del os.environ["ENABLE_PLANNER"]
        
        self.assertFalse(is_planner_enabled())

    def test_is_planner_enabled_true(self):
        os.environ["ENABLE_PLANNER"] = "true"
        self.assertTrue(is_planner_enabled())
        
        os.environ["ENABLE_PLANNER"] = "1"
        self.assertTrue(is_planner_enabled())
        
        os.environ["ENABLE_PLANNER"] = "yes"
        self.assertTrue(is_planner_enabled())

    def test_is_planner_enabled_false_values(self):
        os.environ["ENABLE_PLANNER"] = "false"
        self.assertFalse(is_planner_enabled())
        
        os.environ["ENABLE_PLANNER"] = "0"
        self.assertFalse(is_planner_enabled())
        
        os.environ["ENABLE_PLANNER"] = "no"
        self.assertFalse(is_planner_enabled())

    def test_create_analysis_plan_disabled(self):
        if "ENABLE_PLANNER" in os.environ:
            del os.environ["ENABLE_PLANNER"]
        
        plan = create_analysis_plan("Show sales by region", self.schema_summary, self.df)
        
        self.assertEqual(plan["enabled"], False)
        self.assertEqual(plan["intent"], "direct_execution")
        self.assertIn("Direct query execution", plan["plan_summary"])

    @patch("src.analysis_planner.client")
    def test_create_analysis_plan_enabled(self, mock_client):
        os.environ["ENABLE_PLANNER"] = "true"
        
        # Mock the Groq API response
        mock_response = MagicMock()
        mock_response.choices[0].message.content = '{"intent": "aggregation", "relevant_columns": ["region", "sales"], "need_cleaning": false, "need_aggregation": true, "need_statistical_analysis": false, "need_visualization": true, "chart_type_recommendation": "bar", "plan_summary": "Group by region, calculate sum of sales, and plot a bar chart."}'
        mock_client.chat.completions.create.return_value = mock_response
        
        plan = create_analysis_plan("Show sales by region", self.schema_summary, self.df)
        
        self.assertEqual(plan["enabled"], True)
        self.assertEqual(plan["intent"], "aggregation")
        self.assertEqual(plan["relevant_columns"], ["region", "sales"])
        self.assertEqual(plan["need_aggregation"], True)
        self.assertEqual(plan["need_visualization"], True)
        self.assertEqual(plan["chart_type_recommendation"], "bar")
        
        # Verify the API was called
        mock_client.chat.completions.create.assert_called_once()

    @patch("src.analysis_planner.client")
    def test_create_analysis_plan_handles_error(self, mock_client):
        os.environ["ENABLE_PLANNER"] = "true"
        
        # Mock API error
        mock_client.chat.completions.create.side_effect = Exception("API Error")
        
        plan = create_analysis_plan("Show sales by region", self.schema_summary, self.df)
        
        # Should fallback gracefully
        self.assertEqual(plan["enabled"], False)
        self.assertEqual(plan["intent"], "direct_execution")
        self.assertIn("Fallback plan due to planner error", plan["plan_summary"])

    @patch("src.analysis_planner.client")
    def test_create_analysis_plan_json_parse_error(self, mock_client):
        os.environ["ENABLE_PLANNER"] = "true"
        
        # Mock invalid JSON response
        mock_response = MagicMock()
        mock_response.choices[0].message.content = "Not valid JSON"
        mock_client.chat.completions.create.return_value = mock_response
        
        plan = create_analysis_plan("Show sales by region", self.schema_summary, self.df)
        
        # Should fallback gracefully
        self.assertEqual(plan["enabled"], False)

    def test_create_analysis_plan_with_time_series(self):
        os.environ["ENABLE_PLANNER"] = "true"
        
        with patch("src.analysis_planner.client") as mock_client:
            mock_response = MagicMock()
            mock_response.choices[0].message.content = '{"intent": "trend", "relevant_columns": ["date", "sales"], "need_cleaning": false, "need_aggregation": false, "need_statistical_analysis": false, "need_visualization": true, "chart_type_recommendation": "line", "plan_summary": "Plot sales trend over time."}'
            mock_client.chat.completions.create.return_value = mock_response
            
            plan = create_analysis_plan("Show sales trend over time", self.schema_summary, self.df)
            
            self.assertEqual(plan["intent"], "trend")
            self.assertEqual(plan["chart_type_recommendation"], "line")

    def test_planner_uses_correct_model(self):
        os.environ["ENABLE_PLANNER"] = "true"
        
        with patch("src.analysis_planner.client") as mock_client:
            mock_response = MagicMock()
            mock_response.choices[0].message.content = '{"intent": "test", "relevant_columns": [], "need_cleaning": false, "need_aggregation": false, "need_statistical_analysis": false, "need_visualization": false, "chart_type_recommendation": "none", "plan_summary": "test"}'
            mock_client.chat.completions.create.return_value = mock_response
            
            create_analysis_plan("test", self.schema_summary, self.df)
            
            call_args = mock_client.chat.completions.create.call_args
            self.assertEqual(call_args.kwargs["model"], "llama-3.3-70b-versatile")
            self.assertEqual(call_args.kwargs["temperature"], 0)
            self.assertEqual(call_args.kwargs["response_format"], {"type": "json_object"})


if __name__ == "__main__":
    unittest.main()