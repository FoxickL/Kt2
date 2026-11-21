const http = require('http');
const { io: createClient } = require('socket.io-client');
const jwt = require('jsonwebtoken');
const app = require('../src');
const attachChat = require('../src/realtime/chat');
const config = require('../src/config');

let server;
let port;
let ioServer;
const clients = new Set();
const token = (id, email = `user${id}@example.com`) => jwt.sign({ id, email, role: 'USER' }, config.accessSecret, { expiresIn: '5m' });
function connect(id, authToken = token(id)) {
  const client = createClient(`http://127.0.0.1:${port}`, { auth: { token: authToken }, reconnection: false, forceNew: true });
  clients.add(client);
  return client;
}
function waitFor(socket, event, timeout = 2000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => { socket.off(event, listener); reject(new Error(`Timed out waiting for ${event}`)); }, timeout);
    const listener = data => { clearTimeout(timer); resolve(data); };
    socket.once(event, listener);
  });
}
function connected(socket) { return new Promise((resolve, reject) => { socket.once('connect', resolve); socket.once('connect_error', reject); }); }
function emitAck(socket, event, data) { return new Promise(resolve => socket.emit(event, data, resolve)); }

beforeAll(async () => {
  await config.initDB();
  server = http.createServer(app);
  ioServer = attachChat(server);
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  port = server.address().port;
});
afterEach(() => { for (const client of clients) client.disconnect(); clients.clear(); });
afterAll(async () => { await new Promise(resolve => ioServer.close(resolve)); await (await config.initDB()).close(); });

test('rejects missing and invalid JWT tokens', async () => {
  const missing = createClient(`http://127.0.0.1:${port}`, { reconnection: false, forceNew: true }); clients.add(missing);
  await expect(connected(missing)).rejects.toThrow(/JWT/);
  const invalid = connect(1, 'bad-token');
  await expect(connected(invalid)).rejects.toThrow(/JWT/);
});
test('accepts JWT and sends the current online user list', async () => {
  const client = connect(11);
  const list = waitFor(client, 'users:online');
  await connected(client);
  expect(await list).toEqual(expect.arrayContaining([expect.objectContaining({ id: 11 })]));
});
test('broadcasts messages from authenticated users', async () => {
  const sender = connect(21); const receiver = connect(22);
  await Promise.all([connected(sender), connected(receiver)]);
  const message = waitFor(receiver, 'message:new');
  const ack = await emitAck(sender, 'message:send', { text: 'hello everyone' });
  expect(ack.ok).toBe(true);
  expect(await message).toMatchObject({ text: 'hello everyone', user: { id: 21 } });
});
test('announces users online and offline', async () => {
  const observer = connect(31); const initialList = waitFor(observer, 'users:online'); await connected(observer); await initialList;
  const online = waitFor(observer, 'user:online');
  const newcomer = connect(32); await connected(newcomer);
  expect(await online).toMatchObject({ id: 32 });
  const offline = waitFor(observer, 'user:offline');
  newcomer.disconnect(); clients.delete(newcomer);
  expect(await offline).toMatchObject({ id: 32 });
});
test('supports joining, leaving and messaging a room', async () => {
  const member = connect(41); const other = connect(42);
  await Promise.all([connected(member), connected(other)]);
  expect((await emitAck(member, 'room:join', { room: 'project-x' })).ok).toBe(true);
  const delivered = waitFor(member, 'room:message');
  expect((await emitAck(member, 'room:message', { room: 'project-x', text: 'room hello' })).ok).toBe(true);
  expect(await delivered).toMatchObject({ room: 'project-x', text: 'room hello' });
  const notDelivered = waitFor(other, 'room:message', 150);
  await expect(notDelivered).rejects.toThrow(/Timed out/);
  await emitAck(member, 'room:leave', { room: 'project-x' });
  expect((await emitAck(member, 'room:message', { room: 'project-x', text: 'after leaving' })).ok).toBe(false);
});
test('rejects empty and oversized chat messages', async () => {
  const client = connect(51); await connected(client);
  expect((await emitAck(client, 'message:send', { text: '  ' })).ok).toBe(false);
  expect((await emitAck(client, 'message:send', { text: 'x'.repeat(2001) })).ok).toBe(false);
});
