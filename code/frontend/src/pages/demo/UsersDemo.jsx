import { useState } from 'react';
import { useDemo } from '../../context/DemoContext';
import { useAuth } from '../../context/AuthContext';
// devices.css + users.css migrated to Tailwind below (same as production Users.jsx)

export default function UsersDemo() {
  const { demoUsers, demoDevices } = useDemo();
  const { role } = useAuth();
  const canCreateUser = role === 'ADMIN';
  const [showAddUser, setShowAddUser] = useState(false);

  return (
    <div>
      <div className="mb-4">
        <h3>Users ({demoUsers.length})</h3>
      </div>

      {/* Action bar */}
      <div className="bg-white/60 dark:bg-slate-800/40 backdrop-blur-md border border-white/40 dark:border-white/10 shadow-xl rounded-2xl p-6 mb-5">
        <div className="flex flex-wrap gap-3">
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
        <div className="bg-white/60 dark:bg-slate-800/40 backdrop-blur-md border border-white/40 dark:border-white/10 shadow-xl rounded-2xl p-6 mb-4">
          <h3 className="mt-0 mb-4 font-bold text-text-main dark:text-slate-100">Create Worker Account</h3>
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
            <button type="submit" className="btn btn-primary" disabled>Create</button>
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
