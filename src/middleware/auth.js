const jwt = require('jsonwebtoken');
const config = require('../config');
function authenticate(req, res, next) {
  const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  if (!token) return res.status(401).json({ status: 'error', message: 'Требуется авторизация' });
  try { req.user = jwt.verify(token, config.accessSecret); next(); }
  catch { res.status(401).json({ status: 'error', message: 'Недействительный или просроченный токен' }); }
}
function requireRole(...roles) { return (req, res, next) => roles.includes(req.user.role) ? next() : res.status(403).json({ status: 'error', message: 'Недостаточно прав' }); }
module.exports = { authenticate, requireRole };
