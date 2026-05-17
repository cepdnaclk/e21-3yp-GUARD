import { io } from 'socket.io-client';

let socket = null;

export function connectSocket() {
  if (socket) return socket;
  const socketUrl = import.meta.env.VITE_API_URL || '';
  socket = io(socketUrl, { transports: ['websocket', 'polling'] });
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
