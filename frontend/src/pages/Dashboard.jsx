import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  getSummary,
  getTransactions,
  createTransaction,
  deleteTransaction,
  logout,
  getUserFromStorage,
} from '../services/api'
import { useTheme } from '../App'

// ---- Icons ----
const IncomeIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/>
    <polyline points="17 6 23 6 23 12"/>
  </svg>
)
const ExpenseIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="23 18 13.5 8.5 8.5 13.5 1 6"/>
    <polyline points="17 18 23 18 23 12"/>
  </svg>
)
const ProfitIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="20" x2="18" y2="10"/>
    <line x1="12" y1="20" x2="12" y2="4"/>
    <line x1="6" y1="20" x2="6" y2="14"/>
  </svg>
)
const MarginIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21.21 15.89A10 10 0 1 1 8 2.83"/>
    <path d="M22 12A10 10 0 0 0 12 2v10z"/>
  </svg>
)
const SunIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="5"/>
    <line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/>
    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
    <line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/>
    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
  </svg>
)
const MoonIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
  </svg>
)
const EmptyIcon = () => (
  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--border)', marginBottom: 16 }}>
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
    <polyline points="14 2 14 8 20 8"/>
    <line x1="16" y1="13" x2="8" y2="13"/>
    <line x1="16" y1="17" x2="8" y2="17"/>
    <polyline points="10 9 9 9 8 9"/>
  </svg>
)

