'use client'  
  
import { useState } from 'react'  
import Papa from 'papaparse'  
  
export default function Home() {  
  const [file, setFile] = useState<File | null>(null)  
  const [analyzing, setAnalyzing] = useState(false)  
  const [results, setResults] = useState<any>(null)  
  const [error, setError] = useState('')  
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {  
    const selectedFile = e.target.files?.[0]  
    if (selectedFile) {  
      if (!selectedFile.name.endsWith('.csv')) {  
        setError('Please upload a CSV file')  
        return  
      }  
      setFile(selectedFile)  
      setError('')  
      setResults(null)  
    }  
  }  
  
  const analyzeFile = () => {  
    if (!file) return  
  
    setAnalyzing(true)  
    setError('')  
  
    Papa.parse(file, {  
      complete: (result) => {  
        try {  
          const data = result.data as any[][]  
            
          // Remove empty rows  
          const cleanData = data.filter(row =>   
            row.some(cell => cell !== null && cell !== undefined && cell !== '')  
          )  
  
          if (cleanData.length === 0) {  
            setError('File is empty')  
            setAnalyzing(false)  
            return  
          }  
  
          // Get headers and rows  
          const headers = cleanData[0]  
          const rows = cleanData.slice(1)  
  
          // Count total rows  
          const totalRows = rows.length  
  
          // Find duplicates  
          const rowStrings = rows.map(row => JSON.stringify(row))  
          const uniqueRows = new Set(rowStrings)  
          const duplicates = totalRows - uniqueRows.size  
  
          // Count missing values  
          let missingCount = 0  
          rows.forEach(row => {  
            row.forEach(cell => {  
              if (cell === null || cell === undefined || cell === '') {  
                missingCount++  
              }  
            })  
          })  
  
          // Calculate quality score  
          const totalCells = totalRows * headers.length  
          const missingPercent = (missingCount / totalCells) * 100  
          const duplicatePercent = (duplicates / totalRows) * 100  
            
          let score = 100  
          score -= missingPercent * 0.5  
          score -= duplicatePercent * 0.8  
          score = Math.max(0, Math.round(score))  
  
          setResults({  
            totalRows,  
            duplicates,  
            missingCount,  
            score,  
          })  
        } catch (err) {  
          setError('Error analyzing file')  
        }  
        setAnalyzing(false)  
      },  
      error: () => {  
        setError('Error parsing CSV file')  
        setAnalyzing(false)  
      },  
    })  
  }  
  
  return (  
    <div style={styles.container}>  
      <div style={styles.header}>  
        <h1 style={styles.title}>Data Quality Analyzer</h1>  
        <p style={styles.subtitle}>Upload a CSV file for instant analysis</p>  
      </div>  
  
      <div style={styles.card}>  
        <div style={styles.uploadSection}>  
          <input  
            type="file"  
            accept=".csv"  
            onChange={handleFileChange}  
            style={styles.fileInput}  
          />  
          {file && <p style={styles.fileName}>File: {file.name}</p>}  
        </div>  
  
        {error && <div style={styles.error}>{error}</div>}  
  
        {file && !results && (  
          <button  
            onClick={analyzeFile}  
            disabled={analyzing}  
            style={styles.button}  
          >  
            {analyzing ? 'Analyzing...' : 'Analyze File'}  
          </button>  
        )}  
  
        {analyzing && (  
          <div style={styles.loading}>  
            <div style={styles.spinner}></div>  
            <p>Processing your file...</p>  
          </div>  
        )}  
  
        {results && (  
          <div style={styles.results}>  
            <h2 style={styles.resultsTitle}>Analysis Results</h2>  
              
            <div style={styles.scoreBox}>  
              <div style={styles.scoreLabel}>Quality Score</div>  
              <div style={{  
                ...styles.scoreValue,  
                color: results.score >= 80 ? '#4CAF50' : results.score >= 60 ? '#FF9800' : '#F44336'  
              }}>  
                {results.score}/100  
              </div>  
            </div>  
  
            <div style={styles.statsGrid}>  
              <div style={styles.statBox}>  
                <div style={styles.statLabel}>Total Rows</div>  
                <div style={styles.statValue}>{results.totalRows}</div>  
              </div>  
              <div style={styles.statBox}>  
                <div style={styles.statLabel}>Duplicates</div>  
                <div style={styles.statValue}>{results.duplicates}</div>  
              </div>  
              <div style={styles.statBox}>  
                <div style={styles.statLabel}>Missing Values</div>  
                <div style={styles.statValue}>{results.missingCount}</div>  
              </div>  
            </div>  
  
            <button  
              onClick={() => {  
                setFile(null)  
                setResults(null)  
              }}  
              style={styles.resetButton}  
            >  
              Analyze Another File  
            </button>  
          </div>  
        )}  
      </div>  
    </div>  
  )  
}  
  
