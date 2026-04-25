import { useState } from 'react';
import { authApi } from '../services/api';
import { useAuth } from '../context/AuthContext';

const emptyForm = {
  username: '',
  email: '',
  password: '',
  fullName: '',
  address: '',
  phoneNumber: '',
};

export default function Users() {
  const { role } = useAuth();
  const [mode, setMode] = useState('');
  const [form, setForm] = useState(emptyForm);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const canCreateAdmin = role === 'SUPER_ADMIN';
  const canCreateUser = role === 'ADMIN' || role === 'SUPER_ADMIN';

  const openMode = (nextMode) => {
    setMode(nextMode);
    setForm(emptyForm);
    setError('');
    setSuccess('');
  };

  const setField = (field) => (e) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    setSuccess('');

    try {
      const payload = {
        username: form.username.trim(),
        email: form.email.trim(),
        password: form.password,
        fullName: form.fullName.trim(),
      };

      if (form.address.trim()) payload.address = form.address.trim();
      if (form.phoneNumber.trim()) payload.phoneNumber = form.phoneNumber.trim();

      if (mode === 'admin') {
        await authApi.createAdmin(payload);
        setSuccess('Admin account created successfully.');
      } else if (mode === 'user') {
        await authApi.createUser(payload);
        setSuccess('User account created successfully.');
      }

      setForm(emptyForm);
    } catch (err) {
      setError(err.message || 'Request failed.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <h3>Users</h3>

      <div className="card" style={{ marginBottom: '1rem' }}>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button
            type="button"
            className="btn btn-primary action-pill-btn"
            onClick={() => openMode('admin')}
            disabled={!canCreateAdmin || busy}
            title={canCreateAdmin ? 'Create ADMIN account' : 'Only SUPER_ADMIN can create admins'}
          >
            Add Admin
          </button>

          <button
            type="button"
            className="btn btn-primary action-pill-btn"
            onClick={() => openMode('user')}
            disabled={!canCreateUser || busy}
            title={canCreateUser ? 'Create USER account' : 'Only ADMIN or SUPER_ADMIN can create users'}
          >
            Add User
          </button>
        </div>
      </div>

      {mode && (
        <div className="card">
          <h3 style={{ marginTop: 0 }}>{mode === 'admin' ? 'Create Admin' : 'Create User'}</h3>

          {error ? <p className="error-msg">{error}</p> : null}
          {success ? <p className="profile-success-msg">{success}</p> : null}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Username *</label>
              <input type="text" value={form.username} onChange={setField('username')} required />
            </div>

            <div className="form-group">
              <label>Email *</label>
              <input type="email" value={form.email} onChange={setField('email')} required />
            </div>

            <div className="form-group">
              <label>Password *</label>
              <input type="password" value={form.password} onChange={setField('password')} required />
            </div>

            <div className="form-group">
              <label>Full Name *</label>
              <input type="text" value={form.fullName} onChange={setField('fullName')} required />
            </div>

            <div className="form-group">
              <label>Address</label>
              <input type="text" value={form.address} onChange={setField('address')} />
            </div>

            <div className="form-group">
              <label>Phone Number</label>
              <input type="text" value={form.phoneNumber} onChange={setField('phoneNumber')} />
            </div>

            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button type="submit" className="btn btn-primary" disabled={busy}>
                {busy ? 'Saving...' : mode === 'admin' ? 'Create Admin' : 'Create User'}
              </button>
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => {
                  setMode('');
                  setError('');
                  setSuccess('');
                }}
                disabled={busy}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
