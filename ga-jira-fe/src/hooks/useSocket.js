import { useEffect, useRef, useCallback } from 'react';
import { useSelector } from 'react-redux';
import { io } from 'socket.io-client';
import { selectAccessToken, selectIsAuthenticated, selectUser } from '../store/authSlice';
import { WS_URL, SOCKET_EVENTS } from '../constants';

let socketInstance = null;

export const useSocket = () => {
  const accessToken = useSelector(selectAccessToken);
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const user = useSelector(selectUser);
  const listenersRef = useRef({});
  const userRef = useRef(user);
  useEffect(() => { userRef.current = user; }, [user]);

  const connect = useCallback(() => {
    if (socketInstance?.connected) return socketInstance;
    socketInstance = io(WS_URL, {
      auth: { token: accessToken },
      transports: ['websocket'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
    });

    socketInstance.on('connect', () => {
      console.log('Socket connected:', socketInstance.id);
      if (userRef.current?.id) {
        socketInstance.emit('join:user', userRef.current.id);
      }
    });

    socketInstance.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason);
    });

    socketInstance.on('connect_error', (error) => {
      console.error('Socket connection error:', error.message);
    });

    return socketInstance;
  }, [accessToken]);

  const disconnect = useCallback(() => {
    if (socketInstance) {
      socketInstance.disconnect();
      socketInstance = null;
    }
  }, []);

  const reconnect = useCallback(() => {
    disconnect();
    connect();
  }, [connect, disconnect]);

  const on = useCallback((event, callback) => {
    if (!socketInstance) return;
    socketInstance.on(event, callback);
    if (!listenersRef.current[event]) {
      listenersRef.current[event] = [];
    }
    listenersRef.current[event].push(callback);
    return () => {
      socketInstance?.off(event, callback);
    };
  }, []);

  const off = useCallback((event, callback) => {
    if (!socketInstance) return;
    socketInstance.off(event, callback);
  }, []);

  const emit = useCallback((event, data) => {
    if (!socketInstance?.connected) return;
    socketInstance.emit(event, data);
  }, []);

  const joinRoom = useCallback((room) => {
    emit('join', room);
  }, [emit]);

  const leaveRoom = useCallback((room) => {
    emit('leave', room);
  }, [emit]);

  useEffect(() => {
    if (isAuthenticated && accessToken) {
      connect();
    } else {
      disconnect();
    }
    return () => {
      // Don't disconnect on unmount - keep global socket alive
    };
  }, [isAuthenticated, accessToken]);

  // Reconnect when token changes
  useEffect(() => {
    if (socketInstance && isAuthenticated) {
      socketInstance.auth = { token: accessToken };
      socketInstance.disconnect().connect();
    }
  }, [accessToken]);

  return {
    socket: socketInstance,
    connect,
    disconnect,
    reconnect,
    on,
    off,
    emit,
    joinRoom,
    leaveRoom,
    isConnected: socketInstance?.connected || false,
  };
};
