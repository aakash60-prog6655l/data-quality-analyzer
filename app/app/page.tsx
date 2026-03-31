'use client';

import { useState } from 'react';

export default function Home() {
  const [fileName, setFileName] = useState('');

  return (
    <div style={{ padding: "20px", textAlign: "center" }}>
      <h1>Data Quality Analyzer</h1>
      <p>Upload your CSV or Excel file</p>

      <input
        type="file"
        onChange={(e) => {
          if (e.target.files && e.target.files[0]) {
            setFileName(e.target.files[0].name);
          }
        }}
      />

      {fileName && (
        <p style={{ marginTop: "20px" }}>
          Selected File: <strong>{fileName}</strong>
        </p>
      )}
    </div>
  );
}
