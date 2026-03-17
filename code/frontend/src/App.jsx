import { useState, useEffect } from 'react'
import io from 'socket.io-client'
import axios from 'axios'
import './App.css'

const API_BASE = 'http://localhost:3000'
const SOCKET_URL = 'http://localhost:3000'

function App() {
  const [alerts, setAlerts] = useState([])
  const [devices, setDevices] = useState([])
  const [isConnected, setIsConnected] = useState(false)
  const [backendStatus, setBackendStatus] = useState('connecting...')

  // Check backend health
  useEffect(() => {
    const checkHealth = async () => {
      try {
        const response = await axios.get(`${API_BASE}/health`)
        setBackendStatus('✓ Backend running')
      } catch (err) {
        setBackendStatus('✗ Backend offline')
      }
    }
    checkHealth()
    const interval = setInterval(checkHealth, 5000)
    return () => clearInterval(interval)
  }, [])

  // Connect to WebSocket
  useEffect(() => {
    const socket = io(SOCKET_URL, {
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    })

    socket.on('connect', () => {
      console.log('✓ Connected to G.U.A.R.D WebSocket')
      setIsConnected(true)
    })

    socket.on('disconnect', () => {
      console.log('✗ Disconnected from WebSocket')
      setIsConnected(false)
    })

    socket.on('alert', (data) => {
      console.log('🚨 New alert:', data)
      setAlerts((prev) => [data, ...prev.slice(0, 9)])
    })

    return () => socket.disconnect()
  }, [])

  return (
    <div className="app">
      <header className="app-header">
        <h1>🐠 G.U.A.R.D Dashboard</h1>
        <p>General Unit for Aquatic Risk Detection</p>
      </header>

      <div className="status-bar">
        <div className={`status-item ${backendStatus.includes('✓') ? 'online' : 'offline'}`}>
          {backendStatus}
        </div>
        <div className={`status-item ${isConnected ? 'online' : 'offline'}`}>
          {isConnected ? '✓ WebSocket connected' : '✗ WebSocket disconnected'}
        </div>
      </div>

      <main className="app-content">
        <section className="alerts-section">
          <h2>Recent Alerts ({alerts.length})</h2>
          {alerts.length === 0 ? (
            <p className="empty-state">No alerts yet. All systems normal! ✓</p>
          ) : (
            <div className="alerts-list">
              {alerts.map((alert, idx) => (
                <div key={idx} className={`alert-card alert-${alert.type.toLowerCase()}`}>
                  <div className="alert-header">
                    <strong>{alert.type}</strong>
                    <span className="alert-time">{new Date(alert.createdAt).toLocaleTimeString()}</span>
                  </div>
                  <p className="alert-message">{alert.message}</p>
                  <div className="alert-value">Value: {alert.value}</div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="info-section">
          <h2>System Information</h2>
          <div className="info-grid">
            <div className="info-card">
              <h3>Backend API</h3>
              <p>Base URL: <code>http://localhost:3000</code></p>
              <p>Health: <code>/health</code></p>
            </div>
            <div className="info-card">
              <h3>Database</h3>
              <p>PostgreSQL running on port 5432</p>
              <p>Prisma ORM connected</p>
            </div>
            <div className="info-card">
              <h3>MQTT Broker</h3>
              <p>Mosquitto running on port 1883</p>
              <p>Topic: <code>sensor/+/+</code></p>
            </div>
            <div className="info-card">
              <h3>Frontend</h3>
              <p>React + Vite on port 5173</p>
              <p>socket.io client connected</p>
            </div>
          </div>
        </section>
      </main>

      <footer className="app-footer">
        <p>G.U.A.R.D © 2026 — Team 08 • Real-time Aquaculture Monitoring</p>
      </footer>
    </div>
  )
}

export default App
