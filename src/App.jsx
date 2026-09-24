import { useState } from 'react'
import { AuthProvider, useAuth } from './AuthContext.jsx'
import './App.css'

function AuthWidget() {
  const { user, loading, login, register, confirmRegistration, logout } = useAuth()
  const [mode, setMode] = useState('login') // 'login' | 'register' | 'confirm'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [code, setCode] = useState('')
  const [error, setError] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  if (loading) return <p className="np-auth-status">Checking your session...</p>

  if (user) {
    return (
      <div className="np-auth-card">
        <p className="np-auth-status">
          Signed in as <strong>{user.email}</strong>
        </p>
        <button className="np-btn np-btn-ghost" onClick={logout}>
          Sign out
        </button>
      </div>
    )
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    if (mode === 'login') {
      const result = await login(email, password)
      if (!result.success) setError(result.error)
    } else if (mode === 'register') {
      const result = await register(email, password)
      if (!result.success) setError(result.error)
      else if (result.needsConfirmation) setMode('confirm')
    } else {
      const result = await confirmRegistration(email, code, password)
      if (!result.success) setError(result.error)
    }
    setSubmitting(false)
  }

  return (
    <form className="np-auth-card" onSubmit={handleSubmit}>
      <div className="np-auth-tabs">
        <button
          type="button"
          className={mode === 'login' ? 'np-auth-tab active' : 'np-auth-tab'}
          onClick={() => { setMode('login'); setError(null) }}
        >
          Sign In
        </button>
        <button
          type="button"
          className={mode === 'register' ? 'np-auth-tab active' : 'np-auth-tab'}
          onClick={() => { setMode('register'); setError(null) }}
        >
          Sign Up
        </button>
      </div>

      <label className="np-field-label">Email</label>
      <input
        className="np-input"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
      />

      <label className="np-field-label">Password</label>
      <input
        className="np-input"
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
      />

      {mode === 'confirm' && (
        <>
          <label className="np-field-label">Confirmation Code</label>
          <input
            className="np-input"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="Check your email"
            required
          />
        </>
      )}

      {error && <p className="np-auth-error">{error}</p>}

      <button className="np-btn np-btn-primary" type="submit" disabled={submitting}>
        {submitting
          ? 'Please wait...'
          : mode === 'login'
          ? 'Sign In'
          : mode === 'register'
          ? 'Create Account'
          : 'Confirm Account'}
      </button>

      <p className="np-auth-note">
        Same account as Nextlayer3D — sign up here works there too.
      </p>
    </form>
  )
}

function AppShell() {
  return (
    <div className="np-page">
      <header className="np-header">
        <span className="np-logo">🕹️ Nextplayer</span>
        <a className="np-back-link" href="https://nextlayer3d.app">
          ← Back to Nextlayer3D
        </a>
      </header>

      <section className="np-hero">
        <h1>Nextplayer</h1>
        <p className="np-tagline">The arcade wing of Nextlayer3D.</p>
      </section>

      <AuthWidget />

      <section className="np-coming-soon">
        <h2>Games are coming</h2>
        <p>
          This is the starter shell only — no games are built yet. Sign in works
          against your real Nextlayer3D account already; everything else here
          is a placeholder.
        </p>
      </section>
    </div>
  )
}

function App() {
  return (
    <AuthProvider>
      <AppShell />
    </AuthProvider>
  )
}

export default App
