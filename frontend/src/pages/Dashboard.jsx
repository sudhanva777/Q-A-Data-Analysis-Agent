import React, { useState, useEffect } from 'react';
import Navbar from '../components/Navbar/Navbar';
import Sidebar from '../components/Sidebar/Sidebar';
import ChatWorkspace from '../components/Chat/ChatWorkspace';
import UploadCard from '../components/Upload/UploadCard';
import api from '../services/api';
import toast from 'react-hot-toast';
import { X, Upload } from 'lucide-react';

export default function Dashboard() {
  const [datasets, setDatasets] = useState([]);
  const [activeDataset, setActiveDataset] = useState(null);
  const [datasetDetails, setDatasetDetails] = useState(null);
  const [historyLogs, setHistoryLogs] = useState([]);
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [isConnected, setIsConnected] = useState(true);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  // Load initial datasets & history
  useEffect(() => {
    fetchDatasets();
    fetchHistory();
    checkHealth();
  }, []);

  // Fetch dataset details when activeDataset changes
  useEffect(() => {
    if (activeDataset) {
      fetchDatasetDetails(activeDataset);
    }
  }, [activeDataset]);

  const checkHealth = async () => {
    try {
      await api.getHealth();
      setIsConnected(true);
    } catch {
      setIsConnected(false);
    }
  };

  const fetchDatasets = async () => {
    try {
      const data = await api.getDatasets();
      if (data.datasets && data.datasets.length > 0) {
        setDatasets(data.datasets);
        if (!activeDataset) {
          setActiveDataset(data.datasets[0].dataset_id);
        }
      } else {
        toast.error('No datasets are available. Upload a file to get started.');
      }
    } catch (err) {
      console.error('Failed to fetch datasets:', err);
      toast.error(err?.response?.data?.error || err?.response?.data?.detail || 'Failed to load datasets.');
    }
  };

  const fetchDatasetDetails = async (id) => {
    try {
      const details = await api.getDatasetDetails(id);
      setDatasetDetails(details);
    } catch (err) {
      console.error('Failed to fetch dataset details:', err);
      toast.error(err?.response?.data?.error || err?.response?.data?.detail || 'Failed to load dataset details.');
      setDatasetDetails(null);
    }
  };

  const fetchHistory = async () => {
    setIsLoadingHistory(true);
    try {
      const data = await api.getHistory(50);
      setHistoryLogs(data.logs || []);
    } catch (err) {
      console.error('Failed to fetch history:', err);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const handleUploadFiles = async (files) => {
    const results = [];

    for (const file of files) {
      const res = await api.uploadDataset(file);
      results.push(res);
    }

    await fetchDatasets();
    if (results.length > 0) {
      setActiveDataset(results[results.length - 1].dataset_id);
    }
    setShowUploadModal(false);
    return results;
  };

  const handleDeleteDataset = async (datasetId) => {
    if (!datasetId) return;

    const confirmed = window.confirm(`Remove ${datasetId} from the workspace?`);
    if (!confirmed) return;

    try {
      await api.deleteDataset(datasetId);
      toast.success(`${datasetId} removed.`);

      const refreshed = await api.getDatasets();
      const nextDatasets = refreshed.datasets || [];
      setDatasets(nextDatasets);

      if (activeDataset === datasetId) {
        const nextActive = nextDatasets[0]?.dataset_id || null;
        setActiveDataset(nextActive);
        if (!nextActive) {
          setDatasetDetails(null);
          setMessages([]);
        }
      }
    } catch (err) {
      const errorMsg = err?.response?.data?.error || err?.response?.data?.detail || 'Failed to remove dataset.';
      toast.error(errorMsg);
    }
  };

  const handleSendMessage = async (questionText) => {
    if (!activeDataset) {
      toast.error('Please select or upload a dataset first!');
      setShowUploadModal(true);
      return;
    }

    // Append User Question to trajectory
    const userMsg = {
      role: 'user',
      content: questionText,
      datasetId: activeDataset,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setIsLoading(true);

    try {
      const response = await api.askQuestion(activeDataset, questionText);

      // Append Assistant Response
      const assistantMsg = {
        role: 'assistant',
        answer: response.answer,
        explanation: response.explanation,
        table: response.table,
        chart_url: response.chart_url,
        chart_data: response.chart_data,
        generated_code: response.generated_code,
        latency_ms: response.latency_ms,
        datasetId: activeDataset,
        status: 'SUCCESS',
      };

      setMessages((prev) => [...prev, assistantMsg]);
      toast.success('Analysis complete!');
      fetchHistory(); // Refresh sidebar history
    } catch (err) {
      const errorMsg = err?.response?.data?.error || err?.response?.data?.detail || 'Analysis query failed.';
      toast.error(errorMsg);

      const errorAssistantMsg = {
        role: 'assistant',
        answer: `⚠️ Execution Error: ${errorMsg}`,
        explanation: errorMsg,
        table: null,
        chart_url: null,
        chart_data: null,
        generated_code: '# Execution failed',
        latency_ms: 0,
        datasetId: activeDataset,
        status: 'ERROR',
      };

      setMessages((prev) => [...prev, errorAssistantMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectHistoryItem = (item) => {
    const requestedDataset = item.dataset_name;
    const datasetExists = datasets.some((d) => d.dataset_id === requestedDataset);
    if (requestedDataset && requestedDataset !== activeDataset && datasetExists) {
      setActiveDataset(requestedDataset);
    } else if (requestedDataset && requestedDataset !== activeDataset && !datasetExists) {
      toast.error(`Dataset ${requestedDataset} is no longer available. Keeping the current dataset.`);
    }

    const replayedUserMsg = {
      role: 'user',
      content: item.question,
      datasetId: requestedDataset,
    };

    const replayedAssistantMsg = {
      role: 'assistant',
      answer: item.answer || item.result_summary,
      explanation: item.answer || item.result_summary,
      table: null, // Summary view from log
      chart_url: item.chart_url,
      chart_data: null,
      generated_code: item.generated_code,
      latency_ms: item.latency_ms,
      datasetId: item.dataset_name,
      status: item.status,
    };

    setMessages([replayedUserMsg, replayedAssistantMsg]);
  };

  const handleNewAnalysis = () => {
    setMessages([]);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      <Navbar activeDataset={activeDataset} isConnected={isConnected} />

      <div className="flex flex-1 overflow-hidden">
        <Sidebar
          datasets={datasets}
          activeDataset={activeDataset}
          onSelectDataset={setActiveDataset}
          datasetDetails={datasetDetails}
          historyLogs={historyLogs}
          onSelectHistory={handleSelectHistoryItem}
          onNewAnalysis={handleNewAnalysis}
          onOpenUploadModal={() => setShowUploadModal(true)}
          onDeleteDataset={handleDeleteDataset}
          isLoadingHistory={isLoadingHistory}
          onRefreshHistory={fetchHistory}
        />

        <ChatWorkspace
          messages={messages}
          onSendMessage={handleSendMessage}
          activeDataset={activeDataset}
          isLoading={isLoading}
          onOpenUploadModal={() => setShowUploadModal(true)}
        />
      </div>

      {/* Upload Dataset Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-gray-200 relative animate-in fade-in zoom-in-95 duration-150">
            <button
              onClick={() => setShowUploadModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center space-x-2 text-gray-900 font-bold text-[18px] mb-4">
              <Upload className="w-5 h-5 text-blue-600" />
              <span>Upload Dataset</span>
            </div>

            <UploadCard
              onUploadFiles={handleUploadFiles}
              isUploading={isUploading}
              setIsUploading={setIsUploading}
            />
          </div>
        </div>
      )}
    </div>
  );
}
