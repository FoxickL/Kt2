const express = require('express');
const path = require('path');
const config = require('./config');
const logger = require('./middleware/logger');
const errorHandler = require('./middleware/errorHandler');
const productRoutes = require('./routes/products');

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(logger);

// Статическая папка для картинок
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Подключение маршрутов
app.use('/api/products', productRoutes);

app.use((req, res, next) => {
  const error = new Error('Ресурс не найден');
  error.status = 404;
  next(error);
});

app.use(errorHandler);

app.listen(config.port, () => {
  console.log(`[SERVER] запущен на порту ${config.port} в режиме ${config.env}`);
});