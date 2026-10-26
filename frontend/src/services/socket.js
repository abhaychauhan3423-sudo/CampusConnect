import { io } from 'socket.io-client';
import { TOKEN_KEY } from './api';

let socket = null;

// Determine socket server URL (derive from API URL or fallback to localhost:5000)
function getSocketUrl() {
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
  return apiUrl.replace(/\/api\/?$/, '');
}

/**
 * Initializes and returns a singleton Socket.IO connection.
 * If already connected with the same token, reuses the existing instance.
 */
export function getSocket() {
  const token = localStorage.getItem(TOKEN_KEY);
  if (!token) {
    if (socket) {
      socket.disconnect();
      socket = null;
    }
    return null;
  }

  if (socket && socket.connected) {
    return socket;
  }

  if (!socket) {
    socket = io(getSocketUrl(), {
      auth: { token },
      transports: ['websocket', 'polling'],
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });

    socket.on('connect', () => {
      // Socket connected
    });

    socket.on('connect_error', (err) => {
      console.warn('Socket connection error:', err.message);
      if (err.message.includes('Authentication') || err.message.includes('token')) {
        window.dispatchEvent(new Event('auth:logout'));
      }
    });

    // Cleanup socket on logout event
    window.addEventListener('auth:logout', disconnectSocket);
  } else if (!socket.connected) {
    socket.auth = { token };
    socket.connect();
  }

  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
