import { useAuth } from '../context/AuthContext';

export default function Profile() {
  const { user } = useAuth();

  if (!user) return null;

  const fields = [
    { label: 'Username', value: user.username },
    { label: 'Full Name', value: user.fullName },
    { label: 'Email', value: user.email || '—' },
    { label: 'Phone', value: user.phoneNumber || '—' },
    { label: 'Address', value: user.address || '—' },
    { label: 'Member Since', value: user.createdAt ? new Date(user.createdAt).toLocaleDateString() : '—' },
  ];

  return (
    <>
      <h3 style={{ marginBottom: '1rem' }}>Profile</h3>
      <div className="card" style={{ maxWidth: 500 }}>
        {fields.map((f) => (
          <div key={f.label} style={{ display: 'flex', padding: '0.6rem 0', borderBottom: '1px solid var(--border)' }}>
            <span style={{ width: 140, fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-muted)' }}>{f.label}</span>
            <span style={{ fontSize: '0.9rem' }}>{f.value}</span>
          </div>
        ))}
      </div>
    </>
  );
}
