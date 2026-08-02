import React, { useState, useRef } from 'react';
import { Upload, FileSpreadsheet, CheckCircle2, Loader2, X, Plus } from 'lucide-react';
import toast from 'react-hot-toast';

const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024;
const VALID_EXTENSIONS = ['.csv', '.xlsx', '.xls'];

const formatFileSize = (bytes) => {
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
};

export default function UploadCard({ onUploadFiles, isUploading, setIsUploading }) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [queuedFiles, setQueuedFiles] = useState([]);
  const [uploadedFileMeta, setUploadedFileMeta] = useState([]);
  const fileInputRef = useRef(null);

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const addFilesToQueue = (incomingFiles) => {
    const normalized = Array.from(incomingFiles || []);
    const validFiles = [];
    const invalidFiles = [];

    normalized.forEach((file) => {
      const hasValidExt = VALID_EXTENSIONS.some((ext) => file.name.toLowerCase().endsWith(ext));
      if (!hasValidExt) {
        invalidFiles.push(file.name);
        return;
      }

      if (file.size > MAX_FILE_SIZE_BYTES) {
        invalidFiles.push(file.name);
        return;
      }

      validFiles.push(file);
    });

    if (invalidFiles.length > 0) {
      toast.error(`Some files were skipped because they are invalid or larger than 50MB: ${invalidFiles.join(', ')}`);
    }

    if (validFiles.length > 0) {
      setQueuedFiles((prev) => [...prev, ...validFiles]);
      toast.success(`${validFiles.length} file${validFiles.length > 1 ? 's' : ''} added to the upload queue.`);
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      addFilesToQueue(e.dataTransfer.files);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      addFilesToQueue(e.target.files);
    }
  };

  const handleRemoveQueuedFile = (index) => {
    setQueuedFiles((prev) => prev.filter((_, itemIndex) => itemIndex !== index));
  };

  const handleUpload = async () => {
    if (queuedFiles.length === 0) {
      toast.error('Add at least one file to the queue before uploading.');
      return;
    }

    setIsUploading(true);
    const toastId = toast.loading(`Uploading ${queuedFiles.length} file${queuedFiles.length > 1 ? 's' : ''}...`);

    try {
      const results = await onUploadFiles(queuedFiles);
      setUploadedFileMeta((prev) => [
        ...prev,
        ...results.map((result) => ({
          filename: result.filename,
          record_count: result.record_count,
          column_count: result.column_count,
        })),
      ]);
      setQueuedFiles([]);
      toast.success(`Successfully uploaded ${results.length} file${results.length > 1 ? 's' : ''}.`, { id: toastId });
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Failed to upload dataset.', { id: toastId });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="w-full">
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-150 ${
          isDragOver
            ? 'border-blue-500 bg-blue-50/50 scale-[1.005]'
            : 'border-gray-300 hover:border-blue-400 hover:bg-gray-50/80 bg-white'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,.xlsx,.xls"
          multiple
          onChange={handleFileChange}
          className="hidden"
        />

        <div className="flex flex-col items-center justify-center space-y-3">
          <div className="w-14 h-14 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center">
            {isUploading ? (
              <Loader2 className="w-7 h-7 animate-spin text-blue-600" />
            ) : (
              <Upload className="w-7 h-7" />
            )}
          </div>

          <div>
            <h3 className="text-[16px] font-semibold text-gray-900">
              Drag & Drop datasets here
            </h3>
            <p className="text-[13px] text-gray-500 mt-1">
              Supports <span className="font-semibold text-gray-700">.CSV</span>, <span className="font-semibold text-gray-700">.XLSX</span>, and <span className="font-semibold text-gray-700">.XLS</span> files up to 50MB
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-2 mt-1">
            <button
              type="button"
              disabled={isUploading}
              className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-[13.5px] font-medium rounded-lg shadow-xs transition-colors disabled:opacity-50"
            >
              <FileSpreadsheet className="w-4 h-4 mr-2" />
              Browse Files
            </button>
            {queuedFiles.length > 0 && (
              <button
                type="button"
                disabled={isUploading}
                onClick={(e) => {
                  e.stopPropagation();
                  handleUpload();
                }}
                className="inline-flex items-center px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-[13.5px] font-medium rounded-lg shadow-xs transition-colors disabled:opacity-50"
              >
                <Plus className="w-4 h-4 mr-2" />
                Upload {queuedFiles.length} file{queuedFiles.length > 1 ? 's' : ''}
              </button>
            )}
          </div>
        </div>
      </div>

      {queuedFiles.length > 0 && (
        <div className="mt-3 rounded-xl border border-gray-200 bg-gray-50 p-3">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-[13px] font-semibold text-gray-800">Upload queue</h4>
            <span className="text-[12px] text-gray-500">{queuedFiles.length} file{queuedFiles.length > 1 ? 's' : ''}</span>
          </div>
          <div className="space-y-2">
            {queuedFiles.map((file, index) => (
              <div key={`${file.name}-${index}`} className="flex items-center justify-between rounded-lg border border-gray-200 bg-white px-3 py-2">
                <div className="min-w-0">
                  <div className="truncate text-[13px] font-medium text-gray-800">{file.name}</div>
                  <div className="text-[12px] text-gray-500">{formatFileSize(file.size)}</div>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemoveQueuedFile(index);
                  }}
                  className="ml-3 rounded-md p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                  title="Remove file"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {uploadedFileMeta.length > 0 && (
        <div className="mt-3 space-y-2">
          {uploadedFileMeta.map((item, index) => (
            <div key={`${item.filename}-${index}`} className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 flex items-center justify-between text-[13px] text-emerald-800">
              <div className="flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="font-semibold">{item.filename}</span>
                <span className="text-emerald-600">
                  ({item.record_count?.toLocaleString()} rows · {item.column_count} cols)
                </span>
              </div>
              <span className="text-emerald-700 font-medium bg-emerald-100/70 px-2 py-0.5 rounded text-[11px]">
                Ready for Q&A
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
