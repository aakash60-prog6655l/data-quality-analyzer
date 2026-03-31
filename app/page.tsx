'use client';

import { useState } from 'react';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';

interface AnalysisResult {
  totalRows: number
  totalColumns: number
  duplicates: number
  missingValues: number
  qualityScore: number
  issues: Issue[]
  columnStats: ColumnStat[]
  fileName: string
}

interface Issue {
  type: string
  severity: 'high' | 'medium' | 'low'
  description: string
  count: number
}

interface ColumnStat {
  name: string
  missingCount: number
  missingPercent: number
  dataType: string
}

export default function Home() {
  const [file, setFile] = useState<File | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [result, setResult] = useState<AnalysisResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [dragActive, setDragActive] = useState(false)

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0])
    }
  }

  const handleFileSelect = (selectedFile: File) => {
    const validTypes = [
      'text/csv',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ]

    if (!validTypes.includes(selectedFile.type) && 
        !selectedFile.name.endsWith('.csv') && 
        !selectedFile.name.endsWith('.xlsx') && 
        !selectedFile.name.endsWith('.xls')) {
      setError('Please upload a CSV or Excel file')
      return
    }

    setFile(selectedFile)
    setError(null)
    setResult(null)
  }

  const analyzeData = async () => {
    if (!file) return

    setIsAnalyzing(true)
    setError(null)

    try {
      const data = await parseFile(file)
      const analysis = performAnalysis(data, file.name)
      await new Promise(resolve => setTimeout(resolve, 1000))
      setResult(analysis)
    } catch (err) {
      setError('Error analyzing file. Please check the format.')
      console.error(err)
    } finally {
      setIsAnalyzing(false)
    }
  }

  const parseFile = (file: File): Promise<any[][]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()

      reader.onload = (e) => {
        try {
          if (file.name.endsWith('.csv')) {
            Papa.parse(e.target?.result as string, {
              complete: (results) => resolve(results.data as any[][]),
              error: (error) => reject(error),
            })
          } else {
            const data = new Uint8Array(e.target?.result as ArrayBuffer)
            const workbook = XLSX.read(data, { type: 'array' })
            const firstSheet = workbook.Sheets[workbook.SheetNames[0]]
            const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 })
            resolve(jsonData as any[][])
          }
        } catch (error) {
          reject(error)
        }
      }

      reader.onerror = () => reject(reader.error)

      if (file.name.endsWith('.csv')) {
        reader.readAsText(file)
      } else {
        reader.readAsArrayBuffer(file)
      }
    })
  }

  const performAnalysis = (data: any[][], fileName: string): AnalysisResult => {
    if (data.length === 0) throw new Error('File is empty')

    const headers = data[0]
    const rows = data.slice(1).filter(row => row.some(cell => cell !== null && cell !== undefined && cell !== ''))
    
    const totalRows = rows.length
    const totalColumns = headers.length

    const rowStrings = rows.map(row => JSON.stringify(row))
    const uniqueRows = new Set(rowStrings)
    const duplicates = totalRows - uniqueRows.size

    let missingValues = 0
    const columnStats: ColumnStat[] = []

    headers.forEach((header, colIndex) => {
      const columnData = rows.map(row => row[colIndex])
      const missing = columnData.filter(cell => 
        cell === null || cell === undefined || cell === '' || 
        (typeof cell === 'string' && cell.trim() === '')
      ).length
      
      missingValues += missing
      
      const dataType = inferDataType(columnData)

      columnStats.push({
        name: String(header),
        missingCount: missing,
        missingPercent: (missing / totalRows) * 100,
        dataType,
      })
    })

    const issues: Issue[] = []

    if (duplicates > 0) {
      issues.push({
        type: 'Duplicate Rows',
        severity: duplicates > totalRows * 0.1 ? 'high' : 'medium',
        description: `${duplicates} duplicate row${duplicates > 1 ? 's' : ''} found`,
        count: duplicates,
      })
    }

    const missingPercent = (missingValues / (totalRows * totalColumns)) * 100
    if (missingValues > 0) {
      issues.push({
        type: 'Missing Values',
        severity: missingPercent > 20 ? 'high' : missingPercent > 10 ? 'medium' : 'low',
        description: `${missingValues} missing value${missingValues > 1 ? 's' : ''}`,
        count: missingValues,
      })
    }

    const emailColumns = columnStats.filter(col => 
      col.name.toLowerCase().includes('email') || col.dataType === 'email'
    )
    emailColumns.forEach(col => {
      const columnData = rows.map(row => row[headers.indexOf(col.name)])
      const invalidEmails = columnData.filter(email => {
        if (!email || email === '') return false
        return !isValidEmail(String(email))
      }).length

      if (invalidEmails > 0) {
        issues.push({
          type: 'Format Issue',
          severity: 'medium',
          description: `${invalidEmails} invalid email${invalidEmails > 1 ? 's' : ''} in "${col.name}"`,
          count: invalidEmails,
        })
      }
    })

    const phoneColumns = columnStats.filter(col => 
      col.name.toLowerCase().includes('phone') || col.dataType === 'phone'
    )
    phoneColumns.forEach(col => {
      const columnData = rows.map(row => row[headers.indexOf(col.name)])
      const invalidPhones = columnData.filter(phone => {
        if (!phone || phone === '') return false
        return !isValidPhone(String(phone))
      }).length

      if (invalidPhones > 0) {
        issues.push({
          type: 'Format Issue',
          severity: 'medium',
          description: `${invalidPhones} invalid phone${invalidPhones > 1 ? 's' : ''} in "${col.name}"`,
          count: invalidPhones,
        })
      }
    })

    columnStats.forEach(col => {
      if (col.missingPercent > 50) {
        issues.push({
          type: 'Data Quality',
          severity: 'high',
          description: `Column "${col.name}" is ${col.missingPercent.toFixed(1)}% empty`,
          count: col.missingCount,
        })
      }
    })

    const qualityScore = calculateQualityScore(totalRows, duplicates, missingValues, totalColumns, issues)

    return {
      totalRows,
      totalColumns,
      duplicates,
      missingValues,
      qualityScore,
      issues: issues.sort((a, b) => {
        const severityOrder = { high: 0, medium: 1, low: 2 }
        return severityOrder[a.severity] - severityOrder[b.severity]
      }),
      columnStats: columnStats.sort((a, b) => b.missingPercent - a.missingPercent),
      fileName,
    }
  }

  const inferDataType = (columnData: any[]): string => {
    const sample = columnData.filter(cell => cell !== null && cell !== undefined && cell !== '').slice(0, 50)
    if (sample.length === 0) return 'text'

    let emailCount = 0
    let phoneCount = 0
    let numberCount = 0

    sample.forEach(cell => {
      const str = String(cell).trim()
      if (/@/.test(str)) emailCount++
      if (/[\d\(\)\-\+\s]{7,}/.test(str)) phoneCount++
      if (!isNaN(Number(str)) && str !== '') numberCount++
    })

    const threshold = sample.length * 0.6

    if (emailCount > threshold) return 'email'
    if (phoneCount > threshold) return 'phone'
    if (numberCount > threshold) return 'number'

    return 'text'
  }

  const isValidEmail = (email: string): boolean => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
  }

  const isValidPhone = (phone: string): boolean => {
    const cleaned = phone.replace(/\D/g, '')
    return cleaned.length >= 10 && cleaned.length <= 15
  }

  const calculateQualityScore = (
    totalRows: number,
    duplicates: number,
    missingValues: number,
    totalColumns: number,
    issues: Issue[]
  ): number => {
    let score = 100

    const duplicatePercent = (duplicates / totalRows) * 100
    score -= Math.min(duplicatePercent * 0.5, 20)

    const missingPercent = (missingValues / (totalRows * totalColumns)) * 100
    score -= Math.min(missingPercent * 0.8, 30)

    const highSeverityCount = issues.filter(i => i.severity === 'high').length
    score -= highSeverityCount * 5

    const mediumSeverityCount = issues.filter(i => i.severity === 'medium').length
    score -= mediumSeverityCount * 3

    return Math.max(0, Math.round(score))
  }

  const getScoreColor = (score: number): string => {
    if (score >= 80) return '#4CAF50'
    if (score >= 60) return '#FFC107'
    return '#F44336'
  }

  const getScoreLabel = (score: number): string => {
    if (score >= 90) return 'Excellent'
    if (score >= 80) return 'Good'
    if (score >= 60) return 'Fair'
    if (score >= 40) return 'Poor'
    return 'Critical'
  }

  return (
    <div className="container">
      <div className="header">
        <h1>Data Quality Analyzer</h1>
        <p>Upload CSV or Excel files for instant quality analysis</p>
      </div>

      {!result ? (
        <div className="card">
          <div
            className={`upload-area ${dragActive ? 'active' : ''}`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={() => document.getElementById('fileInput')?.click()}
          >
            <input
              id="fileInput"
              type="file"
              className="file-input"
              onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
              accept=".csv,.xlsx,.xls"
            />
            <div style={{ fontSize: '48px', marginBottom: '10px' }}>📊</div>
            <p style={{ fontSize: '18px', marginBottom: '5px', fontWeight: '600' }}>
              Drop your file here or click to browse
            </p>
            <p style={{ color: '#666', fontSize: '14px' }}>Supports CSV, XLSX, XLS</p>
            {file && (
              <div style={{ marginTop: '20px', padding: '10px', background: '#e3f2fd', borderRadius: '6px' }}>
                <strong>Selected:</strong> {file.name}
              </div>
            )}
          </div>

          {error && <div className="error" style={{ marginTop: '20px' }}>{error}</div>}

          {file && (
            <button className="btn" onClick={analyzeData} disabled={isAnalyzing}>
              {isAnalyzing ? 'Analyzing...' : 'Analyze Data Quality'}
            </button>
          )}

          {isAnalyzing && (
            <div className="loading">
              <div className="spinner"></div>
              <p>Analyzing your data...</p>
            </div>
          )}
        </div>
      ) : (
        <div>
          <div style={{ marginBottom: '20px', textAlign: 'center' }}>
            <button 
              className="btn" 
              onClick={() => { setFile(null); setResult(null); }}
              style={{ maxWidth: '300px' }}
            >
              Analyze Another File
            </button>
          </div>

          <div className="score" style={{ background: getScoreColor(result.qualityScore) }}>
            <div className="score-label">Data Quality Score</div>
            <div className="score-value">{result.qualityScore}/100</div>
            <div className="score-label">{getScoreLabel(result.qualityScore)}</div>
          </div>

          <div className="card">
            <h2 style={{ marginBottom: '20px' }}>Summary Statistics</h2>
            <div className="stats-grid">
              <div className="stat-item">
                <div className="stat-label">Total Rows</div>
                <div className="stat-value">{result.totalRows.toLocaleString()}</div>
              </div>
              <div className="stat-item">
                <div className="stat-label">Total Columns</div>
                <div className="stat-value">{result.totalColumns}</div>
              </div>
              <div className="stat-item">
                <div className="stat-label">Duplicate Rows</div>
                <div className="stat-value">{result.duplicates.toLocaleString()}</div>
              </div>
              <div className="stat-item">
                <div className="stat-label">Missing Values</div>
                <div className="stat-value">{result.missingValues.toLocaleString()}</div>
              </div>
            </div>
          </div>

          {result.issues.length > 0 && (
            <div className="card">
              <h2 style={{ marginBottom: '20px' }}>Detected Issues ({result.issues.length})</h2>
              <div className="issues-list">
                {result.issues.map((issue, idx) => (
                  <div key={idx} className={`issue-item ${issue.severity}`}>
                    <strong>{issue.type}:</strong> {issue.description}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="card">
            <h2 style={{ marginBottom: '20px' }}>Column Analysis</h2>
            <div className="column-stats">
              {result.columnStats.map((col, idx) => (
                <div key={idx} className="column-item">
                  <div className="column-name">{col.name}</div>
                  <div style={{ fontSize: '12px', color: '#666', marginBottom: '5px' }}>
                    Type: {col.dataType} • Missing: {col.missingCount} ({col.missingPercent.toFixed(1)}%)
                  </div>
                  {col.missingCount > 0 && (
                    <div className="progress-bar">
                      <div 
                        className="progress-fill"
                        style={{ 
                          width: `${100 - col.missingPercent}%`,
                          background: col.missingPercent > 50 ? '#F44336' : col.missingPercent > 20 ? '#FFC107' : '#4CAF50'
                        }}
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
  }
      
