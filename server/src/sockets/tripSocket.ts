import { Server, Socket } from 'socket.io';

export const setupSocketHandlers = (io: Server) => {
  io.on('connection', (socket: Socket) => {
    console.log(`⚡ Client connected: ${socket.id}`);

    // Join a specific trip room
    socket.on('join-trip', (tripId: string) => {
      socket.join(`trip:${tripId}`);
      console.log(`Client ${socket.id} joined trip room: trip:${tripId}`);
    });

    // Leave trip room
    socket.on('leave-trip', (tripId: string) => {
      socket.leave(`trip:${tripId}`);
      console.log(`Client ${socket.id} left trip room: trip:${tripId}`);
    });

    // Realtime Activity updates
    socket.on('activity-changed', ({ tripId, action, data }: { tripId: string; action: string; data?: any }) => {
      socket.to(`trip:${tripId}`).emit('activity-updated', { action, data });
    });

    // Realtime Expense updates
    socket.on('expense-changed', ({ tripId, action, data }: { tripId: string; action: string; data?: any }) => {
      socket.to(`trip:${tripId}`).emit('expense-updated', { action, data });
    });

    // Realtime Member updates  
    socket.on('member-changed', ({ tripId, action, data }: { tripId: string; action: string; data?: any }) => {
      socket.to(`trip:${tripId}`).emit('member-updated', { action, data });
    });

    // Realtime Trip updates  
    socket.on('trip-changed', ({ tripId, action, data }: { tripId: string; action: string; data?: any }) => {
      socket.to(`trip:${tripId}`).emit('trip-updated', { action, data });
    });

    socket.on('disconnect', () => {
      console.log(`Client disconnected: ${socket.id}`);
    });
  });
};
