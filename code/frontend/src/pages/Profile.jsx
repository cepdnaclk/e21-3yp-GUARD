import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { authApi, getImageUrl } from '../services/api';
// profile.css migrated to Tailwind below.

const countryCodes = [
  { code: '+94', label: 'Sri Lanka (+94)' },
  { code: '+91', label: 'India (+91)' },
  { code: '+1',  label: 'United States (+1)' },
  { code: '+44', label: 'United Kingdom (+44)' },
  { code: '+61', label: 'Australia (+61)' },
  { code: '+960', label: 'Maldives (+960)' },
  { code: '+65', label: 'Singapore (+65)' },
  { code: '+90', label: 'Turkey (+90)' },
];

function parsePhone(phone) {
  if (!phone) return { code: '+94', local: '' };
  const matched = countryCodes.find((item) => phone.startsWith(item.code));
  if (matched) {
    return { code: matched.code, local: phone.slice(matched.code.length) };
  }
  if (phone.startsWith('+')) {
    const matches = phone.match(/^(\+\d{1,4})(.*)$/);
    if (matches) {
      return { code: matches[1], local: matches[2].trim() };
    }
  }
  return { code: '+94', local: phone };
}

/* ── Shared Tailwind class constants ───────────────────────────── */

// Glass input — same across all fields
const FIELD_INPUT =
  'w-full px-4 py-[0.8rem] border-[1.5px] border-white/20 dark:border-white/[0.08] bg-white/30 dark:bg-white/[0.05] backdrop-blur-sm text-text-main dark:text-[#e6edf3] rounded-[10px] text-[0.95rem] font-sans outline-none transition-all focus:border-primary focus:shadow-[0_0_0_3px_rgba(14,165,233,0.15)] disabled:opacity-85 disabled:cursor-not-allowed disabled:bg-white/10 dark:disabled:bg-white/[0.03]';

// Field label row
const FIELD_LABEL = 'flex justify-between items-center text-[0.85rem] font-semibold text-text-muted dark:text-slate-400';

// Verification badge colours
const BADGE_VERIFIED  = 'text-[0.75rem] font-bold text-success';
const BADGE_PENDING   = 'text-[0.75rem] font-bold text-amber-500';
const BADGE_UNVERIFIED = 'text-[0.75rem] font-bold text-danger';

