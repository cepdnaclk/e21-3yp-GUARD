import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { authApi } from '../services/api';
import PublicNav from '../components/PublicNav';
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
    <div className="auth-wrapper">
      <div className="auth-page verify-email-page">
        <div className="auth-card verify-email-card">
          <button className="card-close-btn" onClick={() => navigate('/')} aria-label="Go back">&times;</button>
          <h1>Verify Your Email</h1>
          <p className="subtitle">Please enter the 6-digit code sent to your email.</p>

          {error && <p className="error-msg">{error}</p>}
          {message && <p className="profile-success-msg">{message}</p>}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Username</label>
              <input
                type="text"
                placeholder="Your username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label>Verification Code</label>
              <input
                type="text"
                placeholder="6-digit code"
                maxLength="6"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                required
              />
            </div>

            <button type="submit" className="btn btn-primary w-full" disabled={loading}>
              {loading ? 'Verifying...' : 'Verify Email'}
            </button>
          </form>

          <div className="auth-footer mt-4 text-center">
            <p className="text-sm text-slate-600">
              Didn't receive the code?{' '}
              <button 
                type="button"
                className="font-semibold text-sky-600 hover:underline cursor-pointer border-none bg-transparent" 
                onClick={handleResend} 
                disabled={resending}
              >
                {resending ? 'Sending...' : 'Resend Code'}
              </button>
            </p>
            <button
              type="button"
              className="font-semibold text-sky-600 hover:underline cursor-pointer border-none bg-transparent mt-2 inline-block"
              onClick={() => navigate('/login')}
            >
              Back to Login
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
