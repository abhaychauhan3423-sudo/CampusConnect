const jwt = require('jsonwebtoken');
const { Server } = require('socket.io');
const User = require('../models/User');

let io;

function initializeSocket(server) {
  io = new Server(server, {
    cors: {
      origin: process.env.CLIENT_URL || 'http://localhost:5173',
      credentials: true,
    },
  });

  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) return next(new Error('Authentication required.'));
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id).select('_id');
      if (!user) return next(new Error('Account no longer exists.'));
      socket.data.userId = user._id.toString();
      next();
    } catch {
      next(new Error('Session expired or invalid.'));
    }
  });

  io.on('connection', (socket) => {
    socket.join(`user:${socket.data.userId}`);
  });

  return io;
}

function emitToUser(userId, event, payload) {
  if (io) io.to(`user:${userId}`).emit(event, payload);
}

function closeSocket() {
  if (!io) return Promise.resolve();
  const instance = io;
  io = undefined;
  return new Promise((resolve) => instance.close(resolve));
}

module.exports = { initializeSocket, emitToUser, closeSocket };
