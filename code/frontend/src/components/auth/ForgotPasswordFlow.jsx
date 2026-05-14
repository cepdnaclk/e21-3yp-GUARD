import { useState, useEffect } from 'react';
import { authApi } from '../../services/api';

/**
 * Multi-step forgot-password wizard.
 *
 * Steps:
 *   1 — Enter username (or switch to email-only mode)
 *   2 — Confirm email address (masked hint shown)
 *   3 — Enter 6-digit verification code
 *   4 — Set new password
 *
 * @param {{ onClose: () => void, onSuccess: (message: string) => void }} props
 */
export default function ForgotPasswordFlow({ onClose, onSuccess }) {
  const [step, setStep] = useState(1);
  const [method, setMethod] = useState('username'); // 'username' | 'email'
  const [data, setData] = useState({
    username: '', email: '', maskedEmail: '', code: '', newPassword: '',
  });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);

  // Countdown timer for resend
  useEffect(() => {
    if (resendTimer <= 0) return;
    const interval = setInterval(() => setResendTimer((t) => t - 1), 1000);
    return () => clearInterval(interval);
  }, [resendTimer]);

  const update = (field, value) => setData((prev) => ({ ...prev, [field]: value }));

  // Step 1 (username mode): look up user → get masked email
  const handleInit = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const res = await authApi.forgotPasswordInit(data.username);
      update('maskedEmail', res.maskedEmail);
      setStep(2);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  // Step 1 (email mode) / Step 2: verify email and send code
  const handleVerifyEmail = async (e) => {
    if (e) e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const payload =
        method === 'username'
          ? { username: data.username, email: data.email }
          : { email: data.email };

      const res = await authApi.forgotPasswordVerifyEmail(payload.username, payload.email);
      update('username', res.username || data.username);
      setStep(3);
      setResendTimer(60);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  // Step 3: verify code
  const handleVerifyCode = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await authApi.forgotPasswordVerifyCode(data.username, data.code);
      setStep(4);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  // Step 4: reset password
  const handleReset = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await authApi.forgotPasswordReset(data.username, data.code, data.newPassword);
      onSuccess('Password reset successfully! Please log in.');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth-card login-card">
      <button className="card-close-btn" onClick={onClose} aria-label="Cancel">&times;</button>
      <h1>Reset Password</h1>

      {error && <p className="error-msg">{error}</p>}

      {/* Step 1 */}
      {step === 1 && (
        <div>
          {method === 'username' ? (
            <form onSubmit={handleInit}>
              <p className="subtitle">Enter your username to begin.</p>
              <div className="form-group">
                <label>Username</label>
                <input
                  type="text"
                  value={data.username}
                  onChange={(e) => update('username', e.target.value)}
                  required
                />
              </div>
              <button type="submit" className="btn btn-primary" disabled={busy}>
                {busy ? 'Processing...' : 'Next'}
              </button>
              <p className="forgot-method-link">
                <a href="#" onClick={(e) => { e.preventDefault(); setMethod('email'); setError(''); }}>
                  I don't remember my username
                </a>
              </p>
            </form>
          ) : (
            <form onSubmit={handleVerifyEmail}>
              <p className="subtitle">Enter your registered email address.</p>
              <div className="form-group">
                <label>Email Address</label>
                <input
                  type="email"
                  value={data.email}
                  onChange={(e) => update('email', e.target.value)}
                  required
                />
              </div>
              <button type="submit" className="btn btn-primary" disabled={busy}>
                {busy ? 'Processing...' : 'Send Verification Code'}
              </button>
              <p className="forgot-method-link">
                <a href="#" onClick={(e) => { e.preventDefault(); setMethod('username'); setError(''); }}>
                  I remember my username
                </a>
              </p>
            </form>
          )}
        </div>
      )}

      {/* Step 2 — confirm email */}
      {step === 2 && (
        <form onSubmit={handleVerifyEmail}>
          <p className="subtitle">
            Your account is linked to: <strong>{data.maskedEmail}</strong>
          </p>
          <div className="form-group">
            <label>Enter Full Email Address</label>
            <input
              type="email"
              value={data.email}
              onChange={(e) => update('email', e.target.value)}
              required
            />
          </div>
          <div className="forgot-step-actions">
            <button type="button" className="btn btn-outline" onClick={() => setStep(1)}>Back</button>
            <button type="submit" className="btn btn-primary forgot-step-primary" disabled={busy}>
              {busy ? 'Sending Code...' : 'Send Code'}
            </button>
          </div>
        </form>
      )}

      {/* Step 3 — enter code */}
      {step === 3 && (
        <form onSubmit={handleVerifyCode}>
          <p className="subtitle">
            A 6-digit code has been sent to: <strong>{data.email}</strong>
          </p>
          <div className="form-group">
            <label>Verification Code</label>
            <input
              type="text"
              value={data.code}
              onChange={(e) => update('code', e.target.value)}
              maxLength={6}
              required
            />
          </div>

          <div className="forgot-resend-row">
            {resendTimer > 0 ? (
              <span className="forgot-resend-countdown">Resend code in {resendTimer}s</span>
            ) : (
              <a href="#" onClick={(e) => { e.preventDefault(); handleVerifyEmail(); }} className="forgot-resend-link">
                Resend code
              </a>
            )}
            <span className="forgot-resend-sep">|</span>
            <a
              href="#"
              onClick={(e) => { e.preventDefault(); setStep(method === 'username' ? 2 : 1); }}
              className="forgot-change-email"
            >
              Change email
            </a>
          </div>

          <button type="submit" className="btn btn-primary" disabled={busy}>
            {busy ? 'Verifying...' : 'Verify Code'}
          </button>
        </form>
      )}

      {/* Step 4 — new password */}
      {step === 4 && (
        <form onSubmit={handleReset}>
          <p className="subtitle">
            Resetting password for: <strong>{data.username}</strong>
          </p>
          <div className="form-group">
            <label>New Password</label>
            <input
              type="password"
              value={data.newPassword}
              onChange={(e) => update('newPassword', e.target.value)}
              required
            />
            <small className="forgot-password-hint">Minimum 8 characters with at least one number.</small>
          </div>
          <button type="submit" className="btn btn-primary" disabled={busy}>
            {busy ? 'Resetting...' : 'Reset Password'}
          </button>
        </form>
      )}
    </div>
  );
}
