// ============================================
// api.js — All backend API calls in one place
//
// This file is the bridge between your React
// frontend and your FastAPI backend.
//
// Every time the frontend needs data from the
// backend, it calls a function from this file.
//
// WHY ONE FILE FOR ALL API CALLS?
// If your backend URL changes, you update it
// in ONE place — not scattered across 10 files.
// ============================================

import axios from 'axios'

// Base URL of your backend
// In development: your local FastAPI server
// In production: your Fly.io URL
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

// ============================================
// axios instance
// Pre-configured with base URL and headers.
// Every request made through this instance
// automatically includes the base URL.
// ============================================
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// ============================================
// REQUEST INTERCEPTOR
// Runs before every API call automatically.
// Adds the JWT token to the Authorization header
// so the backend knows who is making the request.
// ============================================
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('akowe_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// ============================================
// RESPONSE INTERCEPTOR
// Runs after every API response.
// If backend returns 401 (unauthorized),
// it means the token expired — log the user out.
// ============================================
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid — clear storage and redirect
      localStorage.removeItem('akowe_token')
      localStorage.removeItem('akowe_user')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

// ============================================
// AUTH FUNCTIONS
// ============================================

export const signup = async (data) => {
  // data = { email, password, full_name, business_name, business_type }
  const response = await api.post('/auth/signup', data)
  return response.data
}

export const login = async (email, password) => {
  // Sends credentials, gets back token + user info
  const response = await api.post('/auth/login', { email, password })
  return response.data
}

export const getMe = async () => {
  // Gets the current logged-in user's profile
  const response = await api.get('/auth/me')
  return response.data
}

// ============================================
// TRANSACTION FUNCTIONS
// ============================================

export const getTransactions = async (filters = {}) => {
  // filters can include: type, from_date, to_date, limit
  const response = await api.get('/transactions/', { params: filters })
  return response.data
}

export const createTransaction = async (data) => {
  // data = { amount (in kobo), type, category_id, description, transaction_date }
  const response = await api.post('/transactions/', data)
  return response.data
}

export const deleteTransaction = async (id) => {
  const response = await api.delete(`/transactions/${id}`)
  return response.data
}

// ============================================
// ANALYTICS FUNCTIONS
// ============================================

export const getSummary = async () => {
  // Returns: total_income, total_expense, net_profit, profit_margin
  const response = await api.get('/analytics/summary')
  return response.data
}

export const getPnL = async (fromDate, toDate) => {
  // Returns full P&L report with monthly breakdown
  const params = {}
  if (fromDate) params.from_date = fromDate
  if (toDate) params.to_date = toDate
  const response = await api.get('/analytics/pnl', { params })
  return response.data
}

export const getCategoriesBreakdown = async () => {
  // Returns top expense and income categories
  const response = await api.get('/analytics/categories')
  return response.data
}

// ============================================
// EXCHANGE RATE FUNCTIONS
// ============================================

export const getExchangeRate = async () => {
  // Returns today's USD→NGN rate: { date, usd_to_ngn }
  const response = await api.get('/exchange-rate/today')
  return response.data
}

export const refreshExchangeRate = async () => {
  // Forces a fresh fetch from ExchangeRate-API
  const response = await api.post('/exchange-rate/refresh')
  return response.data
}

// ============================================
// HELPER FUNCTIONS
// ============================================

export const saveUserToStorage = (token, user) => {
  // Called after login/signup — saves to localStorage
  localStorage.setItem('akowe_token', token)
  localStorage.setItem('akowe_user', JSON.stringify(user))
}

export const getUserFromStorage = () => {
  // Returns the saved user object or null
  const user = localStorage.getItem('akowe_user')
  return user ? JSON.parse(user) : null
}

export const logout = () => {
  // Clears everything and goes to login
  localStorage.removeItem('akowe_token')
  localStorage.removeItem('akowe_user')
  window.location.href = '/login'
}

export default api