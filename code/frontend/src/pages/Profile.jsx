import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { authApi, getImageUrl } from '../services/api';
import '../styles/profile.css';

const countryCodes = [
  { code: '+94', label: 'Sri Lanka (+94)' },
  { code: '+91', label: 'India (+91)' },
  { code: '+1', label: 'United States (+1)' },
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
  // Check if starts with +
  if (phone.startsWith('+')) {
    const matches = phone.match(/^(\+\d{1,4})(.*)$/);
    if (matches) {
      return { code: matches[1], local: matches[2].trim() };
    }
  }
  return { code: '+94', local: phone };
}

export default function Profile() {
  const { user, updateProfile, refreshUser } = useAuth();
  const navigate = useNavigate();

  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Primary profile form fields
  const [form, setForm] = useState({
    username: '',
    fullName: '',
    email: '',
    phoneNumber: '',
    address: '',
  });

  // Country code & Local phone states
  const [countryCode, setCountryCode] = useState('+94');
  const [localPhone, setLocalPhone] = useState('');

  // Verification UI sub-states
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
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }, [user]);

  if (!user) return null;

  const onChange = (field) => (e) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
  };

  const handleLocalPhoneChange = (e) => {
    const val = e.target.value.replace(/\D/g, ''); // Numeric characters only
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
      username: user.username || '',
      fullName: user.fullName || '',
      email: user.email || '',
      phoneNumber: user.phoneNumber || '',
      address: user.address || '',
    });
    setIsEditing(false);
    setVerifyingEmail(false);
    setVerifyingPhone(false);
    setEmailOtpSent(false);
    setError('');
    setSuccess('');
  };

  // Profile Picture Upload
  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError('');
    setSuccess('');
    setSaving(true);

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

  // Profile Picture Delete
  const handlePhotoDelete = async () => {
    if (!window.confirm('Are you sure you want to remove your profile picture?')) return;

    setError('');
    setSuccess('');
    setSaving(true);

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

  // Email verification trigger
  const handleSendEmailOtp = async () => {
    if (!form.email.trim()) {
      setError('Please enter a valid email address.');
      return;
    }
    setError('');
    setVerifyingEmailLoading(true);
    try {
      const res = await authApi.sendEmailOtp(form.email.trim());
      setEmailOtpSent(true);
      if (res.debugOtp) {
        setDevEmailOtp(res.debugOtp);
      }
      setSuccess('Verification OTP sent to your new email.');
    } catch (err) {
      setError(err.message || 'Failed to send verification code.');
    } finally {
      setVerifyingEmailLoading(false);
    }
  };

  // Email verification confirm
  const handleConfirmEmailOtp = async () => {
    if (!emailOtp.trim()) {
      setError('Please enter the verification code.');
      return;
    }
    setError('');
    setVerifyingEmailLoading(true);
    try {
      await authApi.confirmEmailOtp(emailOtp.trim());
      await refreshUser();
      setVerifyingEmail(false);
      setEmailOtpSent(false);
      setDevEmailOtp('');
      setEmailOtp('');
      setSuccess('Email successfully verified and updated.');
    } catch (err) {
      setError(err.message || 'Verification failed. Please check the code.');
    } finally {
      setVerifyingEmailLoading(false);
    }
  };

  // Phone verification trigger (Generates code)
  const handleSendPhoneOtp = async () => {
    const combinedPhone = (countryCode + localPhone).trim();
    if (!localPhone.trim()) {
      setError('Please enter a valid phone number.');
      return;
    }
    setError('');
    setVerifyingPhoneLoading(true);
    try {
      const res = await authApi.sendPhoneOtp(combinedPhone);
      if (res.debugOtp) {
        setDevPhoneOtp(res.debugOtp);
      }
      setSuccess('Verification code generated. Please complete verification on Telegram.');
    } catch (err) {
      setError(err.message || 'Failed to initiate Telegram verification.');
    } finally {
      setVerifyingPhoneLoading(false);
    }
  };

  // Phone verification confirm (Checks database status)
  const handleConfirmPhoneOtp = async () => {
    setError('');
    setVerifyingPhoneLoading(true);
    try {
      await authApi.confirmPhoneOtp();
      await refreshUser();
      setVerifyingPhone(false);
      setDevPhoneOtp('');
      setSuccess('Phone number successfully verified and linked.');
    } catch (err) {
      setError(err.message || 'Verification is still pending. Ensure you shared contact with the bot first.');
    } finally {
      setVerifyingPhoneLoading(false);
    }
  };

  // General details save
  const onSave = async () => {
    if (!form.fullName.trim()) {
      setError('Full name is required.');
      return;
    }

    setSaving(true);
    setError('');
    setSuccess('');

    try {
      await updateProfile({
        fullName: form.fullName.trim(),
        address: form.address.trim(),
      });
      const latestUser = await refreshUser();
      setForm({
        username: latestUser.username || '',
        fullName: latestUser.fullName || '',
        email: latestUser.email || '',
        phoneNumber: latestUser.phoneNumber || '',
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

  // Compare normalized values to detect modifications
  const isEmailModified = form.email.trim().toLowerCase() !== user.email?.toLowerCase();
  const isPhoneModified = form.phoneNumber.trim() !== (user.phoneNumber || '');

  const hasUnverifiedEdits = isEmailModified || isPhoneModified;

  return (
    <div className="profile-page">
      <div className="profile-top-bar">
        <h3 className="profile-title">My Profile</h3>
      </div>

      <div className="profile-card">
        {/* Profile Header Block */}
        <div className="profile-header-section">
          <div className="profile-avatar-container">
            {user.profilePicture ? (
              <img
                src={getImageUrl(user.profilePicture)}
                alt="Profile"
                className="profile-picture"
              />
            ) : (
              <div className="profile-picture-default">
                👤
              </div>
            )}
            
            {/* Upload Hover overlay */}
            <div className="profile-avatar-overlay">
              <label htmlFor="profile-upload" className="profile-upload-label" title="Upload New Photo">
                📷
              </label>
              <input
                id="profile-upload"
                type="file"
                accept="image/*"
                onChange={handlePhotoUpload}
                disabled={saving}
                style={{ display: 'none' }}
              />
            </div>
          </div>

          <div className="profile-summary">
            <h4>{user.fullName || 'User'}</h4>
            <p className="profile-role-badge">{user.role}</p>
            {user.profilePicture && (
              <button
                type="button"
                className="profile-photo-delete-btn"
                onClick={handlePhotoDelete}
                disabled={saving}
              >
                Remove Photo
              </button>
            )}
          </div>
        </div>

        {/* Feedback Notifications */}
        {error && <div className="profile-alert profile-alert-danger">{error}</div>}
        {success && <div className="profile-alert profile-alert-success">{success}</div>}

        {/* Dev Mode Verification Code Banners */}
        {devEmailOtp && (
          <div className="profile-alert profile-alert-info dev-banner">
            ⚙️ <strong>[DEV MOCK]</strong> Email Verification Code: <code>{devEmailOtp}</code>
          </div>
        )}

        {/* Fields grid */}
        <div className="profile-grid">
          {/* Username (Locked) */}
          <div className="profile-field-container">
            <label className="profile-field-label">
              <span>Username</span>
              <span className="profile-lock-tag">🔒 LOCKED</span>
            </label>
            <input
              type="text"
              className="profile-field-input"
              value={form.username}
              disabled
              placeholder="Username"
            />
          </div>

          {/* Member Since (Readonly) */}
          <div className="profile-field-container">
            <label className="profile-field-label">
              <span>Member Since</span>
            </label>
            <input
              type="text"
              className="profile-field-input"
              value={memberSince}
              disabled
            />
          </div>

          {/* Full Name */}
          <div className="profile-field-container">
            <label className="profile-field-label">
              <span>Full Name</span>
            </label>
            <input
              type="text"
              className="profile-field-input"
              value={form.fullName}
              onChange={onChange('fullName')}
              disabled={!isEditing || saving}
              placeholder="Full Name"
            />
          </div>

          {/* Address */}
          <div className="profile-field-container">
            <label className="profile-field-label">
              <span>Address</span>
            </label>
            <input
              type="text"
              className="profile-field-input"
              value={form.address}
              onChange={onChange('address')}
              disabled={!isEditing || saving}
              placeholder="Address"
            />
          </div>

          {/* Email (with Verification Badge) */}
          <div className="profile-field-container flex-col-span-2">
            <label className="profile-field-label">
              <span>Email Address</span>
              {isEmailModified ? (
                <span className="profile-badge-pending">⚠️ UNVERIFIED</span>
              ) : (
                <span className="profile-badge-verified">✅ VERIFIED</span>
              )}
            </label>
            <div className="profile-input-group">
              <input
                type="email"
                className="profile-field-input"
                value={form.email}
                onChange={onChange('email')}
                disabled={!isEditing || saving}
                placeholder="Email Address"
              />
              {isEditing && isEmailModified && !verifyingEmail && (
                <button
                  type="button"
                  className="profile-inline-verify-btn"
                  onClick={() => {
                    setVerifyingEmail(true);
                    handleSendEmailOtp();
                  }}
                  disabled={verifyingEmailLoading}
                >
                  Verify Email
                </button>
              )}
            </div>

            {/* Email OTP Verification UI */}
            {isEditing && verifyingEmail && (
              <div className="profile-verification-card">
                <h5>Confirm New Email</h5>
                <p>We sent a 6-digit verification code to <strong>{form.email}</strong>.</p>
                <div className="profile-verification-row">
                  <input
                    type="text"
                    maxLength={6}
                    placeholder="Enter Code"
                    value={emailOtp}
                    onChange={(e) => setEmailOtp(e.target.value)}
                    disabled={verifyingEmailLoading}
                  />
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    onClick={handleConfirmEmailOtp}
                    disabled={verifyingEmailLoading}
                  >
                    Confirm Code
                  </button>
                  <button
                    type="button"
                    className="btn btn-outline btn-sm"
                    onClick={() => {
                      setVerifyingEmail(false);
                      setEmailOtpSent(false);
                      setDevEmailOtp('');
                    }}
                    disabled={verifyingEmailLoading}
                  >
                    Cancel
                  </button>
                </div>
                {emailOtpSent && (
                  <button
                    type="button"
                    className="profile-resend-link"
                    onClick={handleSendEmailOtp}
                    disabled={verifyingEmailLoading}
                  >
                    Resend Code
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Phone Number (with Country Code Dropdown and Telegram Bot Verification instructions) */}
          <div className="profile-field-container flex-col-span-2">
            <label className="profile-field-label">
              <span>Phone Number (for Telegram Alert Notifications)</span>
              {isPhoneModified ? (
                <span className="profile-badge-pending">⚠️ UNVERIFIED</span>
              ) : user.phoneVerified ? (
                <span className="profile-badge-verified">✅ VERIFIED (TELEGRAM BOT)</span>
              ) : (
                <span className="profile-badge-unverified">❌ NOT VERIFIED</span>
              )}
            </label>
            <div className="profile-input-group">
              <select
                className="profile-country-dropdown"
                value={countryCode}
                onChange={handleCountryCodeChange}
                disabled={!isEditing || saving}
              >
                {countryCodes.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.label}
                  </option>
                ))}
              </select>
              <input
                type="text"
                className="profile-field-input"
                value={localPhone}
                onChange={handleLocalPhoneChange}
                disabled={!isEditing || saving}
                placeholder="Phone Number (e.g. 771234567)"
              />
              {isEditing && isPhoneModified && !verifyingPhone && (
                <button
                  type="button"
                  className="profile-inline-verify-btn"
                  onClick={() => {
                    setVerifyingPhone(true);
                    handleSendPhoneOtp();
                  }}
                  disabled={verifyingPhoneLoading}
                >
                  Verify via Telegram
                </button>
              )}
            </div>

            {/* Telegram Bot Phone Verification UI */}
            {isEditing && verifyingPhone && (
              <div className="profile-verification-card">
                <h5>Verify Phone Number via Telegram</h5>
                <p className="step-text">
                  1. Open our Telegram Bot: <a href="https://t.me/GUARD_yp_bot" target="_blank" rel="noopener noreferrer" className="telegram-link"><b>G.U.A.R.D Bot 🤖</b></a> (or search for <code>@GUARD_yp_bot</code> in Telegram).
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

        {/* Action Buttons */}
        <div className="profile-actions">
          {isEditing ? (
            <>
              {hasUnverifiedEdits && (
                <p className="profile-unverified-warning">
                  ⚠️ Verify Email/Phone changes via OTP before saving details.
                </p>
              )}
              <button
                type="button"
                className="profile-btn-cancel"
                onClick={onCancel}
                disabled={saving}
              >
                Cancel
              </button>
              <button
                type="button"
                className="profile-btn-save"
                onClick={onSave}
                disabled={saving || hasUnverifiedEdits}
              >
                {saving ? 'Saving...' : 'Save Profile'}
              </button>
            </>
          ) : (
            <button
              type="button"
              className="profile-btn-edit"
              onClick={() => setIsEditing(true)}
              disabled={saving}
            >
              Edit Details
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
