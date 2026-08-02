import { useState } from 'react';
import { deviceApi } from '../services/api';

export default function ActuatorPanel({ tankId }) {
    const [loading, setLoading] = useState(null);
    const [status, setStatus] = useState({ type: '', message: '' });
    const [lastAction, setLastAction] = useState(null);
    const [activePumpMode, setActivePumpMode] = useState(() => {
        return localStorage.getItem(`guard_pump_mode_${tankId}`) || 'pump_auto';
    });
    const [lastFeedTime, setLastFeedTime] = useState(() => {
        return localStorage.getItem(`guard_last_feed_${tankId}`) || null;
    });

    const handleCommand = async (command) => {
        setLoading(command);
        setStatus({ type: '', message: '' });
        try {
            await deviceApi.actuate(tankId, command);
            const now = new Date();
            setLastAction({ command, time: now });
            
            if (command === 'feed') {
                const formattedTime = now.toLocaleString(undefined, {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                });
                setLastFeedTime(formattedTime);
                localStorage.setItem(`guard_last_feed_${tankId}`, formattedTime);
            }

            if (['pump_on', 'pump_off', 'pump_auto'].includes(command)) {
                setActivePumpMode(command);
                localStorage.setItem(`guard_pump_mode_${tankId}`, command);
            }

            setStatus({
                type: 'success',
                message: `${command.replace('_', ' ').toUpperCase()} sent successfully.`
            });
            setTimeout(() => setStatus({ type: '', message: '' }), 3500);
        } catch (err) {
            setStatus({ type: 'error', message: err.message || 'Failed to send command.' });
        } finally {
            setLoading(null);
        }
    };

    return (
        <div className="bg-white/60 dark:bg-slate-800/40 backdrop-blur-md border border-white/40 dark:border-white/10 shadow-xl rounded-2xl p-6">
            {/* Header */}
            <div className="flex flex-wrap justify-between items-center mb-4 pb-3 border-b border-white/20 dark:border-white/10 gap-2">
                <h3 className="text-base font-bold text-text-main dark:text-slate-100">Control Systems</h3>
                {lastAction && (
                    <span className="text-[0.75rem] text-text-muted dark:text-slate-400 bg-slate-100 dark:bg-slate-800/60 px-2.5 py-1 rounded-md border border-slate-200 dark:border-slate-700">
                        Last command: <strong className="uppercase text-sky-600 dark:text-sky-400">{lastAction.command.replace('_', ' ')}</strong> @ {lastAction.time.toLocaleTimeString()}
                    </span>
                )}
            </div>

            {/* Actuator Grid */}
            <div className="flex flex-wrap gap-4 p-3">
                {/* Feeding System */}
                <div className="bg-white/50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700/60 px-4 py-3 rounded-xl flex flex-wrap items-center gap-4 flex-1 min-w-[280px]">
                    <div className="flex items-center gap-3">
                        <h4 className="m-0 text-text-main dark:text-slate-100 text-sm font-bold whitespace-nowrap">Feeding</h4>
                        <button
                            className={`px-3 py-1.5 font-bold tracking-wide uppercase text-[0.7rem] rounded-lg bg-primary text-white hover:bg-primary-dark transition-all shadow-sm active:scale-95 disabled:opacity-60 ${loading === 'feed' ? 'opacity-70 animate-pulse' : ''}`}
                            onClick={() => handleCommand('feed')}
                            disabled={loading !== null}
                        >
                            {loading === 'feed' ? 'Feeding...' : 'Feed Now'}
                        </button>
                    </div>
                    
                    {/* Last Feed Date & Time */}
                    <div className="text-xs text-text-muted dark:text-slate-400 flex items-center gap-1.5 ml-auto bg-sky-500/10 dark:bg-sky-500/15 border border-sky-400/20 px-3 py-1.5 rounded-lg">
                        <span className="font-semibold text-slate-700 dark:text-slate-300">Last Feed at:</span>
                        {lastFeedTime ? (
                            <span className="text-sky-600 dark:text-sky-300 font-bold">{lastFeedTime}</span>
                        ) : (
                            <span className="italic text-slate-400 dark:text-slate-500">Not fed yet</span>
                        )}
                    </div>
                </div>

                {/* Water Pump System */}
                <div className="bg-white/50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700/60 px-4 py-3 rounded-xl flex items-center justify-between gap-4 flex-1 min-w-[280px]">
                    <h4 className="m-0 text-text-main dark:text-slate-100 text-sm font-bold whitespace-nowrap">Pumps</h4>
                    <div className="flex gap-1.5">
                        {/* PUMP ON */}
                        <button
                            className={`px-3 py-1.5 font-bold tracking-wide uppercase text-[0.68rem] min-w-[54px] rounded-lg text-white transition-all disabled:opacity-60 ${
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
                            className={`px-3 py-1.5 font-bold tracking-wide uppercase text-[0.68rem] min-w-[54px] rounded-lg text-white transition-all disabled:opacity-60 ${
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
                            className={`px-3 py-1.5 font-bold tracking-wide uppercase text-[0.68rem] min-w-[54px] rounded-lg text-white transition-all disabled:opacity-60 ${
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

            {/* Status Alert Message */}
            {status.message && (
                <div
                    className={[
                        'mt-3 py-2.5 px-4 rounded-xl text-xs font-semibold text-center transition-all',
                        status.type === 'success'
                            ? 'bg-green-500/15 text-green-600 dark:text-green-400 border border-green-500/25'
                            : 'bg-red-500/15 text-red-600 dark:text-red-400 border border-red-500/25',
                    ].join(' ')}
                >
                    {status.message}
                </div>
            )}
        </div>
    );
}
