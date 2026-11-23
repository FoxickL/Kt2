const { Prisma } = require('@prisma/client');
module.exports = (err, req, res, next) => {
  if (res.headersSent) return next(err);
  let status = err.status || 500;
  let message = err.message || 'Внутренняя ошибка сервера';
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') { status = 409; message = 'Запись с такими данными уже существует'; }
    if (err.code === 'P2025') { status = 404; message = 'Запись не найдена'; }
    if (err.code === 'P2003') { status = 400; message = 'Связанная запись не найдена'; }
  }
  if (process.env.NODE_ENV === 'production' && status >= 500) message = 'Внутренняя ошибка сервера';
  if (status >= 500) console.error(err);
  res.status(status).json({ status: 'error', message, ...(process.env.NODE_ENV === 'development' && status >= 500 ? { stack: err.stack } : {}) });
};
