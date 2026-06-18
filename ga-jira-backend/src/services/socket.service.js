let io;

const init = (httpServer) => {
  const { Server } = require('socket.io');
  io = new Server(httpServer, {
    cors: { origin: process.env.FRONTEND_URL || '*', methods: ['GET', 'POST'] },
  });

  io.on('connection', (socket) => {
    socket.on('join:project', (projectId) => socket.join(`project:${projectId}`));
    socket.on('leave:project', (projectId) => socket.leave(`project:${projectId}`));
    socket.on('join:issue', (issueId) => socket.join(`issue:${issueId}`));
    socket.on('leave:issue', (issueId) => socket.leave(`issue:${issueId}`));
    socket.on('join:user', (userId) => socket.join(`user:${userId}`));
  });

  return io;
};

const getIO = () => {
  if (!io) throw new Error('Socket.io not initialized');
  return io;
};

const emitToProject = (projectId, event, data) => {
  if (io) io.to(`project:${projectId}`).emit(event, data);
};

const emitToIssue = (issueId, event, data) => {
  if (io) io.to(`issue:${issueId}`).emit(event, data);
};

const emitToUser = (userId, event, data) => {
  if (io) io.to(`user:${userId}`).emit(event, data);
};

module.exports = { init, getIO, emitToProject, emitToIssue, emitToUser };
