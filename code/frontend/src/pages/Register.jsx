import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
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

export default function Register() {
  const navigate = useNavigate();
  const { register } = useAuth();
  const [form, setForm] = useState({
    username: '', password: '', fullName: '', email: '', phoneNumber: '', address: '',
  });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const set = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const body = {
        username: form.username.trim(),
        password: form.password,
        fullName: form.fullName.trim(),
      };
      if (form.email.trim()) body.email = form.email.trim();
      if (form.phoneNumber.trim()) body.phoneNumber = form.phoneNumber.trim();
      if (form.address.trim()) body.address = form.address.trim();

      const result = await register(body);

      // Backend requires email verification — redirect to verify page.
      if (result?.emailVerified === false) {
        navigate('/verify-email', {
          state: { username: form.username.trim(), email: form.email.trim() },
        });
        return;
      }

      // No email provided / auto-verified — already logged in, go to dashboard.
      navigate('/dashboard');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth-wrapper">
      <PublicNav />
      <div className="auth-page register-page">
        <div className="auth-card register-card">
          <button className="card-close-btn" onClick={() => navigate('/')} aria-label="Go back">&times;</button>
          <h1>Create Account</h1>
          <p className="subtitle">Sign up for G.U.A.R.D Dashboard</p>

          {error && <p className="error-msg">{error}</p>}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Full Name *</label>
              <input type="text" value={form.fullName} onChange={set('fullName')} required placeholder="John Doe" />
            </div>
            <div className="form-group">
              <label>Username *</label>
              <input type="text" value={form.username} onChange={set('username')} required placeholder="johndoe" />
            </div>
            <div className="form-group">
              <label>Password *</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={form.password}
                  onChange={set('password')}
                  required
                  placeholder="Min. 6 characters"
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
    </div>
  );
}
