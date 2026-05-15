import './App.css'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { createContext, useContext, useLayoutEffect, useState } from 'react'
import Login from './pages/Login'
import Signup from './pages/Signup'
import Dashboard from './pages/Dashboard'

export const ThemeContext = createContext({ theme: 'light', toggleTheme: () => {} })
export const useTheme = () => useContext(ThemeContext)

function ProtectedRoute({ children }) {
  const token = localStorage.getItem('akowe_token')
  if (!token) return <Navigate to="/login" replace />
  return children
}

function App() {
  const [theme, setTheme] = useState(() => localStorage.getItem('akowe_theme') || 'light')

  useLayoutEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('akowe_theme', theme)
  }, [theme])

  const toggleTheme = () => setTheme(t => t === 'light' ? 'dark' : 'light')

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
        </Routes>
      </BrowserRouter>
    </ThemeContext.Provider>
  )
}

export default App
