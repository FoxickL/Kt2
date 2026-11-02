const config = require('../config');

module.exports = (err, req, res, next) => {
  console.error(`[ERROR] ${err.stack}`);

  const statusCode = err.status || (err.code === 'LIMIT_FILE_SIZE' ? 400 : 500);
  const message = err.code === 'LIMIT_FILE_SIZE' 
    ? 'Файл слишком большой. Максимальный размер 2MB' 
    : err.message;
  
  res.status(statusCode).json({
    status: 'error',
    message: message || 'Внутренняя ошибка сервера',
    ...(config.env === 'development' && { stack: err.stack })
  });
};