export default function Profile() {
  const { user, updateProfile, refreshUser } = useAuth();
  const navigate = useNavigate();

  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [form, setForm] = useState({
    username: '', fullName: '', email: '', phoneNumber: '', address: '',
  });

  const [countryCode, setCountryCode] = useState('+94');
  const [localPhone, setLocalPhone] = useState('');

  const [verifyingEmail, setVerifyingEmail] = useState(false);
  const [verifyingPhone, setVerifyingPhone] = useState(false);

  const [emailOtp, setEmailOtp] = useState('');
  const [emailOtpSent, setEmailOtpSent] = useState(false);
  const [devEmailOtp, setDevEmailOtp] = useState('');
  const [devPhoneOtp, setDevPhoneOtp] = useState('');

  const [verifyingEmailLoading, setVerifyingEmailLoading] = useState(false);
  const [verifyingPhoneLoading, setVerifyingPhoneLoading] = useState(false);

  useEffect(() => {
    if (!user) return;
    const parsed = parsePhone(user.phoneNumber);
    setCountryCode(parsed.code);
    setLocalPhone(parsed.local);
    setForm({
      username: user.username || '',
      fullName: user.fullName || '',
      email: user.email || '',
      phoneNumber: user.phoneNumber || '',
      address: user.address || '',
    });
  }, [user]);

  const memberSince = useMemo(() => {
    if (!user?.createdAt) return '-';
    return new Date(user.createdAt).toLocaleDateString(undefined, {
      year: 'numeric', month: 'long', day: 'numeric',
    });
  }, [user]);

  if (!user) return null;

  const onChange = (field) => (e) => setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const handleLocalPhoneChange = (e) => {
    const val = e.target.value.replace(/\D/g, '');
    setLocalPhone(val);
    setForm((prev) => ({ ...prev, phoneNumber: countryCode + val }));
  };

  const handleCountryCodeChange = (e) => {
    const code = e.target.value;
    setCountryCode(code);
    setForm((prev) => ({ ...prev, phoneNumber: code + localPhone }));
  };

  const onCancel = () => {
    const parsed = parsePhone(user.phoneNumber);
    setCountryCode(parsed.code);
    setLocalPhone(parsed.local);
    setForm({
      username: user.username || '', fullName: user.fullName || '',
      email: user.email || '', phoneNumber: user.phoneNumber || '', address: user.address || '',
    });
    setIsEditing(false);
    setVerifyingEmail(false);
    setVerifyingPhone(false);
    setEmailOtpSent(false);
    setError('');
    setSuccess('');
  };

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(''); setSuccess(''); setSaving(true);
    try {
      await authApi.uploadProfilePicture(file);
      await refreshUser();
      setSuccess('Profile picture updated successfully.');
    } catch (err) {
      setError(err.message || 'Failed to upload profile picture.');
    } finally {
      setSaving(false);
      e.target.value = '';
    }
  };

  const handlePhotoDelete = async () => {
    if (!window.confirm('Are you sure you want to remove your profile picture?')) return;
    setError(''); setSuccess(''); setSaving(true);
    try {
      await authApi.deleteProfilePicture();
      await refreshUser();
      setSuccess('Profile picture removed successfully.');
    } catch (err) {
      setError(err.message || 'Failed to remove profile picture.');
    } finally {
      setSaving(false);
    }
  };

  const handleSendEmailOtp = async () => {
    if (!form.email.trim()) { setError('Please enter a valid email address.'); return; }
    setError(''); setVerifyingEmailLoading(true);
    try {
      const res = await authApi.sendEmailOtp(form.email.trim());
      setEmailOtpSent(true);
      if (res.debugOtp) setDevEmailOtp(res.debugOtp);
      setSuccess('Verification OTP sent to your new email.');
    } catch (err) {
      setError(err.message || 'Failed to send verification code.');
    } finally {
      setVerifyingEmailLoading(false);
    }
  };

  const handleConfirmEmailOtp = async () => {
    if (!emailOtp.trim()) { setError('Please enter the verification code.'); return; }
    setError(''); setVerifyingEmailLoading(true);
    try {
      await authApi.confirmEmailOtp(emailOtp.trim());
      await refreshUser();
      setVerifyingEmail(false); setEmailOtpSent(false);
      setDevEmailOtp(''); setEmailOtp('');
      setSuccess('Email successfully verified and updated.');
    } catch (err) {
      setError(err.message || 'Verification failed. Please check the code.');
    } finally {
      setVerifyingEmailLoading(false);
    }
  };

  const handleSendPhoneOtp = async () => {
    const combinedPhone = (countryCode + localPhone).trim();
    if (!localPhone.trim()) { setError('Please enter a valid phone number.'); return; }
    setError(''); setVerifyingPhoneLoading(true);
    try {
      const res = await authApi.sendPhoneOtp(combinedPhone);
      if (res.debugOtp) setDevPhoneOtp(res.debugOtp);
      setSuccess('Verification code generated. Please complete verification on Telegram.');
    } catch (err) {
      setError(err.message || 'Failed to initiate Telegram verification.');
    } finally {
      setVerifyingPhoneLoading(false);
    }
  };

  const handleConfirmPhoneOtp = async () => {
    setError(''); setVerifyingPhoneLoading(true);
    try {
      await authApi.confirmPhoneOtp();
      await refreshUser();
      setVerifyingPhone(false); setDevPhoneOtp('');
      setSuccess('Phone number successfully verified and linked.');
    } catch (err) {
      setError(err.message || 'Verification is still pending. Ensure you shared contact with the bot first.');
    } finally {
      setVerifyingPhoneLoading(false);
    }
  };

  const onSave = async () => {
    if (!form.fullName.trim()) { setError('Full name is required.'); return; }
    setSaving(true); setError(''); setSuccess('');
    try {
      await updateProfile({ fullName: form.fullName.trim(), address: form.address.trim() });
      const latestUser = await refreshUser();
      setForm({
        username: latestUser.username || '', fullName: latestUser.fullName || '',
        email: latestUser.email || '', phoneNumber: latestUser.phoneNumber || '',
        address: latestUser.address || '',
      });
      setIsEditing(false);
      setSuccess('Profile details saved successfully.');
    } catch (err) {
      setError(err.message || 'Failed to update profile.');
    } finally {
      setSaving(false);
    }
  };

  const isEmailModified = form.email.trim().toLowerCase() !== user.email?.toLowerCase();
  const isPhoneModified = form.phoneNumber.trim() !== (user.phoneNumber || '');
  const hasUnverifiedEdits = isEmailModified || isPhoneModified;

  return (
    /* .profile-page → transparent page, max-w-3xl centred */
    <div className="min-h-[calc(100vh-62px)] px-4 py-8 flex flex-col gap-6 max-w-3xl mx-auto">

      {/* .profile-top-bar */}
      <div className="flex justify-between items-center border-b-2 border-white/20 dark:border-white/10 pb-4">
        <h1 className="text-[1.75rem] font-bold text-text-main dark:text-[#e6edf3] tracking-[-0.3px]">
          My Profile
        </h1>
      </div>

      {/* .profile-card → glass card */}
      <div className="bg-white/60 dark:bg-[rgba(13,20,35,0.82)] backdrop-blur-xl border border-white/40 dark:border-white/[0.08] rounded-2xl p-10 max-[768px]:p-6 shadow-[0_20px_60px_rgba(14,52,84,0.12)] dark:shadow-[0_20px_60px_rgba(0,0,0,0.50)] flex flex-col gap-8 transition-all">

        {/* ── Avatar + Summary ── */}
        {/* .profile-header-section */}
        <div className="flex items-center gap-8 border-b border-white/20 dark:border-white/[0.08] pb-8 max-[768px]:flex-col max-[768px]:text-center max-[768px]:gap-4">

          {/* .profile-avatar-container — hover shows upload overlay */}
          <div className="group relative w-[120px] h-[120px] flex-shrink-0 rounded-full overflow-hidden border-4 border-primary bg-gradient-to-br from-[#9dc4e2] to-[#8ab6d8] shadow-lg transition-transform duration-300 hover:scale-[1.03] hover:border-primary-dark">
            {user.profilePicture ? (
              <img src={getImageUrl(user.profilePicture)} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-[4rem] select-none">👤</div>
            )}
            {/* .profile-avatar-overlay — hidden until group hover */}
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
              <label htmlFor="profile-upload" className="text-white text-[1.75rem] cursor-pointer p-4 flex items-center justify-center" title="Upload New Photo">
                📷
              </label>
              <input id="profile-upload" type="file" accept="image/*" onChange={handlePhotoUpload} disabled={saving} style={{ display: 'none' }} />
            </div>
          </div>

          {/* .profile-summary */}
          <div className="flex flex-col gap-2 max-[768px]:items-center">
            <h4 className="text-[1.5rem] font-bold text-text-main dark:text-[#e6edf3] m-0">
              {user.fullName || 'User'}
            </h4>
            {/* .profile-role-badge */}
            <span className="self-start max-[768px]:self-center text-[0.75rem] font-bold text-primary bg-[#eff6ff] dark:bg-[rgba(14,165,233,0.15)] px-3 py-1 rounded-full uppercase tracking-[0.5px]">
              {user.role}
            </span>
            {user.profilePicture && (
              <button
                type="button"
                className="self-start max-[768px]:self-center bg-transparent border-none text-danger text-[0.85rem] font-semibold cursor-pointer p-0 hover:underline hover:text-[#b91c1c] transition-colors"
                onClick={handlePhotoDelete}
                disabled={saving}
              >
                Remove Photo
              </button>
            )}
          </div>
        </div>

        {/* ── Feedback Banners ── */}
        {error && (
          <div className="p-4 rounded-lg text-[0.9rem] font-medium bg-red-50 dark:bg-red-900/20 text-danger border border-red-200/50 dark:border-red-400/20">
            {error}
          </div>
        )}
        {success && (
          <div className="p-4 rounded-lg text-[0.9rem] font-medium bg-green-50 dark:bg-green-900/20 text-success border border-green-200/50 dark:border-green-400/20">
            {success}
          </div>
        )}
        {devEmailOtp && (
          <div className="p-4 rounded-lg text-[0.9rem] font-medium bg-sky-50 dark:bg-sky-900/20 text-primary border border-sky-200/50 dark:border-sky-400/20 font-mono">
            ⚙️ <strong>[DEV MOCK]</strong> Email Verification Code: <code>{devEmailOtp}</code>
          </div>
        )}

        {/* ── Fields Grid ── */}
        {/* .profile-grid */}
        <div className="grid grid-cols-2 max-[768px]:grid-cols-1 gap-x-8 gap-y-6">

          {/* Username — locked */}
          <div className="flex flex-col gap-2">
            <label className={FIELD_LABEL}>
              <span>Username</span>
              <span className="text-[0.75rem] text-text-muted font-bold tracking-[0.5px]">🔒 LOCKED</span>
            </label>
            <input type="text" className={FIELD_INPUT} value={form.username} disabled placeholder="Username" />
          </div>

          {/* Member Since */}
          <div className="flex flex-col gap-2">
            <label className={FIELD_LABEL}><span>Member Since</span></label>
            <input type="text" className={FIELD_INPUT} value={memberSince} disabled />
          </div>

          {/* Full Name */}
          <div className="flex flex-col gap-2">
            <label className={FIELD_LABEL}><span>Full Name</span></label>
            <input type="text" className={FIELD_INPUT} value={form.fullName} onChange={onChange('fullName')} disabled={!isEditing || saving} placeholder="Full Name" />
          </div>

          {/* Address */}
          <div className="flex flex-col gap-2">
            <label className={FIELD_LABEL}><span>Address</span></label>
            <input type="text" className={FIELD_INPUT} value={form.address} onChange={onChange('address')} disabled={!isEditing || saving} placeholder="Address" />
          </div>

          {/* Email — full width with verification */}
          <div className="flex flex-col gap-2 col-span-2 max-[768px]:col-span-1">
            <label className={FIELD_LABEL}>
              <span>Email Address</span>
              {isEmailModified
                ? <span className={BADGE_PENDING}>⚠️ UNVERIFIED</span>
                : <span className={BADGE_VERIFIED}>✅ VERIFIED</span>
              }
            </label>
            <div className="flex gap-3">
              <input type="email" className={FIELD_INPUT} value={form.email} onChange={onChange('email')} disabled={!isEditing || saving} placeholder="Email Address" />
              {isEditing && isEmailModified && !verifyingEmail && (
                <button
                  type="button"
                  className="bg-primary hover:bg-primary-dark text-white border-none px-5 rounded-lg text-[0.875rem] font-semibold cursor-pointer whitespace-nowrap transition-colors disabled:opacity-60"
                  onClick={() => { setVerifyingEmail(true); handleSendEmailOtp(); }}
                  disabled={verifyingEmailLoading}
                >
                  Verify Email
                </button>
              )}
            </div>

            {/* Email OTP card */}
            {isEditing && verifyingEmail && (
              <div className="bg-white/30 dark:bg-white/[0.04] border border-white/20 dark:border-white/[0.08] p-5 rounded-[10px] mt-2 flex flex-col gap-3">
                <h5 className="text-[0.95rem] font-bold text-text-main dark:text-[#e6edf3] m-0">Confirm New Email</h5>
                <p className="text-[0.85rem] text-text-muted m-0">We sent a 6-digit verification code to <strong>{form.email}</strong>.</p>
                <div className="flex gap-3 max-[768px]:flex-col">
                  <input
                    type="text" maxLength={6} placeholder="Enter Code" value={emailOtp}
                    onChange={(e) => setEmailOtp(e.target.value)} disabled={verifyingEmailLoading}
                    className="flex-1 max-w-[160px] max-[768px]:max-w-none px-3 py-2 border-[1.5px] border-white/20 dark:border-white/[0.08] rounded-md text-[0.9rem] text-center font-bold tracking-[2px] bg-white/20 dark:bg-white/[0.04] text-text-main dark:text-[#e6edf3] outline-none focus:border-primary"
                  />
                  <button type="button" className="btn btn-primary btn-sm" onClick={handleConfirmEmailOtp} disabled={verifyingEmailLoading}>Confirm Code</button>
                  <button type="button" className="btn btn-outline btn-sm" onClick={() => { setVerifyingEmail(false); setEmailOtpSent(false); setDevEmailOtp(''); }} disabled={verifyingEmailLoading}>Cancel</button>
                </div>
                {emailOtpSent && (
                  <button type="button" className="self-start bg-transparent border-none text-primary text-[0.8rem] font-semibold cursor-pointer p-0 hover:underline" onClick={handleSendEmailOtp} disabled={verifyingEmailLoading}>
                    Resend Code
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Phone — full width with country code + Telegram verification */}
          <div className="flex flex-col gap-2 col-span-2 max-[768px]:col-span-1">
            <label className={FIELD_LABEL}>
              <span>Phone Number (for Telegram Alert Notifications)</span>
              {isPhoneModified
                ? <span className={BADGE_PENDING}>⚠️ UNVERIFIED</span>
                : user.phoneVerified
                  ? <span className={BADGE_VERIFIED}>✅ VERIFIED (TELEGRAM BOT)</span>
                  : <span className={BADGE_UNVERIFIED}>❌ NOT VERIFIED</span>
              }
            </label>
            <div className="flex gap-3 max-[768px]:flex-col">
              <select
                className="px-2 py-[0.75rem] border-[1.5px] border-white/20 dark:border-white/[0.08] bg-white/30 dark:bg-[rgba(22,27,34,0.8)] text-text-main dark:text-[#e6edf3] rounded-lg text-[0.95rem] cursor-pointer max-w-[160px] outline-none focus:border-primary transition-all"
                value={countryCode} onChange={handleCountryCodeChange} disabled={!isEditing || saving}
              >
                {countryCodes.map((c) => <option key={c.code} value={c.code}>{c.label}</option>)}
              </select>
              <input type="text" className={FIELD_INPUT} value={localPhone} onChange={handleLocalPhoneChange} disabled={!isEditing || saving} placeholder="Phone Number (e.g. 771234567)" />
              {isEditing && isPhoneModified && !verifyingPhone && (
                <button
                  type="button"
                  className="bg-primary hover:bg-primary-dark text-white border-none px-5 rounded-lg text-[0.875rem] font-semibold cursor-pointer whitespace-nowrap transition-colors disabled:opacity-60"
                  onClick={() => { setVerifyingPhone(true); handleSendPhoneOtp(); }}
                  disabled={verifyingPhoneLoading}
                >
                  Verify via Telegram
                </button>
              )}
            </div>

            {/* Telegram OTP card */}
            {isEditing && verifyingPhone && (
              <div className="profile-verification-card">
                <h5>Verify Phone Number via Telegram</h5>
                <div className="telegram-verification-content">
                  <div className="telegram-qr-section">
                    <div className="telegram-qr-wrapper">
                      <img
                        src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=https%3A%2F%2Ft.me%2FGUARD_yp_bot"
                        alt="Scan QR Code to open Telegram Bot"
                        className="telegram-qr-img"
                      />
                    </div>
                    <a
                      href="https://t.me/GUARD_yp_bot"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="telegram-qr-link"
                    >
                      Open Bot 📲
                    </a>
                  </div>

                  <div className="telegram-steps-section">
                    <p className="step-text">
                      1. Open our Telegram Bot: <a href="https://t.me/GUARD_yp_bot" target="_blank" rel="noopener noreferrer" className="telegram-link"><b>G.U.A.R.D Bot 🤖</b></a> (or scan the QR code / search <code>@GUARD_yp_bot</code> in Telegram).
                    </p>
                    <p className="step-text">
                      2. Send this 6-digit OTP code to the bot: <span className="otp-display-code">{devPhoneOtp}</span>
                    </p>
                    <p className="step-text">
                      3. The bot will respond by asking to share your contact details. Click the <b>Share Contact 📱</b> button in your Telegram app.
                    </p>
                    <p className="step-text">
                      4. Once the bot replies confirming successful verification, click the <b>Confirm Bot Verification</b> button below.
                    </p>
                  </div>
                </div>

                <div className="profile-verification-row" style={{ marginTop: '0.5rem' }}>
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    onClick={handleConfirmPhoneOtp}
                    disabled={verifyingPhoneLoading}
                  >
                    Confirm Bot Verification
                  </button>
                  <button
                    type="button"
                    className="btn btn-outline btn-sm"
                    onClick={() => {
                      setVerifyingPhone(false);
                      setDevPhoneOtp('');
                    }}
                    disabled={verifyingPhoneLoading}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── Action Buttons ── */}
        {/* .profile-actions */}
        <div className="flex items-center justify-end gap-4 border-t border-white/20 dark:border-white/[0.08] pt-6 flex-wrap max-[768px]:flex-col max-[768px]:items-stretch">
          {isEditing ? (
            <>
              {hasUnverifiedEdits && (
                <p className="flex-1 text-danger text-[0.85rem] font-semibold m-0 max-[768px]:text-center max-[768px]:mb-2">
                  ⚠️ Verify Email/Phone changes via OTP before saving details.
                </p>
              )}
              <button type="button" className="bg-transparent border-[1.5px] border-white/25 dark:border-white/[0.12] text-text-main dark:text-[#e6edf3] px-7 py-3 rounded-lg text-[0.95rem] font-semibold cursor-pointer hover:bg-white/20 dark:hover:bg-white/[0.06] transition-colors" onClick={onCancel} disabled={saving}>
                Cancel
              </button>
              <button type="button" className="bg-primary hover:bg-primary-dark text-white border-none px-7 py-3 rounded-lg text-[0.95rem] font-semibold cursor-pointer transition-colors disabled:opacity-60 disabled:cursor-not-allowed" onClick={onSave} disabled={saving || hasUnverifiedEdits}>
                {saving ? 'Saving...' : 'Save Profile'}
              </button>
            </>
          ) : (
            <button type="button" className="bg-primary hover:bg-primary-dark text-white border-none px-7 py-3 rounded-lg text-[0.95rem] font-semibold cursor-pointer transition-colors" onClick={() => setIsEditing(true)} disabled={saving}>
              Edit Details
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
