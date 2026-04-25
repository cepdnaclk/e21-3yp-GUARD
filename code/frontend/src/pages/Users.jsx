import { useEffect, useState } from 'react';
import { authApi, deviceApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
import '../styles/devices.css';
import '../styles/profile.css';
import '../styles/users.css';

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
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAssignForm, setShowAssignForm] = useState(false);
  const [assignTargetUser, setAssignTargetUser] = useState(null);
  const [assignForm, setAssignForm] = useState({
    tankId: '',
  });
  const [showDeleteForm, setShowDeleteForm] = useState(false);
  const [deleteForm, setDeleteForm] = useState({
    userId: '',
    userName: '',
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [assignError, setAssignError] = useState('');
  const [deleteError, setDeleteError] = useState('');
  const [success, setSuccess] = useState('');
  const [listError, setListError] = useState('');

  const canCreateAdmin = role === 'SUPER_ADMIN';
  const canCreateUser = role === 'ADMIN';
  const canViewUsers = role === 'ADMIN';
  const canManageUsers = role === 'ADMIN';
  const canViewAdmins = role === 'SUPER_ADMIN';

  const [admins, setAdmins] = useState([]);
  const [adminListError, setAdminListError] = useState('');
  const [adminLoading, setAdminLoading] = useState(false);

  const loadUsers = async () => {
    if (!canViewUsers) {
      setUsers([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setListError('');

    try {
      const nextUsers = await authApi.getUsersByAdmin();
      setUsers(Array.isArray(nextUsers) ? nextUsers : []);
    } catch (err) {
      setListError(err.message || 'Failed to load users.');
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  const loadAdmins = async () => {
    if (!canViewAdmins) return;
    setAdminLoading(true);
    setAdminListError('');
    try {
      const data = await authApi.getAdminsBySuperAdmin();
      setAdmins(Array.isArray(data) ? data : []);
    } catch (err) {
      setAdminListError(err.message || 'Failed to load admins.');
      setAdmins([]);
    } finally {
      setAdminLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, [canViewUsers]);

  useEffect(() => {
    loadAdmins();
  }, [canViewAdmins]);

  const openMode = (nextMode) => {
    setMode(nextMode);
    setShowAssignForm(false);
    setAssignTargetUser(null);
    setAssignForm({ tankId: '' });
    setShowDeleteForm(false);
    setForm(emptyForm);
    setError('');
    setAssignError('');
    setSuccess('');
    setDeleteError('');
  };

  const openDeleteForm = () => {
    if (!canManageUsers) {
      setDeleteError('Only ADMIN can delete users.');
      return;
    }

    setShowDeleteForm(true);
    setShowAssignForm(false);
    setAssignTargetUser(null);
    setAssignForm({ tankId: '' });
    setMode('');
    setError('');
    setAssignError('');
    setSuccess('');
    setDeleteError('');
  };

  const openAssignFormFromActions = () => {
    if (!canManageUsers) {
      setError('Only ADMIN can assign tanks.');
      return;
    }

    if (!assignTargetUser) {
      setError('Select a worker first using the Assign Tank button in that row.');
      return;
    }

    setShowAssignForm(true);
    setShowDeleteForm(false);
    setMode('');
    setError('');
    setAssignError('');
    setSuccess('');
    setDeleteError('');
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
      await loadUsers();
    } catch (err) {
      setError(err.message || 'Request failed.');
    } finally {
      setBusy(false);
    }
  };

  const openAssignForm = (user) => {
    if (!canManageUsers) {
      setError('Only ADMIN can assign tanks.');
      return;
    }

    setAssignTargetUser(user);
    setAssignForm({ tankId: '' });
    setShowAssignForm(true);
    setShowDeleteForm(false);
    setMode('');
    setError('');
    setAssignError('');
    setSuccess('');
    setDeleteError('');
  };

  const handleAssignTank = async (e) => {
    e.preventDefault();

    if (!assignTargetUser) {
      setAssignError('Select a worker first.');
      return;
    }

    if (!canManageUsers) {
      setAssignError('Only ADMIN can assign tanks.');
      return;
    }

    const cleanTankId = assignForm.tankId.trim();

    if (!cleanTankId) {
      setAssignError('Tank ID is required.');
      return;
    }

    setBusy(true);
    setError('');
    setAssignError('');
    setSuccess('');

    try {
      await deviceApi.assignUser(cleanTankId, assignTargetUser.id);
      setSuccess(`Tank ${cleanTankId} assigned to ${assignTargetUser.fullName || assignTargetUser.username}.`);
      setAssignForm({ tankId: '' });
      setShowAssignForm(false);
      setAssignTargetUser(null);
      await loadUsers();
    } catch (err) {
      setAssignError(err.message || 'Failed to assign tank.');
    } finally {
      setBusy(false);
    }
  };

  const handleDeleteAdmin = async (adminId, adminName) => {
    if (!canViewAdmins) return;
    const confirmed = window.confirm(`Are you sure you want to permanently delete admin "${adminName}"?`);
    if (!confirmed) return;
    setBusy(true);
    setSuccess('');
    try {
      await authApi.deleteAdminBySuperAdmin(adminId);
      setSuccess(`Admin "${adminName}" deleted successfully.`);
      await loadAdmins();
    } catch (err) {
      setAdminListError(err.message || 'Failed to delete admin.');
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async (e) => {
    e.preventDefault();

    if (!canManageUsers) {
      setDeleteError('Only ADMIN can delete users.');
      return;
    }

    const userId = deleteForm.userId.trim();
    const userName = deleteForm.userName.trim();

    if (!userId || !userName) {
      setDeleteError('User ID and User Name are required.');
      return;
    }

    const confirmDelete = window.confirm(
      `Are you sure you want to permanently delete user ${userId} (${userName})?`
    );

    if (!confirmDelete) {
      return;
    }

    setBusy(true);
    setDeleteError('');
    setSuccess('');

    try {
      await authApi.deleteUserByAdmin(userId);
      setDeleteForm({
        userId: '',
        userName: '',
      });
      setShowDeleteForm(false);
      await loadUsers();
    } catch (err) {
      setDeleteError(err.message || 'Failed to delete user.');
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return <div className="empty-state"><p>Loading users...</p></div>;
  }

  return (
    <div>
      <div className="users-header devices-header">
        <h3>Users{canViewUsers ? ` (${users.length})` : ''}</h3>
      </div>

      <div className="card users-actions-card">
        <div className="devices-actions">
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
          {(mode || showAssignForm || showDeleteForm) ? (
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => {
                setMode('');
                setShowAssignForm(false);
                setAssignTargetUser(null);
                setAssignForm({ tankId: '' });
                setShowDeleteForm(false);
                setError('');
                setAssignError('');
                setDeleteError('');
                setSuccess('');
              }}
            >
              Cancel
            </button>
          ) : null}
        </div>
      </div>

      {mode && (
        <div className="card devices-form-card">
          <h3 className="users-form-title">{mode === 'admin' ? 'Create Admin' : 'Create User'}</h3>

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

            <div className="users-form-actions">
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

      {showAssignForm && canManageUsers && assignTargetUser && (
        <div className="card devices-form-card">
          <h3 className="devices-form-title">Assign Tank to {assignTargetUser.fullName || assignTargetUser.username}</h3>
          {assignError && <p className="error-msg">{assignError}</p>}
          <form onSubmit={handleAssignTank} className="devices-form">
            <div className="form-group devices-form-device-id">
              <label>Tank ID *</label>
              <input
                type="text"
                value={assignForm.tankId}
                onChange={(e) => setAssignForm({ tankId: e.target.value })}
                required
                placeholder="GUARD-001"
              />
            </div>

            <button type="submit" className="btn btn-primary devices-form-submit" disabled={busy}>
              {busy ? 'Assigning...' : 'Assign'}
            </button>
          </form>
        </div>
      )}

      {showDeleteForm && canManageUsers && (
        <div className="card devices-form-card">
          <h3 className="devices-form-title">Delete User</h3>
          {deleteError && <p className="error-msg">{deleteError}</p>}
          <form onSubmit={handleDelete} className="devices-form">
            <div className="form-group devices-form-device-id">
              <label>User ID *</label>
              <input
                type="text"
                value={deleteForm.userId}
                onChange={(e) => setDeleteForm({ ...deleteForm, userId: e.target.value })}
                required
                placeholder="USER_ID"
              />
            </div>
            <div className="form-group devices-form-device-name">
              <label>User Name *</label>
              <input
                type="text"
                value={deleteForm.userName}
                onChange={(e) => setDeleteForm({ ...deleteForm, userName: e.target.value })}
                required
                placeholder="John Doe"
              />
            </div>

            <button type="submit" className="btn btn-primary devices-form-submit" disabled={busy}>
              {busy ? 'Deleting...' : 'Delete'}
            </button>
          </form>
        </div>
      )}

      {canViewUsers ? (
        listError ? (
          <div className="empty-state"><p className="error-msg">{listError}</p></div>
        ) : users.length === 0 ? (
          <div className="empty-state"><p>No users created yet. Add a user to get started.</p></div>
        ) : (
          <div className="table-wrap card">
            <table>
              <thead>
                <tr>
                  <th>Username</th>
                  <th>Full Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Created</th>
                  <th>Assigned Tanks</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id}>
                    <td><strong>{user.username}</strong></td>
                    <td>{user.fullName || '—'}</td>
                    <td>{user.email}</td>
                    <td>
                      <span className={`badge ${user.role === 'ADMIN' ? 'badge-info' : 'badge-success'}`}>
                        {user.role}
                      </span>
                    </td>
                    <td>{user.createdAt ? new Date(user.createdAt).toLocaleDateString() : '—'}</td>
                    <td>{Array.isArray(user.assignedTankIds) ? user.assignedTankIds.length : 0}</td>
                    <td>
                      <div className="users-row-actions">
                        <button
                          type="button"
                          className="btn btn-outline btn-sm"
                          onClick={() => openAssignForm(user)}
                          disabled={busy}
                          title="Assign a tank to this user"
                        >
                          Assign Tank
                        </button>
                        <button
                          type="button"
                          className="btn btn-outline btn-sm btn-danger"
                          onClick={() => {
                            setDeleteForm({ userId: user.id, userName: user.fullName || user.username });
                            setShowDeleteForm(true);
                            setShowAssignForm(false);
                            setAssignTargetUser(null);
                            setMode('');
                          }}
                          disabled={busy}
                          title="Delete this user"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      ) : (
        <div className="empty-state">
          <p>The user list is available to ADMIN accounts.</p>
        </div>
      )}
      {canViewAdmins && (
        <div style={{ marginTop: '2rem' }}>
          <div className="users-header devices-header">
            <h3>Admins ({admins.length})</h3>
          </div>
          {adminLoading ? (
            <div className="empty-state"><p>Loading admins...</p></div>
          ) : adminListError ? (
            <div className="empty-state"><p className="error-msg">{adminListError}</p></div>
          ) : admins.length === 0 ? (
            <div className="empty-state"><p>No admins found. Use "Add Admin" to create one.</p></div>
          ) : (
            <div className="table-wrap card">
              <table>
                <thead>
                  <tr>
                    <th>Username</th>
                    <th>Full Name</th>
                    <th>Email</th>
                    <th>Phone</th>
                    <th>Created</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {admins.map((admin) => (
                    <tr key={admin.id}>
                      <td><strong>{admin.username}</strong></td>
                      <td>{admin.fullName || '—'}</td>
                      <td>{admin.email}</td>
                      <td>{admin.phoneNumber || '—'}</td>
                      <td>{admin.createdAt ? new Date(admin.createdAt).toLocaleDateString() : '—'}</td>
                      <td>
                        <div className="users-row-actions">
                          <button
                            type="button"
                            className="btn btn-outline btn-sm btn-danger"
                            onClick={() => handleDeleteAdmin(admin.id, admin.fullName || admin.username)}
                            disabled={busy}
                            title="Delete this admin"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
