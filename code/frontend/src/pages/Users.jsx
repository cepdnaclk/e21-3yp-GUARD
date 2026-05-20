import { useEffect, useState } from 'react';
import { authApi, deviceApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
import CreateAccountForm from '../components/admin/CreateAccountForm';
import AddDeviceForm from '../components/admin/AddDeviceForm';
import AssignTankForm from '../components/admin/AssignTankForm';
import UserTable from '../components/admin/UserTable';
import AdminTable from '../components/admin/AdminTable';
import DeviceInventoryTable from '../components/admin/DeviceInventoryTable';
import '../styles/devices.css';
import '../styles/profile.css';
import '../styles/users.css';

export default function Users() {
  const { role } = useAuth();

  // Panel visibility
  const [mode, setMode] = useState('');           // '' | 'admin' | 'user'
  const [showAssign, setShowAssign] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [showDevice, setShowDevice] = useState(false);
  const [assignTarget, setAssignTarget] = useState(null);
  const [deleteForm, setDeleteForm] = useState({ userId: '', userName: '' });

  // Data
  const [users, setUsers] = useState([]);
  const [admins, setAdmins] = useState([]);
  const [inventory, setInventory] = useState([]);

  // Loading / feedback
  const [loading, setLoading] = useState(true);
  const [adminLoading, setAdminLoading] = useState(false);
  const [inventoryLoading, setInventoryLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [success, setSuccess] = useState('');
  const [listError, setListError] = useState('');
  const [adminListError, setAdminListError] = useState('');
  const [deleteError, setDeleteError] = useState('');

  // Permissions
  const canCreateAdmin = role === 'SUPER_ADMIN';
  const canCreateUser = role === 'ADMIN';
  const canViewUsers = role === 'ADMIN';
  const canManageUsers = role === 'ADMIN';
  const canViewAdmins = role === 'SUPER_ADMIN';
  const canAddDevice = role === 'SUPER_ADMIN';
  const canViewInventory = role === 'SUPER_ADMIN';

  // ---------- Data loaders ----------

  const loadUsers = async () => {
    if (!canViewUsers) { setUsers([]); setLoading(false); return; }
    setLoading(true);
    setListError('');
    try {
      const data = await authApi.getUsersByAdmin();
      setUsers(Array.isArray(data) ? data : []);
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

  // ---------- Panel helpers ----------

  const closeAll = () => {
    setMode('');
    setShowAssign(false);
    setShowDelete(false);
    setShowDevice(false);
    setAssignTarget(null);
    setDeleteForm({ userId: '', userName: '' });
    setSuccess('');
    setDeleteError('');
  };

  const anyPanelOpen = mode || showAssign || showDelete || showDevice;

  // ---------- Handlers ----------

  const handleDeleteAdmin = async (adminId, adminName) => {
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

  const handleDeleteUser = async (e) => {
    e.preventDefault();
    if (!canManageUsers) { setDeleteError('Only ADMIN can delete users.'); return; }
    const { userId, userName } = deleteForm;
    if (!userId.trim() || !userName.trim()) { setDeleteError('User ID and User Name are required.'); return; }
    if (!window.confirm(`Are you sure you want to permanently delete user ${userId} (${userName})?`)) return;

    setBusy(true);
    setDeleteError('');
    setSuccess('');
    try {
      await authApi.deleteUserByAdmin(userId);
      setDeleteForm({ userId: '', userName: '' });
      setShowDelete(false);
      await loadUsers();
    } catch (err) {
      setDeleteError(err.message || 'Failed to delete user.');
    } finally {
      setBusy(false);
    }
  };

  // ---------- Render ----------

  if (loading) return <div className="empty-state"><p>Loading users...</p></div>;

  return (
    <div>
      <div className="users-header devices-header">
        <h3>Users{canViewUsers ? ` (${users.length})` : ''}</h3>
      </div>

      {/* Action Bar */}
      <div className="card users-actions-card">
        <div className="devices-actions">
          <button
            type="button" className="btn action-btn"
            onClick={() => { closeAll(); setMode('admin'); }}
            disabled={!canCreateAdmin || busy}
            title={canCreateAdmin ? 'Create ADMIN account' : 'Only SUPER_ADMIN can create admins'}
          >Add Admin</button>

          {canCreateUser && (
            <button
              type="button" className="btn action-btn"
              onClick={() => { closeAll(); setMode('user'); }}
              disabled={busy}
              title="Create USER account"
            >Add User</button>
          )}

          {canAddDevice && (
            <button
              type="button" className="btn action-btn"
              onClick={() => { closeAll(); setShowDevice(true); }}
              disabled={busy}
              title="Add a new device to the inventory"
            >Add Device</button>
          )}

          {anyPanelOpen && (
            <button type="button" className="btn btn-primary" onClick={closeAll}>Cancel</button>
          )}
        </div>
      </div>

      {success && <p className="profile-success-msg" style={{ marginBottom: '1rem' }}>{success}</p>}

      {/* Create Admin / User */}
      {mode && (
        <CreateAccountForm
          mode={mode}
          onSuccess={(msg) => { setSuccess(msg); setMode(''); loadUsers(); }}
          onCancel={() => { setMode(''); }}
        />
      )}

      {/* Add Device (SUPER_ADMIN) */}
      {showDevice && canAddDevice && (
        <AddDeviceForm
          onSuccess={() => loadInventory()}
          onCancel={() => setShowDevice(false)}
        />
      )}

      {/* Assign Tank */}
      {showAssign && canManageUsers && assignTarget && (
        <AssignTankForm
          targetUser={assignTarget}
          onSuccess={(msg) => { setSuccess(msg); setShowAssign(false); setAssignTarget(null); loadUsers(); }}
          onCancel={() => { setShowAssign(false); setAssignTarget(null); }}
        />
      )}

      {/* Delete User */}
      {showDelete && canManageUsers && (
        <div className="card devices-form-card">
          <h3 className="devices-form-title">Delete User</h3>
          {deleteError && <p className="error-msg">{deleteError}</p>}
          <form onSubmit={handleDeleteUser} className="devices-form">
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

      {/* User List */}
      {canViewUsers ? (
        listError ? (
          <div className="empty-state"><p className="error-msg">{listError}</p></div>
        ) : (
          <UserTable
            users={users}
            busy={busy}
            onAssign={(user) => {
              closeAll();
              setAssignTarget(user);
              setShowAssign(true);
            }}
            onDelete={(user) => {
              closeAll();
              setDeleteForm({ userId: user.id, userName: user.fullName || user.username });
              setShowDelete(true);
            }}
          />
        )
      ) : (
        <div className="empty-state"><p>The user list is available to ADMIN accounts.</p></div>
      )}

      {/* Admin List (SUPER_ADMIN) */}
      {canViewAdmins && (
        <div className="users-section">
          <div className="users-header devices-header">
            <h3>Admins ({admins.length})</h3>
          </div>
          <AdminTable
            admins={admins}
            onDelete={handleDeleteAdmin}
            busy={busy}
            loading={adminLoading}
            error={adminListError}
          />
        </div>
      )}

      {/* Device Inventory (SUPER_ADMIN) */}
      {canViewInventory && (
        <div className="users-section">
          <div className="users-header devices-header">
            <h3>Device Inventory ({inventory.length})</h3>
          </div>
          <DeviceInventoryTable
            inventory={inventory}
            loading={inventoryLoading}
            onRefresh={loadInventory}
          />
        </div>
      )}
    </div>
  );
}
