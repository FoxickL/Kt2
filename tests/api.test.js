const app = require('../src');
const request = require('supertest');
const config = require('../src/config');
const jwt = require('jsonwebtoken');

const api = request(app);

beforeAll(async () => { await config.initDB(); });
afterAll(async () => { await (await config.initDB()).close(); });
const credentials = suffix => ({ email: `test-${Date.now()}-${suffix}@example.com`, password: 'safe-password-123' });

test('registration succeeds', async () => { const r = await api.post('/auth/register').send(credentials('ok')); expect(r.status).toBe(201); });
test('duplicate email is rejected', async () => { const c = credentials('dup'); await api.post('/auth/register').send(c); expect((await api.post('/auth/register').send(c)).status).toBe(409); });
test('login succeeds and sets httpOnly refresh cookie', async () => { const c = credentials('login'); await api.post('/auth/register').send(c); const r = await api.post('/auth/login').send(c); expect(r.status).toBe(200); expect(r.body.data.accessToken).toBeTruthy(); expect(r.headers['set-cookie'][0]).toMatch(/HttpOnly/i); });
test('invalid login is rejected', async () => { expect((await api.post('/auth/login').send(credentials('absent'))).status).toBe(401); });
test('protected route rejects missing token', async () => { expect((await api.get('/auth/me')).status).toBe(401); });
test('protected route accepts valid token', async () => { const token = jwt.sign({ id: 900, email: 'x@example.com', role: 'USER' }, config.accessSecret, { expiresIn: '1m' }); expect((await api.get('/auth/me').set('Authorization', `Bearer ${token}`)).status).toBe(200); });
test('non-owner cannot delete post', async () => {
  const db = await config.initDB(); const tag = `${Date.now()}-${Math.random()}`;
  const a = await db.run('INSERT INTO users(email,passwordHash) VALUES(?,?)', [`owner-${tag}@example.com`, 'x']);
  const b = await db.run('INSERT INTO users(email,passwordHash) VALUES(?,?)', [`other-${tag}@example.com`, 'x']);
  const p = await db.run("INSERT INTO products(name,price,category,createdAt,ownerId) VALUES('test',1,'other',?,?)", [new Date().toISOString(), a.lastID]);
  const token = jwt.sign({ id: b.lastID, role: 'USER' }, config.accessSecret);
  expect((await api.delete(`/api/posts/${p.lastID}`).set('Authorization', `Bearer ${token}`)).status).toBe(403);
});
test('moderator role passes users authorization', async () => { const token = jwt.sign({ id: 1, role: 'MODERATOR' }, config.accessSecret); expect((await api.get('/api/users').set('Authorization', `Bearer ${token}`)).status).toBe(200); });
test('role utility denies user on admin route', async () => { const token = jwt.sign({ id: 1, role: 'USER' }, config.accessSecret); expect((await api.patch('/admin/users/1/role').set('Authorization', `Bearer ${token}`).send({ role: 'ADMIN' })).status).toBe(403); });
