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
  const [unverifiedUser, setUnverifiedUser] = useState(null);
  const [resendMsg, setResendMsg] = useState('');
  const [resendBusy, setResendBusy] = useState(false);
  
  // Forgot Password Flow State
  const [forgotStep, setForgotStep] = useState(0); // 0: None, 1: Selection/Username, 2: Confirm Email, 3: Verify Code, 4: Reset
  const [forgotMethod, setForgotMethod] = useState('username'); // 'username' or 'email'
  const [forgotData, setForgotData] = useState({ username: '', email: '', maskedEmail: '', code: '', newPassword: '' });
  const [forgotError, setForgotError] = useState('');
  const [forgotMsg, setForgotMsg] = useState('');
  const [resendTimer, setResendTimer] = useState(0);

  const googleBtnRef = useRef(null);
  const googleLoginRef = useRef(googleLogin);

  useEffect(() => {
    googleLoginRef.current = googleLogin;
  }, [googleLogin]);

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID || !googleBtnRef.current || forgotStep !== 0) return;

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
        theme: 'outline', size: 'large', text: 'signin_with', shape: 'pill', width: 320,
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
  }, [forgotStep]);

  // Resend Timer Effect
  useEffect(() => {
    let interval;
    if (resendTimer > 0) {
      interval = setInterval(() => {
        setResendTimer(t => t - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [resendTimer]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setUnverifiedUser(null);
    setResendMsg('');
    setBusy(true);
    try {
      await login({
        username: form.username.trim(),
        password: form.password,
      });
    } catch (err) {
      if (err.message && err.message.toLowerCase().includes('email not verified')) {
        setUnverifiedUser(form.username);
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
      const email = window.prompt('Enter the email address you registered with:');
      if (!email) { setResendBusy(false); return; }
      const res = await authApi.resendVerification(unverifiedUser, email);
      setResendMsg(res?.message || 'Verification email sent!');
    } catch (err) {
      setResendMsg(err.message || 'Failed to resend. Try again.');
    } finally {
      setResendBusy(false);
    }
  };

  // --- Forgot Password Handlers ---
  const handleForgotInit = async (e) => {
    e.preventDefault();
    setForgotError('');
    setBusy(true);
    try {
      const res = await authApi.forgotPasswordInit(forgotData.username);
      setForgotData(prev => ({ ...prev, maskedEmail: res.maskedEmail }));
      setForgotStep(2);
    } catch (err) {
      setForgotError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const handleForgotVerifyEmail = async (e) => {
    if (e) e.preventDefault();
    setForgotError('');
    setBusy(true);
    try {
      // If method is email, we don't have username yet.
      const payload = forgotMethod === 'username' 
        ? { username: forgotData.username, email: forgotData.email }
        : { email: forgotData.email };
      
      const res = await authApi.forgotPasswordVerifyEmail(payload.username, payload.email);
      
      // Update username in state (backend returns it)
      setForgotData(prev => ({ ...prev, username: res.username || prev.username }));
      setForgotStep(3);
      setResendTimer(60); // 60s countdown
    } catch (err) {
      setForgotError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const handleForgotVerifyCode = async (e) => {
    e.preventDefault();
    setForgotError('');
    setBusy(true);
    try {
      await authApi.forgotPasswordVerifyCode(forgotData.username, forgotData.code);
      setForgotStep(4);
    } catch (err) {
      setForgotError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const handleForgotReset = async (e) => {
    e.preventDefault();
    setForgotError('');
    setBusy(true);
    try {
      await authApi.forgotPasswordReset(forgotData.username, forgotData.code, forgotData.newPassword);
      setForgotStep(0);
      setForgotData({ username: '', email: '', maskedEmail: '', code: '', newPassword: '' });
      setError('');
      setResendMsg('Password reset successfully! Please log in.');
    } catch (err) {
      setForgotError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const renderForgotFlow = () => {
    return (
      <div className="auth-card login-card">
        <button className="card-close-btn" onClick={() => setForgotStep(0)} aria-label="Cancel">&times;</button>
        <h1>Reset Password</h1>
        
        {forgotError && <p className="error-msg">{forgotError}</p>}
        {forgotMsg && <p className="profile-success-msg">{forgotMsg}</p>}

        {forgotStep === 1 && (
          <div>
            {forgotMethod === 'username' ? (
              <form onSubmit={handleForgotInit}>
                <p className="subtitle">Enter your username to begin.</p>
                <div className="form-group">
                  <label>Username</label>
                  <input type="text" value={forgotData.username} onChange={e => setForgotData({...forgotData, username: e.target.value})} required />
                </div>
                <button type="submit" className="btn btn-primary" disabled={busy}>{busy ? 'Processing...' : 'Next'}</button>
                <p style={{ marginTop: '1rem', textAlign: 'center' }}>
                  <a href="#" onClick={(e) => { e.preventDefault(); setForgotMethod('email'); setForgotError(''); }} style={{ fontSize: '0.85rem', color: '#1a73e8' }}>I don't remember my username</a>
                </p>
              </form>
            ) : (
              <form onSubmit={handleForgotVerifyEmail}>
                <p className="subtitle">Enter your registered email address.</p>
                <div className="form-group">
                  <label>Email Address</label>
                  <input type="email" value={forgotData.email} onChange={e => setForgotData({...forgotData, email: e.target.value})} required />
                </div>
                <button type="submit" className="btn btn-primary" disabled={busy}>{busy ? 'Processing...' : 'Send Verification Code'}</button>
                <p style={{ marginTop: '1rem', textAlign: 'center' }}>
                  <a href="#" onClick={(e) => { e.preventDefault(); setForgotMethod('username'); setForgotError(''); }} style={{ fontSize: '0.85rem', color: '#1a73e8' }}>I remember my username</a>
                </p>
              </form>
            )}
          </div>
        )}

        {forgotStep === 2 && (
          <form onSubmit={handleForgotVerifyEmail}>
            <p className="subtitle">Your account is linked to: <strong>{forgotData.maskedEmail}</strong></p>
            <div className="form-group">
              <label>Enter Full Email Address</label>
              <input type="email" value={forgotData.email} onChange={e => setForgotData({...forgotData, email: e.target.value})} required />
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button type="button" className="btn btn-outline" onClick={() => setForgotStep(1)} style={{ flex: 1 }}>Back</button>
              <button type="submit" className="btn btn-primary" disabled={busy} style={{ flex: 2 }}>{busy ? 'Sending Code...' : 'Send Code'}</button>
            </div>
          </form>
        )}

        {forgotStep === 3 && (
          <form onSubmit={handleForgotVerifyCode}>
            <p className="subtitle">A 6-digit code has been sent to: <strong>{forgotData.email}</strong></p>
            <div className="form-group">
              <label>Verification Code</label>
              <input type="text" value={forgotData.code} onChange={e => setForgotData({...forgotData, code: e.target.value})} maxLength={6} required />
            </div>
            
            <div style={{ marginBottom: '1.5rem', fontSize: '0.85rem' }}>
              {resendTimer > 0 ? (
                <span style={{ color: '#888' }}>Resend code in {resendTimer}s</span>
              ) : (
                <a href="#" onClick={(e) => { e.preventDefault(); handleForgotVerifyEmail(); }} style={{ color: '#1a73e8', fontWeight: 600 }}>Resend code</a>
              )}
              <span style={{ margin: '0 0.5rem', color: '#ccc' }}>|</span>
              <a href="#" onClick={(e) => { e.preventDefault(); setForgotStep(forgotMethod === 'username' ? 2 : 1); }} style={{ color: '#d32f2f' }}>Change email</a>
            </div>

            <button type="submit" className="btn btn-primary" disabled={busy}>{busy ? 'Verifying...' : 'Verify Code'}</button>
          </form>
        )}

        {forgotStep === 4 && (
          <form onSubmit={handleForgotReset}>
            <p className="subtitle">Resetting password for: <strong>{forgotData.username}</strong></p>
            <div className="form-group">
              <label>New Password</label>
              <input type="password" value={forgotData.newPassword} onChange={e => setForgotData({...forgotData, newPassword: e.target.value})} required />
              <small style={{ color: '#888' }}>Minimum 8 characters with at least one number.</small>
            </div>
            <button type="submit" className="btn btn-primary" disabled={busy}>{busy ? 'Resetting...' : 'Reset Password'}</button>
          </form>
        )}
      </div>
    );
  };

  return (
    <div className="auth-page login-page">
      <div className="auth-brand">
        <img src={guardLogo} alt="G.U.A.R.D logo" className="auth-brand-logo" />
        <span>G.U.A.R.D</span>
      </div>

      {forgotStep > 0 ? (
        renderForgotFlow()
      ) : (
        <div className="auth-card login-card">
          <button className="card-close-btn" onClick={() => navigate(-1)} aria-label="Go back">&times;</button>
          <h1>Welcome Back</h1>
          <p className="subtitle">Sign in to G.U.A.R.D Dashboard</p>

          {error && <p className="error-msg">{error}</p>}
          {resendMsg && <p className="profile-success-msg">{resendMsg}</p>}

          {unverifiedUser && (
            <div style={{
              background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: '10px',
              padding: '0.85rem 1rem', marginBottom: '1rem', fontSize: '0.88rem', color: '#9a3412',
            }}>
              <strong>📧 Email not verified.</strong> Please enter your verification code to continue.
              <div style={{ marginTop: '0.5rem' }}>
                <button
                  onClick={() => navigate('/verify-email', { state: { username: unverifiedUser } })}
                  style={{ background: '#0e567f', border: 'none', cursor: 'pointer', color: '#fff', fontWeight: 600, fontSize: '0.88rem', padding: '0.5rem 1rem', borderRadius: '6px' }}
                >
                  Enter Verification Code
                </button>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Username</label>
              <input
                type="text" value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value })}
                placeholder="Enter username" required
              />
            </div>
            <div className="form-group">
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <label>Password</label>
                <a href="#" onClick={(e) => { e.preventDefault(); setForgotStep(1); setForgotMethod('username'); setForgotError(''); }} style={{ fontSize: '0.85rem', color: '#1a73e8', textDecoration: 'none' }}>Forgot password?</a>
              </div>
              <input
                type="password" value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder="Enter password" required
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
      )}
    </div>
  );
}
