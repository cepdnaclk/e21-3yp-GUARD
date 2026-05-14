/**
 * Renders the list of USER-role accounts with inline actions.
 *
 * @param {{ users: Array, onAssign: (user) => void, onDelete: (user) => void, busy: boolean }} props
 */
export default function UserTable({ users, onAssign, onDelete, busy }) {
  if (users.length === 0) {
    return <div className="empty-state"><p>No users created yet. Add a user to get started.</p></div>;
  }

  return (
    <div className="table-wrap card">
      <table>
        <thead>
          <tr>
            <th>Username</th><th>Full Name</th><th>Email</th><th>Role</th>
            <th>Created</th><th>Assigned Tanks</th><th></th>
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
                    onClick={() => onAssign(user)}
                    disabled={busy}
                    title="Assign a tank to this user"
                  >
                    Assign Tank
                  </button>
                  <button
                    type="button"
                    className="btn btn-outline btn-sm btn-danger"
                    onClick={() => onDelete(user)}
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
  );
}
