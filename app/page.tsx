'use client';

import { useState, ChangeEvent } from 'react';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';

export default function Home() {
  const [results, setResults] = useState<{ totalRows: number; duplicateRows: number; missingValues: number } | null>(null);
  const [error, setError] = useState<string>('');

  const handleFileUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError('');
    setResults(null);

    const fileExtension = file.name.split('.').pop()?.toLowerCase();

    if (fileExtension === 'csv') {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (result) => analyzeData(result.data as Record<string, any>[]),
        error: (err: Error) => setError(err.message)
      });
    } else if (fileExtension === 'xlsx' || fileExtension === 'xls') {
      const reader = new FileReader();
      reader.onload = (evt) => {
        try {
          const ab = evt.target?.result as ArrayBuffer;
          const wb = XLSX.read(ab, { type: 'array' });
          const wsname = wb.SheetNames[0];
          const ws = wb.Sheets[wsname];
          const data = XLSX.utils.sheet_to_json(ws, { defval: "" });
          analyzeData(data as Record<string, any>[]);
        } catch (err) {
          setError('Error reading Excel file.');
        }
      };
      reader.readAsArrayBuffer(file);
    } else {
      setError('Unsupported file format. Please upload a CSV or Excel file.');
    }
  };

  const analyzeData = (data: Record<string, any>[]) => {
    if (!data || data.length === 0) {
      setError('File is empty or could not be parsed.');
      return;
    }

    const totalRows = data.length;
    let missingValues = 0;
    let duplicateRows = 0;
    const rowSet = new Set<string>();

    data.forEach((row) => {
      // Count missing values
      Object.values(row).forEach((val) => {
        if (val === null || val === undefined || val === '') {
          missingValues++;
        }
      });

      // Count duplicate rows
      const rowString = JSON.stringify(row);
      if (rowSet.has(rowString)) {
        duplicateRows++;
      } else {
        rowSet.add(rowString);
      }
    });

    setResults({
      totalRows,
      duplicateRows,
      missingValues
    });
  };

  return (
    <div style={{ padding: '2rem', fontFamily: 'system-ui, sans-serif' }}>
      <h1 style={{ marginBottom: '1rem' }}>Data Quality Analyzer</h1>
      
      <input 
        type="file" 
        accept=".csv, .xlsx, .xls" 
        onChange={handleFileUpload} 
        style={{ marginBottom: '1.5rem', display: 'block' }}
      />

      {error && <p style={{ color: 'red', fontWeight: 'bold' }}>{error}</p>}

      {results && (
        <div style={{ marginTop: '2rem', padding: '1.5rem', border: '1px solid #e5e7eb', borderRadius: '8px', maxWidth: '400px' }}>
          <h2 style={{ marginTop: 0, marginBottom: '1rem' }}>Analysis Results</h2>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            <li style={{ marginBottom: '0.5rem' }}><strong>Total Rows:</strong> {results.totalRows}</li>
            <li style={{ marginBottom: '0.5rem' }}><strong>Duplicate Rows:</strong> {results.duplicateRows}</li>
            <li><strong>Missing Values (Empty Cells):</strong> {results.missingValues}</li>
          </ul>
        </div>
      )}
    </div>
  );
}
