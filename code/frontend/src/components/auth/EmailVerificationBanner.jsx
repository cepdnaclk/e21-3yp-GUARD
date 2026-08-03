import { useState } from 'react';
import { authApi } from '../../services/api';

/**
 * Inline banner shown on the Login page when the user's email is not yet verified.
 * Allows entering a 6-digit verification code or resending it.
 *
 * @param {{ username: string, onVerified: () => void }} props
 */
export default function EmailVerificationBanner({ username, onVerified }) {
  const [code, setCode] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState('');
  const [resendMsg, setResendMsg] = useState('');
  const [resendBusy, setResendBusy] = useState(false);

  const handleVerify = async (e) => {
    if (e) e.preventDefault();
    setError('');
    setVerifying(true);
    try {
      await authApi.verifyEmail(username, code);
      onVerified();
    } catch (err) {
      setError(err.message);
    } finally {
      setVerifying(false);
    }
  };

  const handleResend = async () => {
    setResendMsg('');
    setResendBusy(true);
    try {
      const email = window.prompt('Enter the email address you registered with:');
      if (!email) { setResendBusy(false); return; }
      const res = await authApi.resendVerification(username, email);
      setResendMsg(res?.message || 'Verification code sent!');
    } catch (err) {
      setResendMsg(err.message || 'Failed to resend. Please check the email address.');
    } finally {
      setResendBusy(false);
    }
  };

  return (
    <div className="email-verify-banner">
      <strong className="inline-flex items-center gap-1.5">
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M 4 4 h 16 c 1.1 0 2 0.9 2 2 v 12 c 0 1.1 -0.9 2 -2 2 H 4 c -1.1 0 -2 -0.9 -2 -2 V 6 c 0 -1.1 0.9 -2 2 -2 z"/><polyline points="22,6 12,13 2,6"/></svg>
        <span>Email not verified.</span>
      </strong> Enter the 6-digit code sent to your email
      to activate your account.

      {error && <p className="email-verify-error">{error}</p>}

      {resendMsg && (
        <p className={`email-verify-resend-msg ${resendMsg.toLowerCase().includes('fail') || resendMsg.toLowerCase().includes('match') ? 'error' : 'success'}`}>
          {resendMsg}
        </p>
      )}

      <form onSubmit={handleVerify} className="email-verify-form">
        <div className="form-group email-verify-input-group">
          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
            placeholder="6-digit code"
            maxLength="6"
            className="form-control email-verify-code-input"
            required
          />
        </div>
        <div className="email-verify-actions">
          <button
            type="submit"
            className="btn btn-primary email-verify-submit"
            disabled={verifying || code.length !== 6}
          >
            {verifying ? 'Verifying...' : 'Verify Code'}
          </button>
          <button
            type="button"
            onClick={handleResend}
            disabled={resendBusy}
            className="btn btn-outline email-verify-resend"
          >
            {resendBusy ? '...' : 'Resend'}
          </button>
        </div>
      </form>
    </div>
  );
}
