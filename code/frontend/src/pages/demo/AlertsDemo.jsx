import { useDemo } from '../../context/DemoContext';
import '../../styles/alerts.css';

export default function AlertsDemo() {
  const { demoAlerts, demoDevices } = useDemo();

  return (
    <div className="alerts-page" id="alerts-page">
      <h3 className="alerts-title">Notifications</h3>

      <div className="card alerts-filter-card">
        <div className="filters">
          <div className="form-group">
            <label>Device</label>
            <select className="form-input" defaultValue="">
              <option value="">All devices</option>
              {demoDevices.map(d => (
                <option key={d.deviceId} value={d.deviceId}>
                  {d.deviceId} — {d.deviceName || 'Unnamed'}
                </option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>Status</label>
            <select className="form-input" defaultValue="false">
              <option value="all">All</option>
              <option value="false">Active</option>
              <option value="true">Resolved</option>
            </select>
          </div>

          {/* Alert preferences (read-only in demo) */}
          <div className="alerts-preferences-inline">
            <div className="form-group">
              <label>📧 Email Alerts</label>
              <button type="button" className="pref-toggle-btn enabled" disabled>Enabled</button>
            </div>
            <div className="form-group">
              <label>🤖 Telegram Alerts</label>
              <button type="button" className="pref-toggle-btn enabled" disabled>Enabled</button>
            </div>
          </div>
        </div>
      </div>

      <div className="card alerts-table-card">
        <div className="table-wrap alerts-table-wrap">
          <table className="alerts-table">
            <thead>
              <tr>
                <th>Type</th>
                <th>Message</th>
                <th>Value</th>
                <th>Device</th>
                <th>Time</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {demoAlerts.map((a) => (
                <tr key={a.id}>
                  <td>
                    <span className={`alert-type-chip ${a.resolved ? 'resolved' : 'unresolved'}`}>
                      {a.type}
                    </span>
                  </td>
                  <td>{a.message}</td>
                  <td>{a.value}</td>
                  <td>{a.tankId} {a.tank?.name ? `(${a.tank.name})` : ''}</td>
                  <td>{new Date(a.createdAt).toLocaleString()}</td>
                  <td>
                    {a.resolved
                      ? <span className="alert-status-chip resolved">Resolved</span>
                      : <span className="alert-status-chip active">Active</span>}
                  </td>
                  <td>
                    {!a.resolved && (
                      <button className="alerts-resolve-btn" disabled>Resolve</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
