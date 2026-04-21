import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
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
      await register(body);
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
