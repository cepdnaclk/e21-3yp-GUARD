import { useState } from 'react';
import { deviceApi } from '../services/api';
// actuators.css migrated to Tailwind utility classes below.

export default function ActuatorPanel({ tankId }) {
    const [loading, setLoading] = useState(null);
    const [status, setStatus] = useState({ type: '', message: '' });
    const [lastAction, setLastAction] = useState(null);
    const [activePumpMode, setActivePumpMode] = useState(() => {
        return localStorage.getItem(`guard_pump_mode_${tankId}`) || 'pump_auto';
    });

    const handleCommand = async (command) => {
        setLoading(command);
        setStatus({ type: '', message: '' });
        try {
            await deviceApi.actuate(tankId, command);
            setLastAction({ command, time: new Date() });
            
            if (['pump_on', 'pump_off', 'pump_auto'].includes(command)) {
                setActivePumpMode(command);
                localStorage.setItem(`guard_pump_mode_${tankId}`, command);
            }

            setStatus({
                type: 'success',
                message: `${command.replace('_', ' ').toUpperCase()} sent.`
            });
            setTimeout(() => setStatus({ type: '', message: '' }), 3000);
        } catch (err) {
            setStatus({ type: 'error', message: err.message || 'Failed to send command.' });
        } finally {
            setLoading(null);
        }
    };

    return (
        /*
          .card.actuator-card →
            glass card + mt-6
            bg-white/60 dark:bg-slate-800/40 backdrop-blur-md
            border border-white/40 dark:border-white/10 shadow-xl rounded-2xl p-6
        */
        <div className="bg-white/60 dark:bg-slate-800/40 backdrop-blur-md border border-white/40 dark:border-white/10 shadow-xl rounded-2xl p-6">

            {/* .card-header */}
            <div className="flex justify-between items-center mb-4 pb-3 border-b border-white/20 dark:border-white/10">
                <h3 className="text-base font-bold text-text-main dark:text-slate-100">Control Systems</h3>
                {lastAction && (
                    <span className="text-[0.7rem] text-text-muted dark:text-slate-500">
                        Last: {lastAction.command.replace('_', ' ')} @ {lastAction.time.toLocaleTimeString()}
                    </span>
                )}
            </div>

            {/* .actuator-grid → flex flex-wrap gap-3 p-3 */}
            <div className="flex flex-wrap gap-3 p-3">

                {/* Feeding System — .actuator-control-box */}
                <div className="bg-white/[0.03] border border-white/[0.05] px-3 py-[0.6rem] rounded-lg flex items-center gap-4 transition-all hover:bg-white/[0.06] hover:-translate-y-0.5">
                    <h4 className="m-0 text-text-main dark:text-slate-200 text-sm font-semibold whitespace-nowrap">Feeding</h4>
                    <button
                        className={`px-[0.6rem] py-[0.3rem] font-bold tracking-wide uppercase text-[0.65rem] min-w-[50px] rounded bg-primary text-white hover:bg-primary-dark transition-colors disabled:opacity-60 ${loading === 'feed' ? 'opacity-70' : ''}`}
                        onClick={() => handleCommand('feed')}
                        disabled={loading !== null}
                    >
                        {loading === 'feed' ? '...' : 'Feed'}
                    </button>
                </div>

                {/* Water Pump System — .actuator-control-box */}
                <div className="bg-white/[0.03] border border-white/[0.05] px-3 py-[0.6rem] rounded-lg flex items-center gap-4 transition-all hover:bg-white/[0.06] hover:-translate-y-0.5">
                    <h4 className="m-0 text-text-main dark:text-slate-200 text-sm font-semibold whitespace-nowrap">Pumps</h4>
                    {/* .pump-controls → flex gap-1 */}
                    <div className="flex gap-1">
                        {/* PUMP ON */}
                        <button
                            className={`px-[0.6rem] py-[0.3rem] font-bold tracking-wide uppercase text-[0.65rem] min-w-[50px] rounded text-white transition-all disabled:opacity-60 ${
                                activePumpMode === 'pump_on'
                                    ? 'bg-success ring-2 ring-emerald-400 ring-offset-2 ring-offset-slate-900 shadow-[0_0_12px_rgba(34,197,94,0.7)] scale-105 opacity-100'
                                    : 'bg-emerald-800/40 text-emerald-200/60 border border-emerald-500/20 hover:bg-emerald-700/60 opacity-60'
                            } ${loading === 'pump_on' ? 'animate-pulse' : ''}`}
                            onClick={() => handleCommand('pump_on')}
                            disabled={loading !== null}
                        >
                            {loading === 'pump_on' ? '...' : 'ON'}
                        </button>
                        {/* PUMP OFF */}
                        <button
                            className={`px-[0.6rem] py-[0.3rem] font-bold tracking-wide uppercase text-[0.65rem] min-w-[50px] rounded text-white transition-all disabled:opacity-60 ${
                                activePumpMode === 'pump_off'
                                    ? 'bg-danger ring-2 ring-red-400 ring-offset-2 ring-offset-slate-900 shadow-[0_0_12px_rgba(239,68,68,0.7)] scale-105 opacity-100'
                                    : 'bg-rose-900/40 text-rose-200/60 border border-rose-500/20 hover:bg-rose-800/60 opacity-60'
                            } ${loading === 'pump_off' ? 'animate-pulse' : ''}`}
                            onClick={() => handleCommand('pump_off')}
                            disabled={loading !== null}
                        >
                            {loading === 'pump_off' ? '...' : 'OFF'}
                        </button>
                        {/* PUMP AUTO */}
                        <button
                            className={`px-[0.6rem] py-[0.3rem] font-bold tracking-wide uppercase text-[0.65rem] min-w-[50px] rounded text-white transition-all disabled:opacity-60 ${
                                activePumpMode === 'pump_auto'
                                    ? 'bg-[#17a2b8] ring-2 ring-cyan-300 ring-offset-2 ring-offset-slate-900 shadow-[0_0_12px_rgba(23,162,184,0.7)] scale-105 opacity-100'
                                    : 'bg-cyan-900/40 text-cyan-200/60 border border-cyan-500/20 hover:bg-cyan-800/60 opacity-60'
                            } ${loading === 'pump_auto' ? 'animate-pulse' : ''}`}
                            onClick={() => handleCommand('pump_auto')}
                            disabled={loading !== null}
                        >
                            {loading === 'pump_auto' ? '...' : 'AUTO'}
                        </button>
                    </div>
                </div>
            </div>

            {/* .status-alert → conditional success / error */}
            {status.message && (
                <div
                    className={[
                        'mx-6 mb-6 py-3 px-4 rounded-lg text-sm text-center',
                        status.type === 'success'
                            ? 'bg-green-500/15 text-green-500 dark:text-green-400 border border-green-500/20'
                            : 'bg-red-500/15 text-red-500 dark:text-red-400 border border-red-500/20',
                    ].join(' ')}
                >
                    {status.message}
                </div>
            )}
        </div>
    );
}

