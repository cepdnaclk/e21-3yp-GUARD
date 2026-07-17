import { io } from 'socket.io-client';

let socket = null;

export function connectSocket() {
  if (socket) return socket;
  const socketUrl = process.env.EXPO_PUBLIC_API_URL || 'http://192.168.1.100:5000';
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
