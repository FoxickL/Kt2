const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const Joi = require('joi');
const { initDB, accessSecret, refreshSecret } = require('../config');
const validate = require('../middleware/validate');
const router = express.Router();
const credentials = Joi.object({ email: Joi.string().email().max(254).required(), password: Joi.string().min(8).max(128).required() });
const cookieOptions = { httpOnly: true, sameSite: 'strict', secure: process.env.NODE_ENV === 'production', path: '/auth' };
router.post('/register', validate(credentials), async (req, res, next) => {
  try {
    const db = await initDB(); const email = req.body.email.toLowerCase();
    const result = await db.run('INSERT INTO users(email,passwordHash) VALUES(?,?)', [email, await bcrypt.hash(req.body.password, 12)]);
    res.status(201).json({ status: 'success', data: { id: result.lastID, email, role: 'USER' } });
  } catch (error) { if (error.code === 'SQLITE_CONSTRAINT') return res.status(409).json({ status: 'error', message: 'Email уже зарегистрирован' }); next(error); }
});
router.post('/login', validate(credentials), async (req, res, next) => {
  try {
    const db = await initDB(); const user = await db.get('SELECT * FROM users WHERE email = ?', [req.body.email.toLowerCase()]);
    if (!user || !(await bcrypt.compare(req.body.password, user.passwordHash))) return res.status(401).json({ status: 'error', message: 'Неверный email или пароль' });
    const payload = { id: user.id, email: user.email, role: user.role };
    const accessToken = jwt.sign(payload, accessSecret, { expiresIn: '15m' });
    res.cookie('refreshToken', jwt.sign(payload, refreshSecret, { expiresIn: '7d' }), { ...cookieOptions, maxAge: 7 * 86400000 });
    res.json({ status: 'success', data: { user: payload, accessToken } });
  } catch (error) { next(error); }
});
router.post('/refresh', async (req, res) => {
  try {
    const payload = jwt.verify(req.cookies.refreshToken, refreshSecret);
    const db = await initDB(); const user = await db.get('SELECT id,email,role FROM users WHERE id = ?', [payload.id]);
    if (!user) throw new Error('User not found');
    const accessToken = jwt.sign(user, accessSecret, { expiresIn: '15m' });
    res.cookie('refreshToken', jwt.sign(user, refreshSecret, { expiresIn: '7d' }), { ...cookieOptions, maxAge: 7 * 86400000 });
    res.json({ status: 'success', data: { accessToken } });
  } catch { res.clearCookie('refreshToken', cookieOptions); res.status(401).json({ status: 'error', message: 'Недействительный refresh token' }); }
});
router.post('/logout', (req, res) => { res.clearCookie('refreshToken', cookieOptions); res.json({ status: 'success' }); });
module.exports = router;
