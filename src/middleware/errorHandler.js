const config = require('../config');

module.exports = (err, req, res, next) => {
  console.error(`[ERROR] ${err.message}`);

  const statusCode = err.status || (err.code === 'LIMIT_FILE_SIZE' ? 400 : 500);
  const message = config.env === 'production' && statusCode >= 500 ? 'Внутренняя ошибка сервера' : err.code === 'LIMIT_FILE_SIZE' 
    ? 'Файл слишком большой. Максимальный размер 2MB' 
    : err.message;
  
  res.status(statusCode).json({
    status: 'error',
    message: message || 'Внутренняя ошибка сервера',
    ...(config.env === 'development' && { stack: err.stack })
  });
};
