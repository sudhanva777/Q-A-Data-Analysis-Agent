import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 60000, // 60s timeout for agent execution
});

export const api = {
  // Health check
  getHealth: async () => {
    const response = await apiClient.get('/api/health');
    return response.data;
  },

  // List all available datasets
  getDatasets: async () => {
    const response = await apiClient.get('/api/datasets');
    return response.data;
  },

  // Get schema & preview details for a dataset
  getDatasetDetails: async (datasetId) => {
    const response = await apiClient.get(`/api/datasets/${encodeURIComponent(datasetId)}`);
    return response.data;
  },

  // Upload CSV or Excel dataset
  uploadDataset: async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await apiClient.post('/api/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  // Remove an uploaded dataset file
  deleteDataset: async (datasetId) => {
    const response = await apiClient.delete(`/api/datasets/${encodeURIComponent(datasetId)}`);
    return response.data;
  },

  // Submit natural language question
  askQuestion: async (datasetId, question) => {
    const response = await apiClient.post('/api/query', {
      dataset_id: datasetId,
      question: question,
    });
    return response.data;
  },

  // Get interaction logs history
  getHistory: async (limit = 50) => {
    const response = await apiClient.get(`/api/history?limit=${limit}`);
    return response.data;
  },

  // ─── V2 Endpoints ────────────────────────────────────────

  // Get comprehensive profiling report
  getProfile: async (datasetId) => {
    const response = await apiClient.get(`/api/profile/${encodeURIComponent(datasetId)}`);
    return response.data;
  },

  // Get quality score + validation issues
  getQualityScore: async (datasetId) => {
    const response = await apiClient.get(`/api/quality/${encodeURIComponent(datasetId)}`);
    return response.data;
  },

  // Get auto-generated insights
  getInsights: async (datasetId) => {
    const response = await apiClient.get(`/api/insights/${encodeURIComponent(datasetId)}`);
    return response.data;
  },

  // Clean dataset with specified operations
  cleanDataset: async (datasetId, operations = []) => {
    const response = await apiClient.post('/api/clean', {
      dataset_id: datasetId,
      operations: operations,
    });
    return response.data;
  },

  // Get rich dataset summary (LLM context)
  getDatasetSummary: async (datasetId) => {
    const response = await apiClient.get(`/api/summary/${encodeURIComponent(datasetId)}`);
    return response.data;
  },
};

export default api;
