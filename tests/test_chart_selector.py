"""Unit tests for src/chart_selector.py"""

import unittest
import pandas as pd
import numpy as np

from src.chart_selector import select_and_build_chart


class TestChartSelector(unittest.TestCase):
    def test_empty_payload(self):
        result = select_and_build_chart(None)
        self.assertIsNone(result)
        
        result = select_and_build_chart({})
        self.assertIsNone(result)
        
        result = select_and_build_chart({"columns": [], "rows": []})
        self.assertIsNone(result)

    def test_single_numeric_column_histogram(self):
        table_payload = {
            "columns": ["values"],
            "rows": [{"values": i} for i in range(20)]
        }
        
        result = select_and_build_chart(table_payload, "Show distribution")
        
        self.assertIsNotNone(result)
        self.assertEqual(result["type"], "bar")
        self.assertIn("Distribution", result["title"])
        self.assertEqual(result["xKey"], "name")
        self.assertEqual(result["yKey"], "value")
        self.assertGreater(len(result["data"]), 0)

    def test_single_column_insufficient_data(self):
        table_payload = {
            "columns": ["values"],
            "rows": [{"values": 1}, {"values": 2}]  # Only 2 values
        }
        
        result = select_and_build_chart(table_payload)
        self.assertIsNone(result)

    def test_two_columns_bar_chart(self):
        table_payload = {
            "columns": ["category", "value"],
            "rows": [
                {"category": "A", "value": 10},
                {"category": "B", "value": 20},
                {"category": "C", "value": 15},
            ]
        }
        
        result = select_and_build_chart(table_payload, "Compare categories")
        
        self.assertIsNotNone(result)
        self.assertEqual(result["type"], "bar")
        self.assertEqual(len(result["data"]), 3)
        self.assertEqual(result["data"][0]["name"], "A")
        self.assertEqual(result["data"][0]["value"], 10)

    def test_time_series_line_chart(self):
        table_payload = {
            "columns": ["date", "sales"],
            "rows": [
                {"date": "2024-01", "sales": 100},
                {"date": "2024-02", "sales": 150},
                {"date": "2024-03", "sales": 120},
            ]
        }
        
        result = select_and_build_chart(table_payload, "Show sales trend over time")
        
        self.assertIsNotNone(result)
        self.assertEqual(result["type"], "line")

    def test_pie_chart_proportion(self):
        table_payload = {
            "columns": ["category", "share"],
            "rows": [
                {"category": "A", "share": 40},
                {"category": "B", "share": 35},
                {"category": "C", "share": 25},
            ]
        }
        
        result = select_and_build_chart(table_payload, "Show proportion by category")
        
        self.assertIsNotNone(result)
        self.assertEqual(result["type"], "pie")

    def test_scatter_chart(self):
        table_payload = {
            "columns": ["x", "y"],
            "rows": [
                {"x": 1, "y": 2},
                {"x": 2, "y": 4},
                {"x": 3, "y": 6},
            ]
        }
        
        result = select_and_build_chart(table_payload, "Show scatter plot correlation")
        
        self.assertIsNotNone(result)
        self.assertEqual(result["type"], "scatter")
        self.assertEqual(result["xKey"], "x")
        self.assertEqual(result["yKey"], "y")

    def test_correlation_matrix_heatmap(self):
        table_payload = {
            "columns": ["", "A", "B", "C"],
            "rows": [
                {"": "A", "A": 1.0, "B": 0.5, "C": -0.2},
                {"": "B", "A": 0.5, "B": 1.0, "C": 0.3},
                {"": "C", "A": -0.2, "B": 0.3, "C": 1.0},
            ]
        }
        
        result = select_and_build_chart(table_payload, "Show correlation matrix")
        
        self.assertIsNotNone(result)
        self.assertEqual(result["type"], "heatmap")
        self.assertEqual(len(result["data"]), 9)  # 3x3 matrix
        self.assertEqual(result["data"][0]["x"], "A")
        self.assertEqual(result["data"][0]["y"], "A")
        self.assertEqual(result["data"][0]["value"], 1.0)

    def test_heatmap_with_different_column_names(self):
        table_payload = {
            "columns": ["variable", "var1", "var2", "var3"],
            "rows": [
                {"variable": "var1", "var1": 1.0, "var2": 0.8, "var3": 0.3},
                {"variable": "var2", "var1": 0.8, "var2": 1.0, "var3": 0.5},
                {"variable": "var3", "var1": 0.3, "var2": 0.5, "var3": 1.0},
            ]
        }
        
        result = select_and_build_chart(table_payload, "Correlation heatmap")
        
        self.assertIsNotNone(result)
        self.assertEqual(result["type"], "heatmap")

    def test_not_square_matrix_no_heatmap(self):
        # Not square - should fall back to bar chart
        table_payload = {
            "columns": ["", "A", "B"],
            "rows": [
                {"": "A", "A": 1.0, "B": 0.5},
                {"": "B", "A": 0.5, "B": 1.0},
                {"": "C", "A": -0.2, "B": 0.3},  # Extra row
            ]
        }
        
        result = select_and_build_chart(table_payload, "Show data")
        
        self.assertIsNotNone(result)
        # Should be bar chart (default), not heatmap
        self.assertEqual(result["type"], "bar")

    def test_multiple_series_in_chart(self):
        table_payload = {
            "columns": ["month", "sales", "profit", "expenses"],
            "rows": [
                {"month": "Jan", "sales": 100, "profit": 20, "expenses": 80},
                {"month": "Feb", "sales": 150, "profit": 30, "expenses": 120},
                {"month": "Mar", "sales": 120, "profit": 25, "expenses": 95},
            ]
        }
        
        result = select_and_build_chart(table_payload, "Show monthly metrics")
        
        self.assertIsNotNone(result)
        self.assertIn("sales", result["seriesKeys"])
        self.assertIn("profit", result["seriesKeys"])
        self.assertIn("expenses", result["seriesKeys"])

    def test_config_included(self):
        table_payload = {
            "columns": ["x", "y"],
            "rows": [{"x": "A", "y": 10}, {"x": "B", "y": 20}]
        }
        
        result = select_and_build_chart(table_payload)
        
        self.assertIn("config", result)
        self.assertIn("xAxisLabel", result["config"])
        self.assertIn("yAxisLabel", result["config"])

    def test_non_numeric_y_values(self):
        table_payload = {
            "columns": ["cat", "val"],
            "rows": [
                {"cat": "A", "val": "not_a_number"},
                {"cat": "B", "val": 20},
            ]
        }
        
        result = select_and_build_chart(table_payload)
        
        # Should handle gracefully - non-numeric becomes 0
        self.assertIsNotNone(result)
        self.assertEqual(result["data"][0]["value"], 0.0)
        self.assertEqual(result["data"][1]["value"], 20.0)


if __name__ == "__main__":
    unittest.main()