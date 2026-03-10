import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

export default function Login() {
  const { login, googleLogin } = useAuth();
  const [form, setForm] = useState({ login: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const googleBtnRef = useRef(null);

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) return;

    const init = () => {
      if (!window.google || !googleBtnRef.current) return;
      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: async ({ credential }) => {
          setError('');
          try {
            await googleLogin(credential);
          } catch (err) {
            setError(err.message);
          }
        },
      });
      window.google.accounts.id.renderButton(googleBtnRef.current, {
        theme: 'outline',
        size: 'large',
        width: '100%',
        text: 'signin_with',
      });
    };

    if (window.google) {
      init();
    } else {
      window.onGoogleLibraryLoad = init;
    }
    return () => { window.onGoogleLibraryLoad = null; };
  }, [googleLogin]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await login(form);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1>Welcome Back</h1>
        <p className="subtitle">Sign in to G.U.A.R.D Dashboard</p>

        {error && <p className="error-msg">{error}</p>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Username or Email</label>
            <input
              type="text"
              value={form.login}
              onChange={(e) => setForm({ ...form, login: e.target.value })}
              placeholder="Enter username or email"
              required
            />
          </div>
          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              placeholder="Enter password"
              required
            />
          </div>
          <button type="submit" className="btn btn-primary" disabled={busy}>
            {busy ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        {GOOGLE_CLIENT_ID && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: '1rem 0' }}>
              <hr style={{ flex: 1, borderColor: 'var(--border)' }} />
              <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>or</span>
              <hr style={{ flex: 1, borderColor: 'var(--border)' }} />
            </div>
            <div ref={googleBtnRef} style={{ display: 'flex', justifyContent: 'center' }} />
          </>
        )}

        <p style={{ marginTop: '1.25rem', textAlign: 'center', fontSize: '0.9rem' }}>
          Don't have an account? <Link to="/register">Register</Link>
        </p>
      </div>
    </div>
  );
}
