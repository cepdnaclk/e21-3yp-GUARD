import { io } from 'socket.io-client';

let socket = null;

export function connectSocket() {
  if (socket) return socket;
  const socketUrl = import.meta.env.VITE_API_URL || '';

  socket = io(socketUrl, {
    transports: ['websocket', 'polling'],
    withCredentials: true,   // Send the HttpOnly cookie on WebSocket upgrade
    // The server's Socket.IO auth middleware reads the token from the cookie header.
    // No explicit auth.token needed here since withCredentials handles it.
  });

  socket.on('connect_error', (err) => {
    if (err.message === 'Authentication required' || err.message === 'Invalid or expired token') {
      console.warn('🔌 Socket auth failed — user may have been logged out.');
      socket?.disconnect();
      socket = null;
    }
  });

  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

export function getSocket() {
  return socket;
}
