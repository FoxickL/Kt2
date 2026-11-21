const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const config = require('../config');

function attachChat(server, { origins } = {}) {
  const io = new Server(server, {
    cors: origins ? { origin: origins, credentials: true } : undefined,
    maxHttpBufferSize: 10 * 1024,
    connectionStateRecovery: { maxDisconnectionDuration: 2 * 60 * 1000 }
  });
  const online = new Map();
  const roomName = value => typeof value === 'string' && value.trim() ? `room:${value.trim().slice(0, 80)}` : null;

  io.use((socket, next) => {
    const token = socket.handshake.auth && socket.handshake.auth.token;
    if (!token) return next(new Error('Требуется JWT токен'));
    try { socket.data.user = jwt.verify(token, config.accessSecret); next(); }
    catch { next(new Error('Недействительный или просроченный JWT токен')); }
  });

  io.on('connection', socket => {
    const user = { id: socket.data.user.id, email: socket.data.user.email, role: socket.data.user.role };
    const key = String(user.id);
    let sessions = online.get(key);
    const firstConnection = !sessions;
    if (!sessions) { sessions = new Set(); online.set(key, sessions); }
    sessions.add(socket.id);
    socket.emit('users:online', [...online.keys()].map(id => {
      const peer = [...online.get(id)][0];
      const s = io.sockets.sockets.get(peer);
      return s ? { id: Number(id), email: s.data.user.email } : { id: Number(id) };
    }));
    if (firstConnection) socket.broadcast.emit('user:online', user);

    socket.on('message:send', (payload, ack) => {
      const text = typeof payload === 'string' ? payload : payload && payload.text;
      if (typeof text !== 'string' || !text.trim() || text.length > 2000) {
        if (typeof ack === 'function') ack({ ok: false, error: 'Сообщение должно содержать от 1 до 2000 символов' });
        return;
      }
      const message = { id: `${Date.now()}-${socket.id}`, user, text: text.trim(), createdAt: new Date().toISOString() };
      io.emit('message:new', message);
      if (typeof ack === 'function') ack({ ok: true, data: message });
    });

    socket.on('room:join', (value, ack) => {
      const room = roomName(value && value.room !== undefined ? value.room : value);
      if (!room) { if (typeof ack === 'function') ack({ ok: false, error: 'Некорректная комната' }); return; }
      socket.join(room);
      if (typeof ack === 'function') ack({ ok: true, room: room.slice(5) });
    });
    socket.on('room:leave', (value, ack) => {
      const room = roomName(value && value.room !== undefined ? value.room : value);
      if (!room) { if (typeof ack === 'function') ack({ ok: false, error: 'Некорректная комната' }); return; }
      socket.leave(room);
      if (typeof ack === 'function') ack({ ok: true, room: room.slice(5) });
    });
    socket.on('room:message', (payload, ack) => {
      const room = roomName(payload && payload.room);
      const text = payload && payload.text;
      if (!room || !socket.rooms.has(room) || typeof text !== 'string' || !text.trim() || text.length > 2000) {
        if (typeof ack === 'function') ack({ ok: false, error: 'Войдите в комнату и отправьте сообщение до 2000 символов' });
        return;
      }
      const message = { id: `${Date.now()}-${socket.id}`, room: room.slice(5), user, text: text.trim(), createdAt: new Date().toISOString() };
      io.to(room).emit('room:message', message);
      if (typeof ack === 'function') ack({ ok: true, data: message });
    });

    socket.on('disconnect', () => {
      sessions.delete(socket.id);
      if (!sessions.size) { online.delete(key); socket.broadcast.emit('user:offline', { id: user.id }); }
    });
  });

  return io;
}

module.exports = attachChat;
