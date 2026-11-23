const router = require('express').Router();
const Joi = require('joi');
const bcrypt = require('bcrypt');
const config = require('../config');
const validate = require('../middleware/validate');
const { accessToken, refreshToken, verifyRefresh } = require('../utils/jwt');
const authBody = Joi.object({ email: Joi.string().email().max(254).required(), password: Joi.string().min(8).max(128).required() });
const cookieOptions = { httpOnly: true, sameSite: 'strict', secure: process.env.NODE_ENV === 'production', path: '/auth' };
router.post('/register', validate(authBody), async (req, res, next) => {
  try {
    const user = await config.prisma.user.create({ data: { email: req.body.email.toLowerCase(), passwordHash: await bcrypt.hash(req.body.password, 12) }, select: { id: true, email: true, role: true } });
    res.cookie('refreshToken', refreshToken(user), { ...cookieOptions, maxAge: 7 * 86400000 });
    res.status(201).json({ status: 'success', data: { user, accessToken: accessToken(user) } });
  } catch (e) { next(e); }
});
router.post('/login', validate(authBody), async (req, res, next) => {
  try {
    const user = await config.prisma.user.findUnique({ where: { email: req.body.email.toLowerCase() } });
    if (!user || !await bcrypt.compare(req.body.password, user.passwordHash)) return res.status(401).json({ status: 'error', message: 'Неверный email или пароль' });
    res.cookie('refreshToken', refreshToken(user), { ...cookieOptions, maxAge: 7 * 86400000 });
    res.json({ status: 'success', data: { user: { id: user.id, email: user.email, role: user.role }, accessToken: accessToken(user) } });
  } catch (e) { next(e); }
});
router.post('/refresh', async (req, res) => {
  try {
    const claims = verifyRefresh(req.cookies.refreshToken);
    if (claims.tokenUse !== 'refresh') throw new Error('Wrong token use');
    const user = await config.prisma.user.findUniqueOrThrow({ where: { id: claims.id }, select: { id: true, email: true, role: true } });
    res.cookie('refreshToken', refreshToken(user), { ...cookieOptions, maxAge: 7 * 86400000 });
    res.json({ status: 'success', data: { accessToken: accessToken(user) } });
  } catch { res.clearCookie('refreshToken', cookieOptions); res.status(401).json({ status: 'error', message: 'Недействительный refresh token' }); }
});
router.post('/logout', (req, res) => { res.clearCookie('refreshToken', cookieOptions); res.json({ status: 'success', message: 'Вы вышли из системы' }); });
module.exports = router;
