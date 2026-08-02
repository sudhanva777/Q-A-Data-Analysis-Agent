import os
import tempfile
import unittest

import pandas as pd
from fastapi.testclient import TestClient

from api import app

class TestAPIEndpoints(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app)

    def test_health_endpoint(self):
        response = self.client.get("/health")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["status"], "ok")
        self.assertIn("model", data)

    def test_list_datasets_endpoint(self):
        response = self.client.get("/datasets")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["status"], "success")
        self.assertIsInstance(data["datasets"], list)

    def test_dataset_details_endpoint(self):
        if os.path.exists("data/sales_data.csv"):
            response = self.client.get("/datasets/sales_data.csv")
            self.assertEqual(response.status_code, 200)
            data = response.json()
            self.assertEqual(data["status"], "success")
            self.assertIn("record_count", data)
            self.assertIn("preview", data)

    def test_dataset_details_endpoint_handles_missing_values(self):
        temp_dir = os.path.abspath("data")
        os.makedirs(temp_dir, exist_ok=True)
        temp_path = os.path.join(temp_dir, "test_nan_serialization.xlsx")
        df = pd.DataFrame({"a": [1, None, 3], "b": [None, 2, 3]})
        df.to_excel(temp_path, index=False)
        try:
            response = self.client.get(f"/datasets/{os.path.basename(temp_path)}")
            self.assertEqual(response.status_code, 200)
            data = response.json()
            self.assertEqual(data["status"], "success")
            self.assertIn("preview", data)
            self.assertIsInstance(data["preview"]["rows"], list)
            self.assertTrue(any(row.get("a") is None for row in data["preview"]["rows"]))
            self.assertTrue(any(row.get("b") is None for row in data["preview"]["rows"]))
        finally:
            if os.path.exists(temp_path):
                os.remove(temp_path)

    def test_query_endpoint(self):
        if os.path.exists("data/sales_data.csv"):
            payload = {
                "dataset_id": "sales_data.csv",
                "question": "What is the total sales amount across all records?"
            }
            response = self.client.post("/query", json=payload)
            self.assertEqual(response.status_code, 200)
            data = response.json()
            self.assertEqual(data["status"], "success")
            self.assertIn("answer", data)
            self.assertIn("table", data)
            self.assertIn("chart_data", data)
            self.assertIn("generated_code", data)
            self.assertIn("latency_ms", data)

    def test_delete_dataset_endpoint(self):
        temp_dir = os.path.abspath("data")
        os.makedirs(temp_dir, exist_ok=True)
        temp_path = os.path.join(temp_dir, "test_delete_dataset.csv")
        df = pd.DataFrame({"a": [1, 2], "b": [3, 4]})
        df.to_csv(temp_path, index=False)
        try:
            response = self.client.delete("/datasets/test_delete_dataset.csv")
            self.assertEqual(response.status_code, 200)
            data = response.json()
            self.assertEqual(data["status"], "success")
            self.assertEqual(data["dataset_id"], "test_delete_dataset.csv")
            self.assertFalse(os.path.exists(temp_path))
        finally:
            if os.path.exists(temp_path):
                os.remove(temp_path)

    def test_history_endpoint(self):
        response = self.client.get("/history")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["status"], "success")
        self.assertIn("logs", data)

if __name__ == "__main__":
    unittest.main()
