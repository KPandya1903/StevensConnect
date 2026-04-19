/**
 * useSocket — singleton Socket.io connection.
 *
 * Creates the socket once when the user is authenticated and disposes it on logout.
 * Components use this hook to get the socket instance and subscribe to events.
 */

import { useEffect, useRef } from 'react';
import { io, type Socket } from 'socket.io-client';
import { useAuthStore } from '../store/authStore';

let _socket: Socket | null = null;

function getSocket(token: string): Socket {
  if (_socket && _socket.connected) return _socket;
  if (_socket) {
    _socket.disconnect();
  }
  _socket = io(window.location.origin, {
    auth: { token },
    transports: ['websocket'],
    autoConnect: true,
  });
  return _socket;
}

export function useSocket(): Socket | null {
  const accessToken = useAuthStore((s) => s.accessToken);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!accessToken) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        _socket = null;
        socketRef.current = null;
      }
      return;
    }

    const socket = getSocket(accessToken);
    socketRef.current = socket;

    return () => {
      // Don't disconnect on unmount — the singleton lives as long as the user is logged in
    };
  }, [accessToken]);

  return socketRef.current;
}
