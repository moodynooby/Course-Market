import { useState, useRef } from 'react';
import { generateSampleCSV } from '../utils/csv';

interface CSVUploadProps {
  onUpload: (content: string) => void;
  errors: string[];
  warnings: string[];
  isLoaded: boolean;
}

export function CSVUpload({ onUpload, errors, warnings, isLoaded }: CSVUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = (file: File) => {
    if (!file.name.endsWith('.csv')) {
      alert('Please select a CSV file');
      return;
    }

    setSelectedFile(file);
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      onUpload(content);
    };
    reader.readAsText(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files[0];
    if (file) {
      handleFile(file);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFile(file);
    }
  };

  const loadSampleData = () => {
    const sampleCSV = generateSampleCSV();
    setSelectedFile(new File([sampleCSV], 'sample.csv', { type: 'text/csv' }));
    onUpload(sampleCSV);
  };

  return (
    <div className="csv-upload">
      <h2>📥 CSV Course Import</h2>

      {!isLoaded && (
        <div
          className={`upload-zone ${isDragging ? 'dragging' : ''}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            onChange={handleInputChange}
            style={{ display: 'none' }}
          />

          <div className="upload-icon">📄</div>
          <p>Drag and drop your CSV file here</p>
          <p className="sub-text">or click to browse</p>
          <button
            type="button"
            className="sample-btn"
            onClick={(e) => {
              e.stopPropagation();
              loadSampleData();
            }}
          >
            Load Sample Data
          </button>
        </div>
      )}

      {selectedFile && (
        <div className="file-info">
          <span>📎 {selectedFile.name}</span>
        </div>
      )}

      {errors.length > 0 && (
        <div className="error-messages">
          <h4>⚠️ Errors:</h4>
          <ul>
            {errors.map((error, i) => (
              <li key={i}>{error}</li>
            ))}
          </ul>
        </div>
      )}

      {warnings.length > 0 && (
        <div className="warning-messages">
          <h4>⚠️ Warnings:</h4>
          <ul>
            {warnings.map((warning, i) => (
              <li key={i}>{warning}</li>
            ))}
          </ul>
        </div>
      )}

      {isLoaded && <div className="success-message">✅ Courses loaded successfully!</div>}
    </div>
  );
}
