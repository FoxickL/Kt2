const jwt = require('jsonwebtoken');
const config = require('../config');
function accessToken(user) {
  return jwt.sign({ id: user.id, email: user.email, role: user.role }, config.accessSecret || 'development-access-secret-only', { expiresIn: '15m' });
}
function refreshToken(user) {
  return jwt.sign({ id: user.id, tokenUse: 'refresh' }, config.refreshSecret || 'development-refresh-secret-only', { expiresIn: '7d' });
}
function verifyAccess(token) { return jwt.verify(token, config.accessSecret || 'development-access-secret-only'); }
function verifyRefresh(token) { return jwt.verify(token, config.refreshSecret || 'development-refresh-secret-only'); }
module.exports = { accessToken, refreshToken, verifyAccess, verifyRefresh };
