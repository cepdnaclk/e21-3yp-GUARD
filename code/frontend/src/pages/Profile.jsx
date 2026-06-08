import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import '../styles/profile.css';

function getInitials(user) {
  if (user?.fullName) {
    return user.fullName
      .split(' ')
      .filter(Boolean)
      .map((word) => word[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  }
  return (user?.username?.[0] || 'U').toUpperCase();
}

export default function Profile() {
  const { user, updateProfile, refreshUser } = useAuth();
  const navigate = useNavigate();
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [form, setForm] = useState({
    username: '',
    fullName: '',
    email: '',
    phoneNumber: '',
    address: '',
  });

  useEffect(() => {
    if (!user) return;
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
    return new Date(user.createdAt).toLocaleDateString();
  }, [user]);

  if (!user) return null;

  const onChange = (field) => (e) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
  };

  const onCancel = () => {
    setForm({
      username: user.username || '',
      fullName: user.fullName || '',
      email: user.email || '',
      phoneNumber: user.phoneNumber || '',
      address: user.address || '',
    });
    setIsEditing(false);
    setError('');
    setSuccess('');
  };

  const onEditClick = async () => {
    if (!isEditing) {
      setIsEditing(true);
      setError('');
      setSuccess('');
      return;
    }

    if (!form.username.trim() || !form.fullName.trim()) {
      setError('Username and Full Name are required.');
      return;
    }

    setSaving(true);
    setError('');
    setSuccess('');

    try {
      await updateProfile({
        username: form.username.trim(),
        fullName: form.fullName.trim(),
        // email omitted: cannot be changed from profile UI
        phoneNumber: form.phoneNumber.trim(),
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
      setSuccess('Profile updated and verified from the database.');
    } catch (err) {
      setError(err.message || 'Failed to update profile.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="profile-page">
      <div className="profile-top-bar">
        <h3 className="profile-title">My Profile</h3>
      </div>

      <div className="profile-avatar-placeholder" aria-label="Profile image placeholder">
        {getInitials(user)}
      </div>

      <div className="profile-card">
        {error ? <p className="error-msg profile-message">{error}</p> : null}
        {success ? <p className="profile-success-msg profile-message">{success}</p> : null}
        

        <div className="profile-grid">
          <label className="profile-field">
            <span className='field text'>Email</span>
            <input
              type="email"
              value={form.email}
              // Email cannot be edited from the profile page
              disabled={true}
              placeholder="Email"
            />
          </label>

          <label className="profile-field">
            <span className='field text'>Username</span>
            <input
              type="text"
              value={form.username}
              onChange={onChange('username')}
              disabled={!isEditing || saving}
              placeholder="Username"
            />
          </label>

          <label className="profile-field">
            <span className='field text'>Full Name</span>
            <input
              type="text"
              value={form.fullName}
              onChange={onChange('fullName')}
              disabled={!isEditing || saving}
              placeholder="Full Name"
            />
          </label>

          <label className="profile-field">
            <span className='field text'>Address</span>
            <input
              type="text"
              value={form.address}
              onChange={onChange('address')}
              disabled={!isEditing || saving}
              placeholder="Address"
            />
          </label>

          <label className="profile-field">
            <span className='field text'>Phone Number</span>
            <input
              type="text"
              value={form.phoneNumber}
              onChange={onChange('phoneNumber')}
              disabled={!isEditing || saving}
              placeholder="Phone Number"
            />
          </label>

          <label className="profile-field">
            <span className='field text'>Member Since</span>
            <input type="text" value={memberSince} disabled />
          </label>
        </div>

        <div className="profile-actions">
          {isEditing ? (
            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={onCancel}
              disabled={saving}
            >
              Cancel
            </button>
          ) : null}
          <button
            type="button"
            className="profile-edit-btn"
            onClick={onEditClick}
            disabled={saving}
          >
            {saving ? 'Saving...' : isEditing ? 'Save' : 'Edit'}
          </button>
        </div>
      </div>
    </div>
  );
}
