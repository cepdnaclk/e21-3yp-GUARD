import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { authApi } from '../services/api';
import '../styles/auth.css';

export default function VerifyEmail() {
  const navigate = useNavigate();
  const location = useLocation();
  const [username, setUsername] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  useEffect(() => {
    // Try to get username from navigation state (passed from Register page)
    if (location.state?.username) {
      setUsername(location.state.username);
    }
  }, [location]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);

    try {
      await authApi.verifyEmail(username, code);
      setMessage('Email verified successfully! Redirecting to login...');
      setTimeout(() => navigate('/login'), 3000);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!username) {
      setError('Please enter your username to resend the code.');
      return;
    }

    setResending(true);
    setError('');
    setMessage('');

    try {
      // For resend, we need the email too, but the user might not remember it.
      // We'll update the API to handle just username if possible, or ask for email.
      // For now, let's assume we can get it from the user or we might need an email field.
      const email = location.state?.email || prompt('Please enter your registered email:');
      if (!email) return;

      await authApi.resendVerification(username, email);
      setMessage('Verification code resent! Please check your inbox.');
    } catch (err) {
      setError(err.message);
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <h2>Verify Your Email</h2>
          <p>Please enter the 6-digit code sent to your email.</p>
        </div>

        {error && <div className="error-banner">{error}</div>}
        {message && <div className="success-banner">{message}</div>}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label htmlFor="username">Username</label>
            <input
              id="username"
              type="text"
              className="form-control"
              placeholder="Your username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="code">Verification Code</label>
            <input
              id="code"
              type="text"
              className="form-control"
              placeholder="6-digit code"
              maxLength="6"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
              required
            />
          </div>

          <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
            {loading ? 'Verifying...' : 'Verify Email'}
          </button>
        </form>

        <div className="auth-footer">
          <p>
            Didn't receive the code?{' '}
            <button 
              className="btn-link" 
              onClick={handleResend} 
              disabled={resending}
            >
              {resending ? 'Sending...' : 'Resend Code'}
            </button>
          </p>
          <button className="btn-link" onClick={() => navigate('/login')}>
            Back to Login
          </button>
        </div>
      </div>
    </div>
  );
}
