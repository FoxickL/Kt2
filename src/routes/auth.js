const router = require('express').Router();
const Joi = require('joi');
const bcrypt = require('bcrypt');
const config = require('../config');
const validate = require('../middleware/validate');
const { accessToken, refreshToken, verifyRefresh } = require('../utils/jwt');

const authBody = Joi.object({
  email: Joi.string().email().max(254).required(),
  password: Joi.string().min(8).max(128).required(),
});
const cookieOptions = {
  httpOnly: true,
  sameSite: 'strict',
  secure: process.env.NODE_ENV === 'production',
  path: '/auth',
};
const REFRESH_MAX_AGE = 7 * 86400000;

/**
 * @swagger
 * tags:
 *   name: Auth
 *   description: Регистрация, вход и работа с токенами
 */

/**
 * @swagger
 * /auth/register:
 *   post:
 *     summary: Регистрация пользователя
 *     description: Создаёт пользователя, возвращает access-токен и устанавливает refresh-токен в httpOnly cookie.
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AuthBody'
 *     responses:
 *       201:
 *         description: Пользователь создан
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthResponse'
 *       400:
 *         description: Ошибка валидации
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       409:
 *         description: Email уже занят
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/register', validate(authBody), async (req, res, next) => {
  try {
    const user = await config.prisma.user.create({
      data: {
        email: req.body.email.toLowerCase(),
        passwordHash: await bcrypt.hash(req.body.password, 12),
      },
      select: { id: true, email: true, role: true },
    });
    res.cookie('refreshToken', refreshToken(user), { ...cookieOptions, maxAge: REFRESH_MAX_AGE });
    res.status(201).json({ status: 'success', data: { user, accessToken: accessToken(user) } });
  } catch (e) {
    if (e.code === 'P2002') {
      return res.status(409).json({ status: 'error', message: 'Email уже зарегистрирован' });
    }
    next(e);
  }
});

/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: Вход в систему
 *     description: Проверяет email и пароль, возвращает access-токен и устанавливает refresh-токен в httpOnly cookie.
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AuthBody'
 *     responses:
 *       200:
 *         description: Успешный вход
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthResponse'
 *       400:
 *         description: Ошибка валидации
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Неверный email или пароль
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/login', validate(authBody), async (req, res, next) => {
  try {
    const user = await config.prisma.user.findUnique({
      where: { email: req.body.email.toLowerCase() },
    });
    if (!user || !(await bcrypt.compare(req.body.password, user.passwordHash))) {
      return res.status(401).json({ status: 'error', message: 'Неверный email или пароль' });
    }
    res.cookie('refreshToken', refreshToken(user), { ...cookieOptions, maxAge: REFRESH_MAX_AGE });
    res.json({
      status: 'success',
      data: {
        user: { id: user.id, email: user.email, role: user.role },
        accessToken: accessToken(user),
      },
    });
  } catch (e) {
    next(e);
  }
});

/**
 * @swagger
 * /auth/refresh:
 *   post:
 *     summary: Обновление access-токена
 *     description: Берёт refresh-токен из httpOnly cookie, выдаёт новый access-токен и обновляет cookie.
 *     tags: [Auth]
 *     responses:
 *       200:
 *         description: Новый access-токен
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 data:
 *                   type: object
 *                   properties:
 *                     accessToken:
 *                       type: string
 *       401:
 *         description: Недействительный refresh token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/refresh', async (req, res) => {
  try {
    const claims = verifyRefresh(req.cookies && req.cookies.refreshToken);
    if (claims.tokenUse !== 'refresh') throw new Error('Wrong token use');
    const user = await config.prisma.user.findUniqueOrThrow({
      where: { id: claims.id },
      select: { id: true, email: true, role: true },
    });
    res.cookie('refreshToken', refreshToken(user), { ...cookieOptions, maxAge: REFRESH_MAX_AGE });
    res.json({ status: 'success', data: { accessToken: accessToken(user) } });
  } catch {
    res.clearCookie('refreshToken', cookieOptions);
    res.status(401).json({ status: 'error', message: 'Недействительный refresh token' });
  }
});

/**
 * @swagger
 * /auth/logout:
 *   post:
 *     summary: Выход из системы
 *     description: Очищает refresh-cookie.
 *     tags: [Auth]
 *     responses:
 *       200:
 *         description: Вы вышли из системы
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 message:
 *                   type: string
 *                   example: Вы вышли из системы
 */
router.post('/logout', (req, res) => {
  res.clearCookie('refreshToken', cookieOptions);
  res.json({ status: 'success', message: 'Вы вышли из системы' });
});

module.exports = router;
