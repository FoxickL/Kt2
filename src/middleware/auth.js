const { verifyAccess } = require('../utils/jwt');
module.exports = (req, res, next) => {
  const token = (req.get('authorization') || '').replace(/^Bearer\s+/i, '');
  if (!token) return res.status(401).json({ status: 'error', message: 'Требуется access token' });
  try { req.user = verifyAccess(token); return next(); }
  catch { return res.status(401).json({ status: 'error', message: 'Токен недействителен или истёк' }); }
};
