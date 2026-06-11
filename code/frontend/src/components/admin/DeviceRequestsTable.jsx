/**
 * Renders the device ordering requests queue for SUPER_ADMIN.
 *
 * @param {{ requests: Array, onResolve: (id) => void, busy: boolean }} props
 */
export default function DeviceRequestsTable({ requests, onResolve, busy }) {
  if (requests.length === 0) {
    return (
      <div className="empty-state">
        <p>No device requests in the queue.</p>
      </div>
    );
  }

  return (
    <div className="table-wrap card">
      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Email</th>
            <th>Contact No</th>
            <th>Devices</th>
            <th>Notes</th>
            <th>Submitted</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {requests.map((r) => (
            <tr key={r.id}>
              <td><strong>{r.name}</strong></td>
              <td><a href={`mailto:${r.email}`} style={{ color: 'var(--primary)' }}>{r.email}</a></td>
              <td>{r.contactNo}</td>
              <td style={{ fontWeight: 'bold' }}>{r.numberOfDevices}</td>
              <td style={{ maxWidth: '250px', whiteSpace: 'normal', wordBreak: 'break-word' }}>
                {r.notes || <span style={{ color: 'var(--text-muted)' }}>—</span>}
              </td>
              <td>{new Date(r.createdAt).toLocaleString()}</td>
              <td>
                <button
                  type="button"
                  className="btn btn-outline btn-sm btn-success"
                  onClick={() => onResolve(r.id)}
                  disabled={busy}
                  style={{ whiteSpace: 'nowrap' }}
                >
                  Resolve
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
