import { useState, useEffect } from 'react'
import './App.css'

const API_URL = import.meta.env.VITE_API_URL

function App() {
  const [status, setStatus] = useState('Loading...')
  const [error, setError] = useState(null)

  useEffect(() => {
    fetch(`${API_URL}/`)
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return res.json()
      })
      .then(data => {
        setStatus(data.message)
        setError(null)
      })
      .catch(err => {
        setError(err.message)
        setStatus('Could not reach backend')
      })
  }, [])

  return (
    <div className="container">
      <div className="card">
        <h1>Akowe</h1>
        <p className="subtitle">Financial intelligence for African businesses</p>
        <div className="status-box">
          {error ? (
            <p className="error">Error: {error}</p>
          ) : (
            <>
              <p className="label">Backend Status:</p>
              <p className="message">{status}</p>
            </>
          )}
        </div>
        <div className="info">
          <p>🚀 Phase 0 is working!</p>
          <p>Frontend (React) → Backend (FastAPI) → Supabase</p>
        </div>
      </div>
    </div>
  )
}

export default App