import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { authApi } from '../services/api';
import guardLogo from '../assets/guard-logo.png';
import '../styles/auth.css';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '108391237039-0jg9nf8pjn48vi5bqi8bbth2kfe03vtm.apps.googleusercontent.com';

export default function Login() {
  const navigate = useNavigate();
  const { login, googleLogin } = useAuth();
  const [form, setForm] = useState({ username: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [unverifiedEmail, setUnverifiedEmail] = useState(null); // set when login blocked
  const [resendMsg, setResendMsg] = useState('');
  const [resendBusy, setResendBusy] = useState(false);
  const googleBtnRef = useRef(null);
  const googleLoginRef = useRef(googleLogin);

  useEffect(() => {
    googleLoginRef.current = googleLogin;
  }, [googleLogin]);

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID || !googleBtnRef.current) return;

    const scriptId = 'google-identity-services';

    const renderGoogleButton = () => {
      if (!window.google?.accounts?.id || !googleBtnRef.current) return;

      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: async (response) => {
          if (!response?.credential) {
            setError('Google sign in failed. Please try again.');
            return;
          }

          setError('');
          setBusy(true);
          try {
            await googleLoginRef.current(response.credential);
          } catch (err) {
            setError(err.message || 'Google sign in failed.');
          } finally {
            setBusy(false);
          }
        },
      });

      googleBtnRef.current.innerHTML = '';
      window.google.accounts.id.renderButton(googleBtnRef.current, {
        theme: 'outline',
        size: 'large',
        text: 'signin_with',
        shape: 'pill',
        width: 320,
      });
    };

    const existingScript = document.getElementById(scriptId);
    if (existingScript) {
      renderGoogleButton();
      return;
    }

    const script = document.createElement('script');
    script.id = scriptId;
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = renderGoogleButton;
    document.head.appendChild(script);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setUnverifiedEmail(null);
    setResendMsg('');
    setBusy(true);
    try {
      await login({
        username: form.username.trim(),
        password: form.password,
      });
    } catch (err) {
      // Backend returns this exact message when email is not verified
      if (err.message && err.message.toLowerCase().includes('email not verified')) {
        setUnverifiedEmail(form.username); // store username; resend uses email field
        setError('');
      } else {
        setError(err.message);
      }
    } finally {
      setBusy(false);
    }
  };

  const handleResend = async () => {
    setResendMsg('');
    setResendBusy(true);
    try {
      // We only have the username here — ask user for email OR use the stored one
      // We pass username as a hint; backend resend endpoint needs email though.
      // Show a prompt to enter the email if we only have the username.
      const email = window.prompt('Enter the email address you registered with:');
      if (!email) { setResendBusy(false); return; }
      const res = await authApi.resendVerification(email);
      setResendMsg(res?.message || 'Verification email sent!');
    } catch (err) {
      setResendMsg(err.message || 'Failed to resend. Try again.');
    } finally {
      setResendBusy(false);
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

        {unverifiedEmail && (
          <div style={{
            background: '#fff7ed',
            border: '1px solid #fed7aa',
            borderRadius: '10px',
            padding: '0.85rem 1rem',
            marginBottom: '1rem',
            fontSize: '0.88rem',
            color: '#9a3412',
          }}>
            <strong>📧 Email not verified.</strong> Please check your inbox and click the verification link before signing in.
            <div style={{ marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
              <button
                onClick={handleResend}
                disabled={resendBusy}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#0e567f', fontWeight: 600, fontSize: '0.88rem', padding: 0 }}
              >
                {resendBusy ? 'Sending…' : '↻ Resend verification email'}
              </button>
              {resendMsg && <span style={{ color: '#166534' }}>{resendMsg}</span>}
            </div>
          </div>
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
          </div>
          <button type="submit" className="btn btn-primary" disabled={busy}>
            {busy ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <div style={{ margin: '1rem 0', textAlign: 'center', color: '#888' }}>or</div>
        <div ref={googleBtnRef} style={{ display: 'flex', justifyContent: 'center', minHeight: 44 }} />

        <p className="auth-footer">
          Don't have an account? <Link to="/register">Register</Link>
        </p>
      </div>
    </div>
  );
}
