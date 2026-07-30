import { useDemo } from '../../context/DemoContext';
// alerts.css migrated to Tailwind below (same classes as production Alerts.jsx)

const CHIP_BASE = 'inline-block px-[0.65rem] py-[0.22rem] rounded-full text-xs font-bold tracking-[0.02em]';
const CHIP_UNRESOLVED = `${CHIP_BASE} bg-red-800/10 dark:bg-red-400/12 text-red-700 dark:text-red-300 border border-red-800/20 dark:border-red-400/25`;
const CHIP_RESOLVED   = `${CHIP_BASE} bg-green-800/8 dark:bg-green-400/10 text-green-700 dark:text-green-400 border border-green-800/20 dark:border-green-400/20`;

export default function AlertsDemo() {
  const { demoAlerts, demoDevices } = useDemo();

  return (
    <div className="min-h-[calc(100vh-62px)] -mx-7 px-7 py-7 bg-transparent" id="alerts-page">

      {/* Filter Card */}
      <div className="bg-white/60 dark:bg-slate-800/40 backdrop-blur-md border border-white/40 dark:border-white/10 shadow-xl rounded-2xl p-6 mb-6">
        <div className="flex flex-wrap gap-4 items-end">
          <div className="flex flex-col gap-1">
            <label className="text-sm font-semibold text-[#204968] dark:text-slate-400">Device</label>
            <select className="bg-white/40 dark:bg-white/[0.05] backdrop-blur-sm border-[1.5px] border-white/20 dark:border-white/10 rounded-[10px] text-text-main dark:text-[#e6edf3] px-[0.9rem] py-[0.65rem] text-[0.95rem]" defaultValue="">
              <option value="">All devices</option>
              {demoDevices.map(d => (
                <option key={d.deviceId} value={d.deviceId}>{d.deviceId} — {d.deviceName || 'Unnamed'}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-semibold text-[#204968] dark:text-slate-400">Status</label>
            <select className="bg-white/40 dark:bg-white/[0.05] backdrop-blur-sm border-[1.5px] border-white/20 dark:border-white/10 rounded-[10px] text-text-main dark:text-[#e6edf3] px-[0.9rem] py-[0.65rem] text-[0.95rem]" defaultValue="false">
              <option value="all">All</option>
              <option value="false">Active</option>
              <option value="true">Resolved</option>
            </select>
          </div>

          {/* Alert preferences (read-only in demo) */}
          <div className="flex gap-3 ml-auto items-end">
            <div className="flex flex-col gap-1">
              <label className="text-sm font-semibold text-[#204968] dark:text-slate-400">📧 Email Alerts</label>
              <button type="button" className="h-[38px] min-w-[100px] px-4 py-[0.6rem] rounded-lg font-bold inline-flex items-center justify-center bg-gradient-to-br from-success to-green-700 text-white opacity-70 cursor-not-allowed" disabled>
                Enabled
              </button>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm font-semibold text-[#204968] dark:text-slate-400">🤖 Telegram Alerts</label>
              <button type="button" className="h-[38px] min-w-[100px] px-4 py-[0.6rem] rounded-lg font-bold inline-flex items-center justify-center bg-gradient-to-br from-success to-green-700 text-white opacity-70 cursor-not-allowed" disabled>
                Enabled
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Table Card */}
      <div className="bg-white/60 dark:bg-slate-800/40 backdrop-blur-md border border-white/40 dark:border-white/10 shadow-xl rounded-2xl overflow-hidden">
        <div className="overflow-x-auto rounded-xl border border-white/20 dark:border-white/[0.06]">
          <table className="w-full border-collapse">
            <thead className="bg-sky-400/6 dark:bg-white/[0.04]">
              <tr>
                {['Type', 'Message', 'Value', 'Device', 'Time', 'Status', ''].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-text-muted dark:text-slate-400 text-[0.78rem] uppercase tracking-[0.6px] font-bold border-b border-white/10">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {demoAlerts.map((a) => (
                <tr key={a.id} className="border-b border-white/10 dark:border-white/[0.05] hover:bg-slate-100/50 dark:hover:bg-slate-700/30 transition-colors">
                  <td className="px-4 py-3">
                    <span className={a.resolved ? CHIP_RESOLVED : CHIP_UNRESOLVED}>{a.type}</span>
                  </td>
                  <td className="px-4 py-3 text-text-main dark:text-[#e6edf3] text-sm">{a.message}</td>
                  <td className="px-4 py-3 text-text-main dark:text-[#e6edf3] text-sm font-mono">{a.value}</td>
                  <td className="px-4 py-3 text-text-main dark:text-[#e6edf3] text-sm">
                    {a.tankId} {a.tank?.name ? `(${a.tank.name})` : ''}
                  </td>
                  <td className="px-4 py-3 text-text-muted dark:text-slate-400 text-sm whitespace-nowrap">
                    {new Date(a.createdAt).toLocaleString()}
                  </td>
                  <td className="px-4 py-3">
                    <span className={a.resolved ? CHIP_RESOLVED : CHIP_UNRESOLVED}>
                      {a.resolved ? 'Resolved' : 'Active'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {!a.resolved && (
                      <button className="border border-primary/35 bg-primary/12 text-primary dark:text-sky-400 px-[0.85rem] py-[0.35rem] rounded-lg text-[0.78rem] font-bold opacity-50 cursor-not-allowed" disabled>
                        Resolve
                      </button>
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
