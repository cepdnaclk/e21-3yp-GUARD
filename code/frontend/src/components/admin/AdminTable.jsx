/**
 * Renders the list of ADMIN accounts (SUPER_ADMIN only view).
 *
 * @param {{ admins: Array, onDelete: (adminId: string, adminName: string) => void, busy: boolean, loading: boolean, error: string }} props
 */
export default function AdminTable({ admins, onDelete, busy, loading, error }) {
  if (loading) return <div className="empty-state"><p>Loading admins...</p></div>;
  if (error) return <div className="empty-state"><p className="error-msg">{error}</p></div>;
  if (admins.length === 0) return <div className="empty-state"><p>No admins found. Use "Add Admin" to create one.</p></div>;

  return (
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
                  <button
                    type="button"
                    className="btn btn-outline btn-sm btn-danger"
                    onClick={() => onDelete(admin.id, admin.fullName || admin.username)}
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
  );
}
