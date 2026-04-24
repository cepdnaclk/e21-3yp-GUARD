import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { authApi } from '../services/api';
import guardLogo from '../assets/guard-logo.png';
import '../styles/auth.css';

export default function Register() {
  const navigate = useNavigate();
  const { register } = useAuth();
  const [form, setForm] = useState({
    username: '', password: '', fullName: '', email: '', phoneNumber: '', address: '',
  });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  // After successful registration with email verification required
  const [pendingEmail, setPendingEmail] = useState(null);
  const [resendMsg, setResendMsg] = useState('');
  const [resendBusy, setResendBusy] = useState(false);

  const set = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const body = { username: form.username, password: form.password, fullName: form.fullName };
      if (form.email) body.email = form.email;
      if (form.phoneNumber) body.phoneNumber = form.phoneNumber;
      if (form.address) body.address = form.address;

      const result = await register(body);

      // Backend requires email verification — show the check-inbox screen
      if (result?.emailVerified === false) {
        setPendingEmail(form.email);
        return;
      }

      // No email provided / auto-verified — already logged in, go to dashboard
      navigate('/');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const handleResend = async () => {
    setResendMsg('');
    setResendBusy(true);
    try {
      const res = await authApi.resendVerification(pendingEmail);
      setResendMsg(res?.message || 'Verification email sent!');
    } catch (err) {
      setResendMsg(err.message || 'Failed to resend. Please try again.');
    } finally {
      setResendBusy(false);
    }
  };

  /* ─── Check-inbox screen ─── */
  if (pendingEmail) {
    return (
      <div className="auth-page login-page">
        <div className="auth-brand">
          <img src={guardLogo} alt="G.U.A.R.D logo" className="auth-brand-logo" />
          <span>G.U.A.R.D</span>
        </div>

        <div className="auth-card login-card" style={{ textAlign: 'center' }}>
          {/* Email icon */}
          <div style={{ fontSize: '3.5rem', marginBottom: '0.75rem' }}>✉️</div>

          <h1 style={{ color: '#0e3454', marginBottom: '0.4rem' }}>Check your inbox</h1>
          <p style={{ color: '#3b6586', marginBottom: '1.5rem', fontSize: '0.92rem' }}>
            We sent a verification link to <strong>{pendingEmail}</strong>.
            Click the link in that email to activate your account.
          </p>

          {resendMsg && (
            <p style={{
              background: resendMsg.toLowerCase().includes('fail') || resendMsg.toLowerCase().includes('error')
                ? '#fee2e2' : '#dcfce7',
              color: resendMsg.toLowerCase().includes('fail') || resendMsg.toLowerCase().includes('error')
                ? '#991b1b' : '#166534',
              padding: '0.6rem 1rem',
              borderRadius: '8px',
              fontSize: '0.86rem',
              marginBottom: '1rem',
            }}>
              {resendMsg}
            </p>
          )}

          <button
            className="btn btn-primary"
            onClick={handleResend}
            disabled={resendBusy}
            style={{ width: '100%', marginBottom: '0.75rem', background: '#0b3658', borderRadius: '10px' }}
          >
            {resendBusy ? 'Sending…' : 'Resend verification email'}
          </button>

          <p className="auth-footer">
            Already verified? <Link to="/login">Sign In</Link>
          </p>
        </div>
      </div>
    );
  }

  /* ─── Registration form ─── */
  return (
    <div className="auth-page login-page">
      <div className="auth-brand">
        <img src={guardLogo} alt="G.U.A.R.D logo" className="auth-brand-logo" />
        <span>G.U.A.R.D</span>
      </div>

      <div className="auth-card login-card register-card">
        <button className="card-close-btn" onClick={() => navigate(-1)} aria-label="Go back">&times;</button>
        <h1>Create Account</h1>
        <p className="subtitle">Register for G.U.A.R.D Dashboard</p>

        {error && <p className="error-msg">{error}</p>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Full Name *</label>
            <input type="text" value={form.fullName} onChange={set('fullName')} placeholder="John Doe" required />
          </div>
          <div className="form-group">
            <label>Username *</label>
            <input type="text" value={form.username} onChange={set('username')} placeholder="johndoe" required minLength={3} />
          </div>
          <div className="form-group">
            <label>Password *</label>
            <input type="password" value={form.password} onChange={set('password')} placeholder="Min 8 characters" required minLength={8} />
          </div>
          <div className="form-group">
            <label>Email</label>
            <input type="email" value={form.email} onChange={set('email')} placeholder="john@example.com" />
          </div>
          <div className="form-group">
            <label>Phone Number</label>
            <input type="text" value={form.phoneNumber} onChange={set('phoneNumber')} placeholder="+1234567890" />
          </div>
          <div className="form-group">
            <label>Address</label>
            <input type="text" value={form.address} onChange={set('address')} placeholder="Your address" />
          </div>
          <button type="submit" className="btn btn-primary" disabled={busy}>
            {busy ? 'Creating...' : 'Create Account'}
          </button>
        </form>

        <p className="auth-footer">
          Already have an account? <Link to="/login">Sign In</Link>
        </p>
      </div>
    </div>
  );
}
