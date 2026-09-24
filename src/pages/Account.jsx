import { useState } from 'react';
import { useAuth } from '../AuthContext.jsx';
import { useMenuNav } from '../engine/useController';

export default function Account() {
  useMenuNav(false); // typing in the form shouldn't fight the D-pad menu nav
  const { user, loading, login, register, confirmRegistration, logout } = useAuth();
  const [mode, setMode] = useState('login'); // 'login' | 'register' | 'confirm'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  if (loading) {
    return (
      <main className="np-page np-account">
        <p>Checking your session...</p>
      </main>
    );
  }

  if (user) {
    return (
      <main className="np-page np-account">
        <h1>Your Account</h1>
        <p className="np-account-email">Signed in as {user.email}</p>
        <button className="np-btn np-btn-secondary" onClick={logout}>
          Sign Out
        </button>
      </main>
    );
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    if (mode === 'login') {
      const result = await login(email, password);
      if (!result.success) setError(result.error);
    } else if (mode === 'register') {
      const result = await register(email, password);
      if (!result.success) setError(result.error);
      else if (result.needsConfirmation) setMode('confirm');
    } else {
      const result = await confirmRegistration(email, code, password);
      if (!result.success) setError(result.error);
    }
    setSubmitting(false);
  }

  return (
    <main className="np-page np-account">
      <h1>Sign In</h1>
      <p className="np-account-sub">Same account as Nextlayer3D — sign up here works there too.</p>

      <form className="np-account-form" onSubmit={handleSubmit}>
        <div className="np-account-tabs">
          <button
            type="button"
            className={mode === 'login' ? 'np-account-tab active' : 'np-account-tab'}
            onClick={() => { setMode('login'); setError(null); }}
          >
            Sign In
          </button>
          <button
            type="button"
            className={mode === 'register' ? 'np-account-tab active' : 'np-account-tab'}
            onClick={() => { setMode('register'); setError(null); }}
          >
            Sign Up
          </button>
        </div>

        <label className="np-account-label">Email</label>
        <input
          className="np-account-input"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        <label className="np-account-label">Password</label>
        <input
          className="np-account-input"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        {mode === 'confirm' && (
          <>
            <label className="np-account-label">Confirmation Code</label>
            <input
              className="np-account-input"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Check your email"
              required
            />
          </>
        )}

        {error && <p className="np-account-error">{error}</p>}

        <button className="np-btn np-btn-primary" type="submit" disabled={submitting}>
          {submitting
            ? 'Please wait...'
            : mode === 'login'
            ? 'Sign In'
            : mode === 'register'
            ? 'Create Account'
            : 'Confirm Account'}
        </button>
      </form>
    </main>
  );
}
