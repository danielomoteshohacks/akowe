import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { signup, saveUserToStorage } from '../services/api'

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

export default function Signup() {
  const [form, setForm] = useState({
    full_name: '',
    email: '',
    password: '',
    business_name: '',
    business_type: 'trading',
  })
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value })

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    if (form.password.length < 8) {
      setError('Password must be at least 8 characters.')
      setLoading(false)
      return
    }

    try {
      const data = await signup(form)
      saveUserToStorage(data.access_token, {
        user_id: data.user_id,
        email: data.email,
        full_name: data.full_name,
        business_name: data.business_name,
      })
      navigate('/dashboard')
    } catch (err) {
      const message = err.response?.data?.detail || 'Signup failed. Please try again.'
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
        <p className="auth-brand-tagline">Your business finances, finally clear</p>
        <ul className="auth-brand-features">
          <li><CheckIcon /><span>Free to start — no credit card needed</span></li>
          <li><CheckIcon /><span>See your profit and loss in seconds</span></li>
          <li><CheckIcon /><span>Designed for traders, consultants, and shop owners</span></li>
        </ul>
      </div>

      {/* Form side */}
      <div className="auth-form-side">
        <div className="auth-form-card fade-up">

          <h2 className="auth-form-title">Create your account</h2>
          <p className="auth-form-subtitle">Free to start. No credit card needed.</p>

          {error && <div className="auth-error">{error}</div>}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            <div className="float-field">
              <input
                name="full_name"
                type="text"
                value={form.full_name}
                onChange={handleChange}
                placeholder=" "
                id="su-fullname"
                required
              />
              <label htmlFor="su-fullname">Full name</label>
            </div>

            <div className="float-field">
              <input
                name="email"
                type="email"
                value={form.email}
                onChange={handleChange}
                placeholder=" "
                id="su-email"
                required
              />
              <label htmlFor="su-email">Email address</label>
            </div>

            <div className="float-field">
              <input
                name="password"
                type={showPw ? 'text' : 'password'}
                value={form.password}
                onChange={handleChange}
                placeholder=" "
                id="su-password"
                required
                style={{ paddingRight: 44 }}
              />
              <label htmlFor="su-password">Password (min 8 chars)</label>
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

            <div className="float-field">
              <input
                name="business_name"
                type="text"
                value={form.business_name}
                onChange={handleChange}
                placeholder=" "
                id="su-biz"
                required
              />
              <label htmlFor="su-biz">Business name</label>
            </div>

            <div className="float-field">
              <select
                name="business_type"
                value={form.business_type}
                onChange={handleChange}
                className={form.business_type ? 'has-value' : ''}
                id="su-biztype"
              >
                <option value="trading">Trading / Buying &amp; Selling</option>
                <option value="services">Services</option>
                <option value="manufacturing">Manufacturing</option>
                <option value="food">Food &amp; Catering</option>
                <option value="fashion">Fashion &amp; Textiles</option>
                <option value="tech">Technology</option>
                <option value="logistics">Logistics &amp; Transport</option>
                <option value="agriculture">Agriculture</option>
                <option value="retail">Retail Shop</option>
                <option value="freelance">Freelance / Consulting</option>
                <option value="other">Other</option>
              </select>
              <label htmlFor="su-biztype">Business type</label>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="auth-submit-btn btn-primary"
            >
              {loading ? 'Creating account…' : 'Create account'}
            </button>

          </form>

          <p className="auth-switch">
            Already have an account?{' '}
            <Link to="/login">Log in</Link>
          </p>

        </div>
      </div>

    </div>
  )
}
