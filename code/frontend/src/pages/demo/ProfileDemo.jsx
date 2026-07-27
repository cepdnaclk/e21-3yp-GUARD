import { useAuth } from '../../context/AuthContext';
import '../../styles/profile.css';

export default function ProfileDemo() {
  const { user } = useAuth();

  const displayName = user?.fullName || user?.username || 'Demo User';
  const displayEmail = user?.email || 'demo@guard.local';
  const initials = displayName.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();

  return (
    <div className="profile-page" id="profile-page">
      {/* Header */}
      <div className="profile-header-card card">
        <div className="profile-avatar-wrap">
          <div className="profile-avatar-circle">{initials}</div>
        </div>
        <div className="profile-header-info">
          <h2 className="profile-display-name">{displayName}</h2>
          <p className="profile-role-chip">{user?.role || 'USER'}</p>
          <p className="profile-joined">
            Member since {user?.createdAt ? new Date(user.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : 'Demo'}
          </p>
        </div>
      </div>

      {/* Info section */}
      <div className="profile-section card">
        <h3 className="profile-section-title">Account Information</h3>
        <p style={{ fontSize: '0.85rem', opacity: 0.65, marginBottom: '1rem' }}>
          🎭 Demo mode — edits are disabled.
        </p>

        <div className="profile-form-grid">
          <div className="form-group">
            <label className="form-label">Full Name</label>
            <input className="form-input" type="text" readOnly value={displayName} />
          </div>
          <div className="form-group">
            <label className="form-label">Username</label>
            <input className="form-input" type="text" readOnly value={user?.username || 'demo_user'} />
          </div>
          <div className="form-group">
            <label className="form-label">Email</label>
            <input className="form-input" type="email" readOnly value={displayEmail} />
          </div>
          <div className="form-group">
            <label className="form-label">Phone Number</label>
            <input className="form-input" type="text" readOnly value={user?.phoneNumber || '+94 71 234 5678'} />
          </div>
          <div className="form-group profile-form-full">
            <label className="form-label">Address</label>
            <input className="form-input" type="text" readOnly value={user?.address || '123 Aqua Street, Colombo'} />
          </div>
        </div>

        <button className="btn btn-primary" disabled style={{ marginTop: '1rem' }}>
          Edit Profile
        </button>
      </div>

      {/* Notification preferences */}
      <div className="profile-section card">
        <h3 className="profile-section-title">Notification Preferences</h3>
        <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', marginTop: '0.75rem' }}>
          <div className="form-group">
            <label className="form-label">📧 Email Alerts</label>
            <button type="button" className="pref-toggle-btn enabled" disabled>Enabled</button>
          </div>
          <div className="form-group">
            <label className="form-label">🤖 Telegram Alerts</label>
            <button type="button" className="pref-toggle-btn enabled" disabled>Enabled</button>
          </div>
        </div>
      </div>

      {/* Theme hint */}
      <div className="profile-section card" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <div style={{ flex: 1 }}>
          <h3 className="profile-section-title" style={{ marginBottom: 4 }}>Appearance</h3>
          <p style={{ fontSize: '0.85rem', opacity: 0.65 }}>
            Toggle Light / Dark mode using the switch in the top navigation bar.
          </p>
        </div>
        <div style={{ fontSize: '1.5rem' }}>🌗</div>
      </div>
    </div>
  );
}
