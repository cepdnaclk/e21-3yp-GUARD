import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import guardLogo from '../assets/guard-logo.png';
import '../styles/auth.css';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

export default function Login() {
  const navigate = useNavigate();
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
    <div className="auth-page login-page">
      <div className="auth-brand">
        <img src={guardLogo} alt="G.U.A.R.D logo" className="auth-brand-logo" />
        <span>G.U.A.R.D</span>
      </div>

      <div className="auth-card login-card">
        <button className="card-close-btn" onClick={() => navigate(-1)} aria-label="Go back">&times;</button>
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
            <div className="auth-divider">
              <hr />
              <span>or</span>
              <hr />
            </div>
            <div ref={googleBtnRef} style={{ display: 'flex', justifyContent: 'center' }} />
          </>
        )}

        <p className="auth-footer">
          Don't have an account? <Link to="/register">Register</Link>
        </p>
      </div>
    </div>
  );
}
