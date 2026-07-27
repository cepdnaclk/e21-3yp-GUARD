import { useState } from 'react';
import { useDemo } from '../../context/DemoContext';
import { useAuth } from '../../context/AuthContext';
import '../../styles/devices.css';
import '../../styles/users.css';

export default function UsersDemo() {
  const { demoUsers, demoDevices } = useDemo();
  const { role } = useAuth();
  const canCreateUser = role === 'ADMIN';

  const [showAddUser, setShowAddUser] = useState(false);

  return (
    <div>
      <div className="users-header devices-header">
        <h3>Users ({demoUsers.length})</h3>
      </div>

      {/* Action bar */}
      <div className="card users-actions-card">
        <div className="devices-actions">
          {canCreateUser && (
            <button
              id="add-user-btn"
              type="button"
              className="btn action-btn"
              onClick={() => setShowAddUser(true)}
              title="Create USER account"
            >
              Add User
            </button>
          )}
          {showAddUser && (
            <button type="button" className="btn btn-primary" onClick={() => setShowAddUser(false)}>
              Cancel
            </button>
          )}
        </div>
      </div>

      {/* Demo add-user form */}
      {showAddUser && canCreateUser && (
        <div className="card devices-form-card">
          <h3 className="devices-form-title">Create Worker Account</h3>
          <p style={{ fontSize: '0.85rem', opacity: 0.7, marginBottom: 10 }}>
            🎭 Demo mode — form is read-only.
          </p>
          <form onSubmit={(e) => e.preventDefault()} className="devices-form">
            <div className="form-group">
              <label>Full Name</label>
              <input className="form-input" type="text" readOnly defaultValue="New Worker" />
            </div>
            <div className="form-group">
              <label>Username</label>
              <input className="form-input" type="text" readOnly defaultValue="new_worker" />
            </div>
            <div className="form-group">
              <label>Email</label>
              <input className="form-input" type="email" readOnly defaultValue="worker@guard.local" />
            </div>
            <button type="submit" className="btn btn-primary devices-form-submit" disabled>Create</button>
          </form>
        </div>
      )}

      {/* User table */}
      <div className="table-wrap card" id="user-table">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Username</th>
              <th>Email</th>
              <th>Assigned Tanks</th>
              <th>Joined</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {demoUsers.map((u) => (
              <tr key={u.id}>
                <td><strong>{u.fullName}</strong></td>
                <td>{u.username}</td>
                <td>{u.email}</td>
                <td>
                  {u.assignedTanks?.length > 0
                    ? u.assignedTanks.join(', ')
                    : <span style={{ opacity: 0.5 }}>None</span>}
                </td>
                <td>{new Date(u.createdAt).toLocaleDateString()}</td>
                <td>
                  <button className="btn btn-outline btn-sm" disabled title="Demo mode">
                    Assign Tanks
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
