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

const emptyDeviceForm = {
  tankId: '',
  productKey: '',
};

export default function Users() {
  const { role } = useAuth();
  const [mode, setMode] = useState('');
  const [form, setForm] = useState(emptyForm);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAssignForm, setShowAssignForm] = useState(false);
  const [assignTargetUser, setAssignTargetUser] = useState(null);
  const [assignForm, setAssignForm] = useState({ tankId: '' });
  const [showDeleteForm, setShowDeleteForm] = useState(false);
  const [deleteForm, setDeleteForm] = useState({ userId: '', userName: '' });
  const [showDeviceForm, setShowDeviceForm] = useState(false);
  const [deviceForm, setDeviceForm] = useState(emptyDeviceForm);
  const [deviceError, setDeviceError] = useState('');
  const [deviceSuccess, setDeviceSuccess] = useState('');
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
  const canAddDevice = role === 'SUPER_ADMIN';
  const canViewInventory = role === 'SUPER_ADMIN';

  const [admins, setAdmins] = useState([]);
  const [adminListError, setAdminListError] = useState('');
  const [adminLoading, setAdminLoading] = useState(false);
  const [inventory, setInventory] = useState([]);
  const [inventoryLoading, setInventoryLoading] = useState(false);

  const loadUsers = async () => {
    if (!canViewUsers) { setUsers([]); setLoading(false); return; }
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

  const loadInventory = async () => {
    if (!canViewInventory) return;
    setInventoryLoading(true);
    try {
      const tanks = await deviceApi.list();
      setInventory(Array.isArray(tanks) ? tanks : []);
    } catch { setInventory([]); }
    finally { setInventoryLoading(false); }
  };

  useEffect(() => { loadUsers(); }, [canViewUsers]);
  useEffect(() => { loadAdmins(); }, [canViewAdmins]);
  useEffect(() => { loadInventory(); }, [canViewInventory]);

  const closeAll = () => {
    setMode('');
    setShowAssignForm(false);
    setAssignTargetUser(null);
    setAssignForm({ tankId: '' });
    setShowDeleteForm(false);
    setShowDeviceForm(false);
    setDeviceForm(emptyDeviceForm);
    setForm(emptyForm);
    setError('');
    setAssignError('');
    setSuccess('');
    setDeleteError('');
    setDeviceError('');
    setDeviceSuccess('');
  };

  const openMode = (nextMode) => { closeAll(); setMode(nextMode); };

  const setField = (field) => (e) => setForm((prev) => ({ ...prev, [field]: e.target.value }));

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
        const result = await authApi.createAdmin(payload);
        setSuccess(result.message || 'Admin account created successfully.');
      } else if (mode === 'user') {
        const result = await authApi.createUser(payload);
        setSuccess(result.message || 'User account created successfully.');
      }
      setForm(emptyForm);
      await loadUsers();
    } catch (err) {
      setError(err.message || 'Request failed.');
    } finally {
      setBusy(false);
    }
  };

  // Auto-format product key as XXXX-XXXX-XXXX-XXXX while typing
  const handleDeviceKeyChange = (e) => {
    const digits = e.target.value.replace(/-/g, '').replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, 16);
    const formatted = digits.replace(/(.{4})(?=.)/g, '$1-');
    setDeviceForm((prev) => ({ ...prev, productKey: formatted }));
  };

  const handleAddDevice = async (e) => {
    e.preventDefault();
    setDeviceError('');
    setDeviceSuccess('');
    const rawKey = deviceForm.productKey.replace(/-/g, '');
    if (rawKey.length !== 16) {
      setDeviceError('Product Key must be exactly 16 characters.');
      return;
    }
    if (!deviceForm.tankId.trim()) {
      setDeviceError('Tank ID is required.');
      return;
    }
    setBusy(true);
    try {
      const result = await deviceApi.addProduct(deviceForm.tankId.trim(), rawKey);
      setDeviceSuccess(result.message || 'Device added to inventory successfully.');
      setDeviceForm(emptyDeviceForm);
      await loadInventory();
    } catch (err) {
      setDeviceError(err.message || 'Failed to add device.');
    } finally {
      setBusy(false);
    }
  };

  const openAssignForm = (user) => {
    if (!canManageUsers) { setError('Only ADMIN can assign tanks.'); return; }
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
    if (!assignTargetUser) { setAssignError('Select a worker first.'); return; }
    if (!canManageUsers) { setAssignError('Only ADMIN can assign tanks.'); return; }
    const cleanTankId = assignForm.tankId.trim();
    if (!cleanTankId) { setAssignError('Tank ID is required.'); return; }
    setBusy(true);
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
    if (!window.confirm(`Are you sure you want to permanently delete admin "${adminName}"?`)) return;
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
    if (!canManageUsers) { setDeleteError('Only ADMIN can delete users.'); return; }
    const userId = deleteForm.userId.trim();
    const userName = deleteForm.userName.trim();
    if (!userId || !userName) { setDeleteError('User ID and User Name are required.'); return; }
    if (!window.confirm(`Are you sure you want to permanently delete user ${userId} (${userName})?`)) return;
    setBusy(true);
    setDeleteError('');
    setSuccess('');
    try {
      await authApi.deleteUserByAdmin(userId);
      setDeleteForm({ userId: '', userName: '' });
      setShowDeleteForm(false);
      await loadUsers();
    } catch (err) {
      setDeleteError(err.message || 'Failed to delete user.');
    } finally {
      setBusy(false);
    }
  };

  const anyPanelOpen = mode || showAssignForm || showDeleteForm || showDeviceForm;

  if (loading) return <div className="empty-state"><p>Loading users...</p></div>;

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
          {/* Hide Add User button for SUPER_ADMIN — they don't manage users directly */}
          {canCreateUser && (
            <button
              type="button"
              className="btn btn-primary action-pill-btn"
              onClick={() => openMode('user')}
              disabled={busy}
              title="Create USER account"
            >
              Add User
            </button>
          )}
          {canAddDevice && (
            <button
              type="button"
              className="btn btn-primary action-pill-btn"
              onClick={() => { closeAll(); setShowDeviceForm(true); }}
              disabled={busy}
              title="Add a new device to the inventory"
            >
              Add Device
            </button>
          )}
          {anyPanelOpen && (
            <button type="button" className="btn btn-primary" onClick={closeAll}>
              Cancel
            </button>
          )}
        </div>
      </div>

      {/* Create Admin / User form */}
      {mode && (
        <div className="card devices-form-card">
          <h3 className="users-form-title">{mode === 'admin' ? 'Create Admin' : 'Create User'}</h3>
          {error && <p className="error-msg">{error}</p>}
          {success && <p className="profile-success-msg">{success}</p>}
          <form onSubmit={handleSubmit}>
            <div className="form-group"><label>Username *</label><input type="text" value={form.username} onChange={setField('username')} required /></div>
            <div className="form-group"><label>Email *</label><input type="email" value={form.email} onChange={setField('email')} required /></div>
            <div className="form-group"><label>Password *</label><input type="password" value={form.password} onChange={setField('password')} required /></div>
            <div className="form-group"><label>Full Name *</label><input type="text" value={form.fullName} onChange={setField('fullName')} required /></div>
            <div className="form-group"><label>Address</label><input type="text" value={form.address} onChange={setField('address')} /></div>
            <div className="form-group"><label>Phone Number</label><input type="text" value={form.phoneNumber} onChange={setField('phoneNumber')} /></div>
            <div className="users-form-actions">
              <button type="submit" className="btn btn-primary" disabled={busy}>
                {busy ? 'Saving...' : mode === 'admin' ? 'Create Admin' : 'Create User'}
              </button>
              <button type="button" className="btn btn-outline" onClick={() => { setMode(''); setError(''); setSuccess(''); }} disabled={busy}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Super Admin: Add Device to Inventory */}
      {showDeviceForm && canAddDevice && (
        <div className="card devices-form-card">
          <h3 className="devices-form-title">Add New Device to Inventory</h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
            This creates a new device record with no owner. An Admin can claim it by entering the product key from their dashboard.
          </p>
          {deviceError && <p className="error-msg">{deviceError}</p>}
          {deviceSuccess && <p className="profile-success-msg">{deviceSuccess}</p>}
          <form onSubmit={handleAddDevice} className="devices-form">
            <div className="form-group devices-form-device-id">
              <label>Tank ID (Device ID) *</label>
              <input
                type="text"
                value={deviceForm.tankId}
                onChange={(e) => setDeviceForm((prev) => ({ ...prev, tankId: e.target.value.toUpperCase() }))}
                required
                placeholder="GUARD-201"
              />
            </div>
            <div className="form-group devices-form-device-name">
              <label>Product Key *</label>
              <input
                type="text"
                value={deviceForm.productKey}
                onChange={handleDeviceKeyChange}
                required
                placeholder="XXXX-XXXX-XXXX-XXXX"
                maxLength={19}
              />
            </div>
            <button type="submit" className="btn btn-primary devices-form-submit" disabled={busy}>
              {busy ? 'Adding...' : 'Add to Inventory'}
            </button>
          </form>
        </div>
      )}

      {/* Assign Tank form */}
      {showAssignForm && canManageUsers && assignTargetUser && (
        <div className="card devices-form-card">
          <h3 className="devices-form-title">Assign Tank to {assignTargetUser.fullName || assignTargetUser.username}</h3>
          {assignError && <p className="error-msg">{assignError}</p>}
          <form onSubmit={handleAssignTank} className="devices-form">
            <div className="form-group devices-form-device-id">
              <label>Tank ID *</label>
              <input type="text" value={assignForm.tankId} onChange={(e) => setAssignForm({ tankId: e.target.value })} required placeholder="GUARD-001" />
            </div>
            <button type="submit" className="btn btn-primary devices-form-submit" disabled={busy}>
              {busy ? 'Assigning...' : 'Assign'}
            </button>
          </form>
        </div>
      )}

      {/* Delete User form */}
      {showDeleteForm && canManageUsers && (
        <div className="card devices-form-card">
          <h3 className="devices-form-title">Delete User</h3>
          {deleteError && <p className="error-msg">{deleteError}</p>}
          <form onSubmit={handleDelete} className="devices-form">
            <div className="form-group devices-form-device-id">
              <label>User ID *</label>
              <input type="text" value={deleteForm.userId} onChange={(e) => setDeleteForm({ ...deleteForm, userId: e.target.value })} required placeholder="USER_ID" />
            </div>
            <div className="form-group devices-form-device-name">
              <label>User Name *</label>
              <input type="text" value={deleteForm.userName} onChange={(e) => setDeleteForm({ ...deleteForm, userName: e.target.value })} required placeholder="John Doe" />
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
                  <th>Username</th><th>Full Name</th><th>Email</th><th>Role</th><th>Created</th><th>Assigned Tanks</th><th></th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id}>
                    <td><strong>{user.username}</strong></td>
                    <td>{user.fullName || '—'}</td>
                    <td>{user.email}</td>
                    <td>
                      <span className={`badge ${user.role === 'ADMIN' ? 'badge-info' : 'badge-success'}`}>{user.role}</span>
                    </td>
                    <td>{user.createdAt ? new Date(user.createdAt).toLocaleDateString() : '—'}</td>
                    <td>{Array.isArray(user.assignedTankIds) ? user.assignedTankIds.length : 0}</td>
                    <td>
                      <div className="users-row-actions">
                        <button type="button" className="btn btn-outline btn-sm" onClick={() => openAssignForm(user)} disabled={busy} title="Assign a tank to this user">
                          Assign Tank
                        </button>
                        <button
                          type="button" className="btn btn-outline btn-sm btn-danger"
                          onClick={() => { setDeleteForm({ userId: user.id, userName: user.fullName || user.username }); setShowDeleteForm(true); setShowAssignForm(false); setAssignTargetUser(null); setMode(''); }}
                          disabled={busy} title="Delete this user"
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
        <div className="empty-state"><p>The user list is available to ADMIN accounts.</p></div>
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
                  <tr><th>Username</th><th>Full Name</th><th>Email</th><th>Phone</th><th>Created</th><th></th></tr>
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
                          <button type="button" className="btn btn-outline btn-sm btn-danger" onClick={() => handleDeleteAdmin(admin.id, admin.fullName || admin.username)} disabled={busy} title="Delete this admin">
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

      {/* ── Super Admin: Device Inventory ── */}
      {canViewInventory && (
        <div style={{ marginTop: '2rem' }}>
          <div className="users-header devices-header">
            <h3>Device Inventory ({inventory.length})</h3>
          </div>
          {inventoryLoading ? (
            <div className="empty-state"><p>Loading inventory...</p></div>
          ) : inventory.length === 0 ? (
            <div className="empty-state"><p>No devices in inventory. Use "Add Device" to add one.</p></div>
          ) : (
            <div className="table-wrap card">
              <table>
                <thead>
                  <tr>
                    <th>Tank ID</th>
                    <th>Product Key</th>
                    <th>Status</th>
                    <th>Created</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {inventory.map((device) => (
                    <tr key={device.deviceId}>
                      <td><strong>{device.deviceId}</strong></td>
                      <td><code style={{ fontSize: '0.8rem', letterSpacing: '0.05em' }}>{device.productKey || '—'}</code></td>
                      <td>
                        <span className={`badge ${device.isRegistered ? 'badge-success' : 'badge-info'}`}>
                          {device.isRegistered ? 'Registered' : 'Unregistered'}
                        </span>
                      </td>
                      <td>{device.createdAt ? new Date(device.createdAt).toLocaleDateString() : '—'}</td>
                      <td>
                        <button
                          type="button"
                          className="btn btn-outline btn-sm btn-danger"
                          disabled={busy}
                          onClick={async () => {
                            if (!window.confirm(`Delete device ${device.deviceId}? This cannot be undone.`)) return;
                            setBusy(true);
                            try {
                              await deviceApi.deleteTank(device.deviceId);
                              await loadInventory();
                            } catch (err) {
                              alert(err.message || 'Failed to delete device.');
                            } finally {
                              setBusy(false);
                            }
                          }}
                        >
                          Delete
                        </button>
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
