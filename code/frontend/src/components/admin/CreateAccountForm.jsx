import { useState } from 'react';
import { authApi } from '../../services/api';
import '../../styles/CreateAccountForm.css';

const EMPTY_FORM = {
  username: '', email: '', password: '', fullName: '', address: '', phoneNumber: '',
};

/**
 * Form to create a new admin or user account.
 *
 * @param {{ mode: 'admin'|'user', onSuccess: (message: string) => void, onCancel: () => void }} props
 */
export default function CreateAccountForm({ mode, onSuccess, onCancel }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const setField = (field) => (e) => setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const payload = {
        username: form.username.trim(),
        email: form.email.trim(),
        password: form.password,
        fullName: form.fullName.trim(),
      };
      if (form.address.trim()) payload.address = form.address.trim();
      if (form.phoneNumber.trim()) payload.phoneNumber = form.phoneNumber.trim();

      const result = mode === 'admin'
        ? await authApi.createAdmin(payload)
        : await authApi.createUser(payload);

      onSuccess(result.message || `${mode === 'admin' ? 'Admin' : 'User'} account created successfully.`);
      setForm(EMPTY_FORM);
    } catch (err) {
      setError(err.message || 'Request failed.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="card devices-form-card">
      <h3 className="users-form-title">{mode === 'admin' ? 'Create Admin' : 'Create User'}</h3>
      {error && <p className="error-msg">{error}</p>}
      <form onSubmit={handleSubmit}>
        <div className="form-group"><label>Username *</label><input className='form-input' type="text" value={form.username} onChange={setField('username')} required /></div>
        <div className="form-group"><label>Email *</label><input className='form-input' type="email" value={form.email} onChange={setField('email')} required /></div>
        <div className="form-group"><label>Password *</label><input className='form-input' type="password" value={form.password} onChange={setField('password')} required /></div>
        <div className="form-group"><label>Full Name *</label><input className='form-input' type="text" value={form.fullName} onChange={setField('fullName')} required /></div>
        <div className="form-group"><label>Address</label><input className='form-input' type="text" value={form.address} onChange={setField('address')} /></div>
        <div className="form-group"><label>Phone Number</label><input className='form-input' type="text" value={form.phoneNumber} onChange={setField('phoneNumber')} /></div>
        <div className="users-form-actions">
          <button type="submit" className="btn btn-primary" disabled={busy}>
            {busy ? 'Saving...' : mode === 'admin' ? 'Create Admin' : 'Create User'}
          </button>
          <button type="button" className="btn btn-outline" onClick={onCancel} disabled={busy}>Cancel</button>
        </div>
      </form>
    </div>
  );
}