const styles = {  
  container: {  
    minHeight: '100vh',  
    background: '#f5f5f5',  
    padding: '40px 20px',  
  },  
  header: {  
    textAlign: 'center' as const,  
    marginBottom: '40px',  
  },  
  title: {  
    fontSize: '36px',  
    margin: '0 0 10px 0',  
    color: '#333',  
  },  
  subtitle: {  
    fontSize: '16px',  
    color: '#666',  
    margin: 0,  
  },  
  card: {  
    maxWidth: '600px',  
    margin: '0 auto',  
    background: 'white',  
    borderRadius: '8px',  
    padding: '30px',  
    boxShadow: '0 2px 10px rgba(0,0,0,0.1)',  
  },  
  uploadSection: {  
    marginBottom: '20px',  
  },  
  fileInput: {  
    width: '100%',  
    padding: '10px',  
    fontSize: '16px',  
    border: '2px solid #ddd',  
    borderRadius: '6px',  
    cursor: 'pointer',  
  },  
  fileName: {  
    marginTop: '10px',  
    fontSize: '14px',  
    color: '#666',  
  },  
  button: {  
    width: '100%',  
    padding: '15px',  
    fontSize: '16px',  
    fontWeight: 'bold' as const,  
    background: '#4CAF50',  
    color: 'white',  
    border: 'none',  
    borderRadius: '6px',  
    cursor: 'pointer',  
  },  
  resetButton: {  
    width: '100%',  
    padding: '12px',  
    fontSize: '14px',  
    background: '#666',  
    color: 'white',  
    border: 'none',  
    borderRadius: '6px',  
    cursor: 'pointer',  
    marginTop: '20px',  
  },  
  error: {  
    padding: '15px',  
    background: '#ffebee',  
    color: '#c62828',  
    borderRadius: '6px',  
    marginBottom: '15px',  
    fontSize: '14px',  
  },  
  loading: {  
    textAlign: 'center' as const,  
    padding: '30px',  
  },  
  spinner: {  
    width: '40px',  
    height: '40px',  
    border: '4px solid #f3f3f3',  
    borderTop: '4px solid #4CAF50',  
    borderRadius: '50%',  
    animation: 'spin 1s linear infinite',  
    margin: '0 auto 15px',  
  },  
  results: {  
    marginTop: '20px',  
  },  
  resultsTitle: {  
    fontSize: '24px',  
    marginBottom: '20px',  
    textAlign: 'center' as const,  
    color: '#333',  
  },  
  scoreBox: {  
    textAlign: 'center' as const,  
    padding: '30px',  
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',  
    borderRadius: '8px',  
    marginBottom: '20px',  
  },  
  scoreLabel: {  
    color: 'white',  
    fontSize: '14px',  
    marginBottom: '10px',  
    opacity: 0.9,  
  },  
  scoreValue: {  
    fontSize: '48px',  
    fontWeight: 'bold' as const,  
    color: 'white',  
  },  
  statsGrid: {  
    display: 'grid',  
    gridTemplateColumns: 'repeat(3, 1fr)',  
    gap: '15px',  
    marginBottom: '20px',  
  },  
  statBox: {  
    background: '#f9f9f9',  
    padding: '20px',  
    borderRadius: '6px',  
    textAlign: 'center' as const,  
  },  
  statLabel: {  
    fontSize: '12px',  
    color: '#666',  
    marginBottom: '8px',  
    textTransform: 'uppercase' as const,  
  },  
  statValue: {  
    fontSize: '28px',  
    fontWeight: 'bold' as const,  
    color: '#333',  
  },  
}