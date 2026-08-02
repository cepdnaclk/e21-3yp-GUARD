import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import ForgotPasswordFlow from '../components/auth/ForgotPasswordFlow';
import EmailVerificationBanner from '../components/auth/EmailVerificationBanner';
import PublicNav from '../components/PublicNav';
import '../styles/auth.css';

function EyeIcon({ show }) {
  if (show) {
    // Classic eye icon (open)
    return (
      <svg viewBox="0 0 24 24" className="w-5 h-5 stroke-current" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
        <circle cx="12" cy="12" r="3" />
      </svg>
    );
  }
  // Classic eye slash icon (closed/hidden)
  return (
    <svg viewBox="0 0 24 24" className="w-5 h-5 stroke-current" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  );
}

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [form, setForm] = useState({ username: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [unverifiedUser, setUnverifiedUser] = useState(null);
  const [successMsg, setSuccessMsg] = useState('');
  const [showForgot, setShowForgot] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setUnverifiedUser(null);
    setSuccessMsg('');
    setBusy(true);
    try {
      await login({ username: form.username.trim(), password: form.password });
    } catch (err) {
      if (err.message?.toLowerCase().includes('email not verified')) {
        setUnverifiedUser(form.username);
      } else {
        setError(err.message);
      }
    } finally {
      setBusy(false);
    }
  };

  const set = (field) => (e) => setForm((prev) => ({ ...prev, [field]: e.target.value }));

  // ---------- Render ----------

  if (showForgot) {
    return (
      <div className="auth-wrapper">
        <div className="auth-page login-page">
          <ForgotPasswordFlow
            onClose={() => setShowForgot(false)}
            onSuccess={(msg) => { setShowForgot(false); setSuccessMsg(msg); }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="auth-wrapper">
      <PublicNav />
      <div className="auth-page login-page">
        <div className="auth-card login-card">
          <button className="card-close-btn" onClick={() => navigate('/')} aria-label="Go back">&times;</button>
          <h1>Welcome Back</h1>
          <p className="subtitle">Sign in to G.U.A.R.D Dashboard</p>

          {error && <p className="error-msg">{error}</p>}
          {successMsg && <p className="profile-success-msg">{successMsg}</p>}

          {unverifiedUser && (
            <EmailVerificationBanner
              username={unverifiedUser}
              onVerified={() => {
                setUnverifiedUser(null);
                setSuccessMsg('Email verified successfully! You can now sign in.');
              }}
            />
          )}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Username or Email</label>
              <input
                type="text"
                value={form.username}
                onChange={set('username')}
                required
                placeholder="Enter username or email"
              />
            </div>
            <div className="form-group">
              <label>Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={form.password}
                  onChange={set('password')}
                  required
                  placeholder="Enter password"
                  style={{ paddingRight: '2.75rem' }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-sky-400 transition-colors focus:outline-none flex items-center justify-center p-1"
                  style={{ background: 'none', border: 'none', cursor: 'pointer' }}
                  title={showPassword ? 'Hide password' : 'Show password'}
                  tabIndex={-1}
                >
                  <EyeIcon show={showPassword} />
                </button>
              </div>
              <div className="forgot-link-wrapper">
                <a
                  href="#"
                  onClick={(e) => { e.preventDefault(); setShowForgot(true); }}
                  className="forgot-link"
                >
                  Forgot password?
                </a>
              </div>
            </div>
            <button type="submit" className="btn btn-primary" disabled={busy}>
              {busy ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <p className="auth-footer">
            Don't have an account? <Link to="/register">Register</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
