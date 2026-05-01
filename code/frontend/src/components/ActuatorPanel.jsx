import { useState } from 'react';
import { deviceApi } from '../services/api';
import '../styles/actuators.css';

export default function ActuatorPanel({ tankId }) {
    const [loading, setLoading] = useState(null);
    const [status, setStatus] = useState({ type: '', message: '' });
    const [lastAction, setLastAction] = useState(null);

    const handleCommand = async (command) => {
        setLoading(command);
        setStatus({ type: '', message: '' });
        try {
            await deviceApi.actuate(tankId, command);
            setLastAction({ command, time: new Date() });
            setStatus({ 
                type: 'success', 
                message: `${command.replace('_', ' ').toUpperCase()} sent.` 
            });
            
            // Clear success message after 3 seconds
            setTimeout(() => setStatus({ type: '', message: '' }), 3000);
        } catch (err) {
            setStatus({ type: 'error', message: err.message || 'Failed to send command.' });
        } finally {
            setLoading(null);
        }
    };

    return (
        <div className="card actuator-card">
            <div className="card-header" style={{ paddingBottom: '0.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3>Control Systems</h3>
                {lastAction && (
                    <span style={{ fontSize: '0.7rem', color: '#718096' }}>
                        Last: {lastAction.command.replace('_', ' ')} @ {lastAction.time.toLocaleTimeString()}
                    </span>
                )}
            </div>
            
            <div className="actuator-grid">
                {/* Feeding System */}
                <div className="actuator-control-box">
                    <h4>Feeding</h4>
                    <button 
                        className={`btn btn-primary actuator-btn ${loading === 'feed' ? 'loading' : ''}`}
                        onClick={() => handleCommand('feed')}
                        disabled={loading !== null}
                    >
                        {loading === 'feed' ? '...' : 'Feed'}
                    </button>
                </div>

                {/* Water Pump System */}
                <div className="actuator-control-box">
                    <h4>Pumps</h4>
                    <div className="pump-controls">
                        <button 
                            className={`btn btn-success actuator-btn ${loading === 'pump_on' ? 'loading' : ''}`}
                            onClick={() => handleCommand('pump_on')}
                            disabled={loading !== null}
                        >
                            {loading === 'pump_on' ? '...' : 'ON'}
                        </button>
                        <button 
                            className={`btn btn-danger actuator-btn ${loading === 'pump_off' ? 'loading' : ''}`}
                            onClick={() => handleCommand('pump_off')}
                            disabled={loading !== null}
                        >
                            {loading === 'pump_off' ? '...' : 'OFF'}
                        </button>
                    </div>
                </div>
            </div>

            {status.message && (
                <div className={`status-alert ${status.type}`}>
                    {status.message}
                </div>
            )}
        </div>
    );
}
