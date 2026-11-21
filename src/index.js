const express = require('express');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const cookieParser = require('cookie-parser');
const swaggerUi = require('swagger-ui-express');
const swaggerJsdoc = require('swagger-jsdoc');
const config = require('./config');
const logger = require('./middleware/logger');
const errorHandler = require('./middleware/errorHandler');
const productRoutes = require('./routes/products');
const authRoutes = require('./routes/auth');
const { authenticate, requireRole } = require('./middleware/auth');

const app = express();
app.use(helmet());
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
app.use(cookieParser());
app.use(logger);
app.use('/auth/login', rateLimit({ windowMs: 15 * 60 * 1000, limit: 10, standardHeaders: true, legacyHeaders: false }));
app.use('/auth', authRoutes);
app.get('/auth/me', authenticate, (req, res) => res.json({ status: 'success', data: req.user }));
app.use('/api/posts', authenticate, productRoutes);
app.use('/api/products', authenticate, productRoutes);
app.get('/api/users', authenticate, requireRole('MODERATOR', 'ADMIN'), async (req, res, next) => {
  try { const db = await config.initDB(); res.json({ status: 'success', data: await db.all('SELECT id, email, role FROM users ORDER BY id') }); } catch (error) { next(error); }
});
app.patch('/admin/users/:id/role', authenticate, requireRole('ADMIN'), async (req, res, next) => {
  try {
    const { role } = req.body;
    if (!['USER', 'MODERATOR', 'ADMIN'].includes(role)) return res.status(400).json({ status: 'error', message: 'Некорректная роль' });
    const db = await config.initDB();
    const result = await db.run('UPDATE users SET role = ? WHERE id = ?', [role, req.params.id]);
    if (!result.changes) return res.status(404).json({ status: 'error', message: 'Пользователь не найден' });
    res.json({ status: 'success' });
  } catch (error) { next(error); }
});
const swaggerSpec = swaggerJsdoc({ definition: { openapi: '3.0.0', info: { title: 'Product Catalog API', version: '2.0.0' } }, apis: [] });
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.use('/uploads', express.static(config.uploadDir));
app.use((req, res, next) => { const error = new Error('Ресурс не найден'); error.status = 404; next(error); });
app.use(errorHandler);
module.exports = app;
