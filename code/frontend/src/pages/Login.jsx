import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import GoogleSignInButton from '../components/auth/GoogleSignInButton';
import ForgotPasswordFlow from '../components/auth/ForgotPasswordFlow';
import EmailVerificationBanner from '../components/auth/EmailVerificationBanner';
import guardLogo from '../assets/guard-logo.png';
import '../styles/auth.css';

export default function Login() {
  const navigate = useNavigate();
  const { login, googleLogin } = useAuth();
  const [form, setForm] = useState({ username: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [unverifiedUser, setUnverifiedUser] = useState(null);
  const [successMsg, setSuccessMsg] = useState('');
  const [showForgot, setShowForgot] = useState(false);

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

  const handleGoogleCredential = async (idToken) => {
    setError('');
    setBusy(true);
    try {
      await googleLogin(idToken);
    } catch (err) {
      setError(err.message || 'Google sign in failed.');
    } finally {
      setBusy(false);
    }
  };

  // ---------- Render ----------

  if (showForgot) {
    return (
      <div className="auth-page login-page">
        <div className="auth-brand">
          <img src={guardLogo} alt="G.U.A.R.D logo" className="auth-brand-logo" />
          <span>G.U.A.R.D</span>
        </div>
        <ForgotPasswordFlow
          onClose={() => setShowForgot(false)}
          onSuccess={(msg) => { setShowForgot(false); setSuccessMsg(msg); }}
        />
      </div>
    );
  }

  return (
    <div className="auth-page login-page">
      <div className="auth-brand">
        <img src={guardLogo} alt="G.U.A.R.D logo" className="auth-brand-logo" />
        <span>G.U.A.R.D</span>
      </div>

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
            <label>Username</label>
            <input
              type="text"
              value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value })}
              placeholder="Enter username"
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
            <div className="login-password-label" style={{ display: 'flex', justifyContent: 'flex-start', marginTop: '0.4rem' }}>
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

        <div className="auth-or-divider">or</div>

        <GoogleSignInButton
          onCredential={handleGoogleCredential}
          text="signin_with"
          onError={setError}
        />

        <p className="auth-footer">
          Don't have an account? <Link to="/register">Register</Link>
        </p>
      </div>
    </div>
  );
}
