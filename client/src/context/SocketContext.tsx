import React, { createContext, useContext, useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  joinTrip: (tripId: string) => void;
  leaveTrip: (tripId: string) => void;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const newSocket = io(import.meta.env.VITE_SOCKET_URL || 'https://tripsync-server-3jvi.onrender.com', {
      autoConnect: true,
    });
    setSocket(newSocket);

    newSocket.on('connect', () => setIsConnected(true));
    newSocket.on('disconnect', () => setIsConnected(false));

    return () => {
      newSocket.disconnect();
    };
  }, []);

  const joinTrip = (tripId: string) => {
    if (socket) {
      socket.emit('join-trip', tripId);
    }
  };

  const leaveTrip = (tripId: string) => {
    if (socket) {
      socket.emit('leave-trip', tripId);
    }
  };

  return (
    <SocketContext.Provider value={{ socket, isConnected, joinTrip, leaveTrip }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) throw new Error('useSocket must be used within SocketProvider');
  return context;
};
