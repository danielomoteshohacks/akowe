import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { login, saveUserToStorage } from '../services/api'

const EyeIcon = ({ off }) => off ? (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
    <line x1="1" y1="1" x2="23" y2="23"/>
  </svg>
) : (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
    <circle cx="12" cy="12" r="3"/>
  </svg>
)

const CheckIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
)

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const data = await login(email, password)
      saveUserToStorage(data.access_token, {
        user_id: data.user_id,
        email: data.email,
        full_name: data.full_name,
        business_name: data.business_name,
      })
      navigate('/dashboard')
    } catch (err) {
      const message = err.response?.data?.detail || 'Login failed. Please try again.'
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-wrap">

      {/* Brand panel */}
      <div className="auth-brand">
        <h1 className="auth-brand-logo">Akowe</h1>
        <p className="auth-brand-tagline">Financial intelligence built for African businesses</p>
        <ul className="auth-brand-features">
          <li><CheckIcon /><span>Track income and expenses in real time</span></li>
          <li><CheckIcon /><span>Understand your profit margin at a glance</span></li>
          <li><CheckIcon /><span>Built for Nigerian SMEs — simple by design</span></li>
        </ul>
      </div>

      {/* Form side */}
      <div className="auth-form-side">
        <div className="auth-form-card fade-up">

          <h2 className="auth-form-title">Welcome back</h2>
          <p className="auth-form-subtitle">Log in to your Akowe account</p>

          {error && <div className="auth-error">{error}</div>}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            <div className="float-field">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder=" "
                id="login-email"
                required
              />
              <label htmlFor="login-email">Email address</label>
            </div>

            <div className="float-field">
              <input
                type={showPw ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder=" "
                id="login-password"
                required
                style={{ paddingRight: 44 }}
              />
              <label htmlFor="login-password">Password</label>
              <button
                type="button"
                className="pw-toggle"
                onClick={() => setShowPw(v => !v)}
                tabIndex={-1}
                aria-label={showPw ? 'Hide password' : 'Show password'}
              >
                <EyeIcon off={showPw} />
              </button>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="auth-submit-btn btn-primary"
            >
              {loading ? 'Logging in…' : 'Log in'}
            </button>

          </form>

          <p className="auth-switch">
            Don't have an account?{' '}
            <Link to="/signup">Create one free</Link>
          </p>

        </div>
      </div>

    </div>
  )
}
