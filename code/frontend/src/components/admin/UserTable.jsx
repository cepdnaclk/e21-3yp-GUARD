import { useState } from 'react';

/**
 * Renders the list of USER-role accounts with inline actions.
 *
 * @param {{ users: Array, allTanks: Array, onAssignTanks: (user, tankIds) => void, onUnassign: (user, tankId) => void, onDelete: (user) => void, busy: boolean }} props
 */
export default function UserTable({ users, allTanks = [], onAssignTanks, onUnassign, onDelete, busy }) {
  const [openDropdownUserId, setOpenDropdownUserId] = useState(null);
  const [assigningUserId, setAssigningUserId] = useState(null);
  const [selectedTankIds, setSelectedTankIds] = useState([]);

  if (users.length === 0) {
    return <div className="empty-state"><p>No users created yet. Add a user to get started.</p></div>;
  }

  const toggleDropdown = (userId) => {
    setOpenDropdownUserId((prev) => (prev === userId ? null : userId));
    setAssigningUserId(null); // Close the assign view if open
  };

  return (
    <div className="table-wrap card" style={{ overflow: 'visible' }}>
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
              <td>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span>{Array.isArray(user.assignedTankIds) ? user.assignedTankIds.length : 0}</span>
                  {Array.isArray(user.assignedTankIds) && user.assignedTankIds.length > 0 && (
                    <button
                      type="button"
                      onClick={() => toggleDropdown(user.id)}
                      style={{
                        border: 'none',
                        background: 'transparent',
                        cursor: 'pointer',
                        padding: '0.2rem',
                        fontSize: '0.8rem',
                        color: 'var(--c-0b3658)',
                        display: 'inline-flex',
                        alignItems: 'center'
                      }}
                      title="View assigned tanks"
                    >
                      {openDropdownUserId === user.id ? '▲' : '▼'}
                    </button>
                  )}
                </div>

                {openDropdownUserId === user.id && Array.isArray(user.assignedTankIds) && (
                  <div style={{
                    marginTop: '0.5rem',
                    minWidth: '220px',
                    backgroundColor: 'var(--surface)',
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                    boxShadow: '0 4px 12px rgba(9, 40, 70, 0.15)',
                    padding: '0.5rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.35rem'
                  }}>
                    {user.assignedTankIds.map((id) => {
                      const tank = allTanks.find((t) => t.id === id);
                      if (!tank) return null;
                      return (
                        <div
                          key={tank.id}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '0.25rem 0.5rem',
                            borderRadius: '4px',
                            backgroundColor: 'var(--bg)',
                            color: 'var(--text)',
                            fontSize: '0.85rem'
                          }}
                        >
                          <span style={{ 
                            fontWeight: '500', 
                            whiteSpace: 'nowrap', 
                            overflow: 'hidden', 
                            textOverflow: 'ellipsis', 
                            marginRight: '0.5rem' 
                          }}>
                            {tank.deviceName || tank.deviceId}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              onUnassign(user, tank.deviceId);
                              setOpenDropdownUserId(null);
                            }}
                            disabled={busy}
                            style={{
                              border: 'none',
                              background: 'transparent',
                              color: '#ef4444',
                              cursor: 'pointer',
                              fontWeight: 'bold',
                              fontSize: '1rem',
                              lineHeight: 1,
                              padding: '0 2px'
                            }}
                            title={`Remove ${tank.deviceName || tank.deviceId}`}
                          >
                            &times;
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </td>
              <td>
                <div className="users-row-actions" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.5rem' }}>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button
                      type="button"
                      className="btn btn-outline btn-sm"
                      onClick={() => {
                        setAssigningUserId((prev) => (prev === user.id ? null : user.id));
                        setSelectedTankIds([]);
                        setOpenDropdownUserId(null); // Close the view dropdown if open
                      }}
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

                  {assigningUserId === user.id && (() => {
                    const available = allTanks.filter(t => !(user.assignedTankIds || []).includes(t.id));
                    return (
                      <div style={{
                        marginTop: '0.5rem',
                        minWidth: '220px',
                        backgroundColor: 'var(--surface)',
                        border: '1px solid var(--border)',
                        borderRadius: '8px',
                        boxShadow: '0 4px 12px rgba(9, 40, 70, 0.15)',
                        padding: '0.5rem',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.35rem',
                        textAlign: 'left',
                        alignSelf: 'stretch'
                      }}>
                        <strong style={{ fontSize: '0.85rem', color: 'var(--primary)', marginBottom: '0.25rem', display: 'block' }}>
                          Assign Tanks:
                        </strong>
                        {available.length === 0 ? (
                          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>No available tanks.</span>
                        ) : (
                          available.map(tank => (
                            <label key={tank.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: '0.15rem 0', cursor: 'pointer', fontSize: '0.85rem', color: 'var(--text)' }}>
                              <input
                                type="checkbox"
                                checked={selectedTankIds.includes(tank.deviceId)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedTankIds([...selectedTankIds, tank.deviceId]);
                                  } else {
                                    setSelectedTankIds(selectedTankIds.filter(id => id !== tank.deviceId));
                                  }
                                }}
                              />
                              {tank.deviceName || tank.deviceId}
                            </label>
                          ))
                        )}
                        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem', justifyContent: 'flex-end' }}>
                          {available.length > 0 && (
                            <button
                              type="button"
                              className="btn btn-primary btn-sm"
                              disabled={selectedTankIds.length === 0 || busy}
                              onClick={async () => {
                                await onAssignTanks(user, selectedTankIds);
                                setAssigningUserId(null);
                                setSelectedTankIds([]);
                              }}
                              style={{ padding: '0.2rem 0.6rem', fontSize: '0.75rem' }}
                            >
                              Confirm
                            </button>
                          )}
                          <button
                            type="button"
                            className="btn btn-outline btn-sm"
                            onClick={() => {
                              setAssigningUserId(null);
                              setSelectedTankIds([]);
                            }}
                            style={{ padding: '0.2rem 0.6rem', fontSize: '0.75rem' }}
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}