// ---- Animated counter ----
function AnimatedValue({ target, formatter, duration = 800 }) {
  const [displayed, setDisplayed] = useState(0)
  const rafRef = useRef(null)

  useEffect(() => {
    if (target === null || target === undefined) return
    const num = Number(target) || 0
    const startTime = Date.now()

    const tick = () => {
      const elapsed = Date.now() - startTime
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setDisplayed(Math.round(num * eased))
      if (progress < 1) rafRef.current = requestAnimationFrame(tick)
    }

    cancelAnimationFrame(rafRef.current)
    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [target, duration])

  return <>{formatter ? formatter(displayed) : displayed}</>
}

function getInitials(name) {
  if (!name) return '?'
  const parts = name.trim().split(' ')
  if (parts.length === 1) return parts[0][0].toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

function formatDate(dateStr) {
  if (!dateStr) return '—'
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export default function Dashboard() {
  const navigate = useNavigate()
  const user = getUserFromStorage()
  const { theme, toggleTheme } = useTheme()

  const [summary, setSummary] = useState(null)
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({
    amount_naira: '',
    type: 'income',
    description: '',
    transaction_date: new Date().toISOString().split('T')[0],
  })
  const [formLoading, setFormLoading] = useState(false)
  const [formError, setFormError] = useState('')
  const [newTxId, setNewTxId] = useState(null)

  useEffect(() => { loadDashboard() }, [])

  const loadDashboard = async () => {
    setLoading(true)
    setError('')
    try {
      const [summaryData, txData] = await Promise.all([
        getSummary(),
        getTransactions({ limit: 10 }),
      ])
      setSummary(summaryData)
      setTransactions(txData.transactions || [])
    } catch {
      setError('Could not load dashboard. Please refresh.')
    } finally {
      setLoading(false)
    }
  }

  const handleAddTransaction = async (e) => {
    e.preventDefault()
    setFormError('')
    setFormLoading(true)

    try {
      const amountKobo = Math.round(parseFloat(formData.amount_naira) * 100)

      if (isNaN(amountKobo) || amountKobo <= 0) {
        setFormError('Please enter a valid amount.')
        setFormLoading(false)
        return
      }

      const created = await createTransaction({
        amount: amountKobo,
        type: formData.type,
        description: formData.description,
        transaction_date: formData.transaction_date,
      })

      setFormData({
        amount_naira: '',
        type: 'income',
        description: '',
        transaction_date: new Date().toISOString().split('T')[0],
      })
      setShowForm(false)
      setNewTxId(created?.id || null)
      await loadDashboard()
      setTimeout(() => setNewTxId(null), 2200)

    } catch (err) {
      setFormError(err.response?.data?.detail || 'Failed to add transaction.')
    } finally {
      setFormLoading(false)
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this transaction?')) return
    try {
      await deleteTransaction(id)
      await loadDashboard()
    } catch {
      alert('Could not delete transaction.')
    }
  }

  const formatNaira = (amount) =>
    new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0,
    }).format(amount || 0)

  const healthColor = {
    healthy:   'var(--income)',
    excellent: 'var(--income)',
    warning:   'var(--warning)',
    loss:      'var(--expense)',
    no_data:   'var(--text-muted)',
  }

  // ---- Skeleton ----
  if (loading) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: 'var(--bg-base)' }}>
        <nav style={styles.nav}>
          <span style={styles.navLogo}>Akowe</span>
        </nav>
        <main style={styles.main}>
          <div style={styles.cardGrid}>
            {[1,2,3,4].map(i => (
              <div key={i} className="elevated-card" style={styles.summaryCard}>
                <div className="skeleton" style={{ height: 10, width: '55%', marginBottom: 20 }} />
                <div className="skeleton" style={{ height: 28, width: '72%', marginBottom: 12 }} />
                <div className="skeleton" style={{ height: 9, width: '40%' }} />
              </div>
            ))}
          </div>
          <div className="skeleton" style={{ height: 48, borderRadius: 8, marginBottom: 16 }} />
          <div className="skeleton" style={{ height: 280, borderRadius: 12 }} />
        </main>
      </div>
    )
  }

  const netProfitColor = (summary?.net_profit || 0) >= 0 ? 'var(--income)' : 'var(--expense)'
  const marginPct = Math.min(Math.max(summary?.profit_margin || 0, 0), 100)

  const cards = [
    {
      label:     'Total Income',
      rawVal:    summary?.total_income || 0,
      color:     'var(--income)',
      dotColor:  'var(--income)',
      iconBg:    'var(--accent-light)',
      iconColor: 'var(--income)',
      Icon:      IncomeIcon,
      cls:       'fade-up-1',
    },
    {
      label:     'Total Expenses',
      rawVal:    summary?.total_expense || 0,
      color:     'var(--expense)',
      dotColor:  'var(--expense)',
      iconBg:    'rgba(200,75,49,0.1)',
      iconColor: 'var(--expense)',
      Icon:      ExpenseIcon,
      cls:       'fade-up-2',
    },
    {
      label:     'Net Profit',
      rawVal:    summary?.net_profit || 0,
      color:     netProfitColor,
      dotColor:  netProfitColor,
      iconBg:    'rgba(96,165,250,0.12)',
      iconColor: '#60A5FA',
      Icon:      ProfitIcon,
      cls:       'fade-up-3',
    },
    {
      label:      'Profit Margin',
      rawVal:     null,
      displayVal: `${summary?.profit_margin || 0}%`,
      color:      healthColor[summary?.health_status] || 'var(--text-muted)',
      dotColor:   healthColor[summary?.health_status] || 'var(--text-muted)',
      iconBg:     'rgba(194,125,42,0.12)',
      iconColor:  'var(--warning)',
      Icon:       MarginIcon,
      cls:        'fade-up-4',
      sub:        summary?.health_message,
      isMargin:   true,
    },
  ]

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--bg-base)' }}>

      {/* ---- NAVBAR ---- */}
      <nav style={styles.nav}>
        <div style={styles.navLeft}>
          <span style={styles.navLogo}>Akowe</span>
          <span style={styles.navSep} aria-hidden="true" />
          <span style={styles.navBizName} className="nav-center">
            {user?.business_name}
          </span>
        </div>

        <div style={styles.navRight}>
          <button
            onClick={toggleTheme}
            style={styles.themeToggle}
            className="theme-toggle"
            title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
          </button>

          <div style={styles.avatar} aria-hidden="true">
            {getInitials(user?.full_name)}
          </div>

          <span style={styles.navUser} className="hide-mobile">{user?.full_name}</span>

          <button onClick={logout} style={styles.logoutBtn} className="btn-ghost">
            Log out
          </button>
        </div>
      </nav>

      {/* ---- MAIN ---- */}
      <main style={styles.main}>

        {error && <div style={styles.errorBox}>{error}</div>}

        {/* ---- SUMMARY CARDS ---- */}
        <div style={styles.cardGrid}>
          {cards.map(({ label, rawVal, displayVal, color, dotColor, iconBg, iconColor, Icon, cls, sub, isMargin }) => (
            <div
              key={label}
              className={`summary-card elevated-card ${cls}`}
              style={styles.summaryCard}
            >
              <div style={styles.cardHeader}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                  <span style={{
                    width: 7,
                    height: 7,
                    borderRadius: '50%',
                    backgroundColor: dotColor,
                    flexShrink: 0,
                    display: 'inline-block',
                  }} />
                  <p style={styles.cardLabel}>{label}</p>
                </div>
                <div style={{ ...styles.iconWrap, backgroundColor: iconBg, color: iconColor }}>
                  <Icon />
                </div>
              </div>

              <p style={{ ...styles.cardValue, color }}>
                {rawVal !== null
                  ? <AnimatedValue target={rawVal} formatter={formatNaira} />
                  : displayVal
                }
              </p>

              {isMargin && (
                <div style={styles.marginBar}>
                  <div style={{ ...styles.marginFill, width: `${marginPct}%`, backgroundColor: dotColor }} />
                </div>
              )}

              {sub && (
                <p style={{ fontSize: '11px', color, marginTop: 6, fontWeight: 500 }}>{sub}</p>
              )}
            </div>
          ))}
        </div>

        {/* ---- SECTION HEADER ---- */}
        <div style={styles.sectionHeader} className="fade-up">
          <h2 style={styles.sectionTitle}>Recent Transactions</h2>
          <button
            onClick={() => setShowForm(!showForm)}
            className="btn-primary"
            style={{
              ...styles.addBtn,
              backgroundColor: showForm ? 'var(--bg-elevated)' : 'var(--accent)',
              color: showForm ? 'var(--text-secondary)' : '#fff',
              border: showForm ? '1px solid var(--border)' : 'none',
            }}
          >
            {showForm ? '✕ Cancel' : '+ Add Transaction'}
          </button>
        </div>

        {/* ---- ADD TRANSACTION FORM ---- */}
        {showForm && (
          <div className="slide-down elevated-card" style={styles.formCard}>
            <h3 style={styles.formTitle}>New Transaction</h3>

            {formError && <div style={styles.errorBox}>{formError}</div>}

            <form onSubmit={handleAddTransaction} style={styles.formGrid}>
              <div style={styles.field}>
                <label style={styles.label} htmlFor="f-amount">Amount (₦)</label>
                <input
                  id="f-amount"
                  type="number"
                  value={formData.amount_naira}
                  onChange={(e) => setFormData({ ...formData, amount_naira: e.target.value })}
                  placeholder="e.g. 5000"
                  required
                  min="1"
                  style={styles.input}
                  className="themed-input"
                />
              </div>

              <div style={styles.field}>
                <label style={styles.label} htmlFor="f-type">Type</label>
                <select
                  id="f-type"
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  style={styles.input}
                  className="themed-input"
                >
                  <option value="income">Income</option>
                  <option value="expense">Expense</option>
                </select>
              </div>

              <div style={styles.field}>
                <label style={styles.label} htmlFor="f-desc">Description</label>
                <input
                  id="f-desc"
                  type="text"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="e.g. Client payment, Generator fuel"
                  style={styles.input}
                  className="themed-input"
                />
              </div>

              <div style={styles.field}>
                <label style={styles.label} htmlFor="f-date">Date</label>
                <input
                  id="f-date"
                  type="date"
                  value={formData.transaction_date}
                  onChange={(e) => setFormData({ ...formData, transaction_date: e.target.value })}
                  required
                  style={styles.input}
                  className="themed-input"
                />
              </div>

              <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  type="submit"
                  disabled={formLoading}
                  className="btn-primary"
                  style={{
                    backgroundColor: 'var(--accent)',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '10px 24px',
                    fontSize: '13px',
                    fontWeight: '600',
                    cursor: formLoading ? 'not-allowed' : 'pointer',
                    opacity: formLoading ? 0.7 : 1,
                    minWidth: 140,
                  }}
                >
                  {formLoading ? 'Saving…' : 'Save Transaction'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ---- TRANSACTIONS ---- */}
        <div className="elevated-card fade-up" style={styles.tableCard}>
          {transactions.length === 0 ? (
            <div style={styles.emptyState}>
              <EmptyIcon />
              <p style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 8 }}>
                Your financial story starts here
              </p>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)', maxWidth: 280, lineHeight: 1.6 }}>
                Add your first transaction to see your numbers come alive.
              </p>
            </div>
          ) : (
            <>
              {/* Desktop table */}
              <div className="tx-desktop" style={{ overflowX: 'auto' }}>
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th style={styles.th}>Date</th>
                      <th style={styles.th} className="hide-mobile">Description</th>
                      <th style={styles.th}>Type</th>
                      <th style={{ ...styles.th, textAlign: 'right' }}>Amount</th>
                      <th style={styles.th}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {transactions.map((tx) => (
                      <tr
                        key={tx.id}
                        className={`tx-row${tx.id === newTxId ? ' tx-row-new' : ''}`}
                        style={styles.tr}
                      >
                        <td style={{ ...styles.td, ...styles.mono, color: 'var(--text-muted)', fontSize: '12px' }}>
                          {formatDate(tx.transaction_date)}
                        </td>
                        <td style={{ ...styles.td, color: 'var(--text-primary)', fontWeight: 500 }} className="hide-mobile">
                          {tx.description || tx.category_name || '—'}
                        </td>
                        <td style={styles.td}>
                          <span style={{
                            ...styles.badge,
                            backgroundColor: tx.type === 'income'
                              ? 'var(--accent-light)' : 'rgba(200,75,49,0.08)',
                            color: tx.type === 'income' ? 'var(--income)' : 'var(--expense)',
                          }}>
                            {tx.type}
                          </span>
                        </td>
                        <td style={{
                          ...styles.td,
                          ...styles.mono,
                          textAlign: 'right',
                          fontSize: '14px',
                          fontWeight: '500',
                          color: tx.type === 'income' ? 'var(--income)' : 'var(--expense)',
                        }}>
                          {tx.type === 'expense' ? '−' : '+'}{formatNaira(tx.amount_naira)}
                        </td>
                        <td style={styles.td}>
                          <button
                            onClick={() => handleDelete(tx.id)}
                            className="delete-btn"
                            style={styles.deleteBtn}
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile card list */}
              <div className="tx-mobile">
                {transactions.map((tx) => (
                  <div
                    key={tx.id}
                    style={{
                      padding: '14px 16px',
                      borderBottom: '1px solid var(--border-subtle)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{
                        fontSize: '14px',
                        color: 'var(--text-primary)',
                        fontWeight: 500,
                        marginBottom: 3,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}>
                        {tx.description || tx.category_name || '—'}
                      </p>
                      <p style={{ fontSize: '12px', color: 'var(--text-muted)', fontFamily: "'DM Mono', monospace" }}>
                        {formatDate(tx.transaction_date)}
                      </p>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
                      <span style={{
                        fontSize: '14px',
                        fontWeight: 500,
                        color: tx.type === 'income' ? 'var(--income)' : 'var(--expense)',
                        fontFamily: "'DM Mono', monospace",
                        fontFeatureSettings: '"tnum"',
                        whiteSpace: 'nowrap',
                      }}>
                        {tx.type === 'expense' ? '−' : '+'}{formatNaira(tx.amount_naira)}
                      </span>
                      <button
                        onClick={() => handleDelete(tx.id)}
                        style={{
                          fontSize: '11px',
                          padding: '3px 10px',
                          border: '1px solid var(--border)',
                          borderRadius: '4px',
                          backgroundColor: 'transparent',
                          color: 'var(--text-muted)',
                          cursor: 'pointer',
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

      </main>
    </div>
  )
}

const styles = {
  nav: {
    backgroundColor: 'var(--bg-surface)',
    borderBottom: '1px solid var(--border-subtle)',
    padding: '0 24px',
    height: '56px',
    display: 'flex',
    alignItems: 'center',
    position: 'sticky',
    top: 0,
    zIndex: 100,
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
    transition: 'background-color 200ms ease, border-color 200ms ease',
  },
  navLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    flex: 1,
    minWidth: 0,
  },
  navLogo: {
    fontFamily: "'DM Sans', system-ui, sans-serif",
    fontSize: '18px',
    fontWeight: '700',
    color: 'var(--accent)',
    letterSpacing: '-0.3px',
    flexShrink: 0,
  },
  navSep: {
    display: 'inline-block',
    width: '1px',
    height: '16px',
    backgroundColor: 'var(--border)',
    flexShrink: 0,
  },
  navBizName: {
    fontSize: '13px',
    color: 'var(--text-muted)',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  navRight: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: '8px',
  },
  themeToggle: {
    width: '32px',
    height: '32px',
    borderRadius: '6px',
    border: '1px solid var(--border)',
    backgroundColor: 'transparent',
    color: 'var(--text-secondary)',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  avatar: {
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    backgroundColor: 'var(--accent)',
    color: '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '12px',
    fontWeight: '700',
    flexShrink: 0,
    letterSpacing: '0.02em',
  },
  navUser: {
    fontSize: '13px',
    color: 'var(--text-secondary)',
    whiteSpace: 'nowrap',
  },
  logoutBtn: {
    fontSize: '12px',
    padding: '6px 14px',
    border: '1px solid var(--border)',
    borderRadius: '6px',
    backgroundColor: 'transparent',
    color: 'var(--text-secondary)',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  },
  main: {
    maxWidth: '1120px',
    margin: '0 auto',
    padding: '36px 24px 56px',
  },
  errorBox: {
    backgroundColor: 'rgba(200,75,49,0.08)',
    border: '1px solid rgba(200,75,49,0.2)',
    borderRadius: '8px',
    padding: '10px 14px',
    fontSize: '13px',
    color: 'var(--expense)',
    marginBottom: '24px',
  },
  cardGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '16px',
    marginBottom: '36px',
  },
  summaryCard: {
    backgroundColor: 'var(--bg-surface)',
    borderRadius: '12px',
    border: '1px solid var(--border-subtle)',
    padding: '22px 20px 18px',
    boxShadow: 'var(--shadow-sm)',
  },
  cardHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '14px',
  },
  cardLabel: {
    fontSize: '11px',
    color: 'var(--text-muted)',
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    fontWeight: '600',
    margin: 0,
  },
  iconWrap: {
    width: '30px',
    height: '30px',
    borderRadius: '6px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  cardValue: {
    fontSize: '26px',
    fontWeight: '500',
    fontFamily: "'DM Sans', system-ui, sans-serif",
    margin: 0,
    letterSpacing: '-0.5px',
    lineHeight: 1.15,
  },
  marginBar: {
    height: '3px',
    borderRadius: '2px',
    backgroundColor: 'var(--border)',
    overflow: 'hidden',
    marginTop: '12px',
  },
  marginFill: {
    height: '100%',
    borderRadius: '2px',
    transition: 'width 800ms ease',
  },
  sectionHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '16px',
  },
  sectionTitle: {
    fontSize: '15px',
    fontWeight: '600',
    color: 'var(--text-primary)',
    margin: 0,
  },
  addBtn: {
    borderRadius: '6px',
    padding: '9px 18px',
    fontSize: '13px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  formCard: {
    backgroundColor: 'var(--bg-surface)',
    borderRadius: '12px',
    border: '1px solid var(--border)',
    padding: '24px',
    marginBottom: '16px',
    boxShadow: 'var(--shadow-sm)',
  },
  formTitle: {
    fontSize: '14px',
    fontWeight: '600',
    color: 'var(--text-primary)',
    margin: '0 0 16px',
  },
  formGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
    gap: '16px',
  },
  field: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  label: {
    fontSize: '12px',
    fontWeight: '500',
    color: 'var(--text-secondary)',
  },
  input: {
    padding: '10px 12px',
    borderRadius: '6px',
    fontSize: '13px',
    width: '100%',
    fontFamily: "'DM Sans', system-ui, sans-serif",
  },
  mono: {
    fontFamily: "'DM Mono', 'Courier New', monospace",
    fontFeatureSettings: '"tnum"',
  },
  tableCard: {
    backgroundColor: 'var(--bg-surface)',
    borderRadius: '12px',
    border: '1px solid var(--border-subtle)',
    overflow: 'hidden',
    boxShadow: 'var(--shadow-sm)',
  },
  emptyState: {
    padding: '64px 24px',
    textAlign: 'center',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    minWidth: '480px',
  },
  th: {
    padding: '12px 16px',
    textAlign: 'left',
    fontSize: '11px',
    fontWeight: '600',
    color: 'var(--text-muted)',
    textTransform: 'uppercase',
    letterSpacing: '0.07em',
    borderBottom: '1px solid var(--border-subtle)',
    backgroundColor: 'var(--bg-base)',
    whiteSpace: 'nowrap',
  },
  tr: {
    borderBottom: '1px solid var(--border-subtle)',
  },
  td: {
    padding: '14px 16px',
    fontSize: '13px',
    color: 'var(--text-secondary)',
  },
  badge: {
    display: 'inline-block',
    padding: '3px 10px',
    borderRadius: '20px',
    fontSize: '11px',
    fontWeight: '600',
    textTransform: 'capitalize',
    letterSpacing: '0.03em',
  },
  deleteBtn: {
    fontSize: '11px',
    padding: '4px 10px',
    border: '1px solid var(--border)',
    borderRadius: '4px',
    backgroundColor: 'transparent',
    color: 'var(--text-muted)',
    cursor: 'pointer',
  },
}
