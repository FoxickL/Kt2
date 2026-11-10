const express = require('express');
const path = require('path');
const swaggerUi = require('swagger-ui-express');
const swaggerJsdoc = require('swagger-jsdoc');
const config = require('./config');
const logger = require('./middleware/logger');
const errorHandler = require('./middleware/errorHandler');
const productRoutes = require('./routes/products');

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(logger);

// Настройка swagger-jsdoc с жестким абсолютным путем к файлу маршрутов
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Product Catalog API',
      version: '1.0.0',
      description: 'Документация REST API для управления каталогом товаров (КТ-02)',
    },
    servers: [
      {
        url: `http://localhost:${config.port}`,
        description: 'Локальный сервер',
      },
    ],
  },
  // ИСПРАВЛЕНО: Явно подключаем конкретный файл для парсинга OpenAPI
  apis: [path.join(__dirname, 'routes', 'products.js')], 
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));
app.use('/api/products', productRoutes);

app.use((req, res, next) => {
  const error = new Error('Ресурс не найден');
  error.status = 404;
  next(error);
});

app.use(errorHandler);

// ИСПРАВЛЕНО: Асинхронный запуск с подключением к SQLite перед стартом сервера
async function startServer() {
  try {
    // Вызываем функцию инициализации из обновленного config/index.js
    await config.initDB();

    app.listen(config.port, () => {
      console.log(`[SERVER] запущен на порту ${config.port}`);
      console.log(`[SWAGGER] Документация доступна по адресу: http://localhost:${config.port}/api-docs`);
    });
  } catch (error) {
    console.error('[SERVER] Критическая ошибка при инициализации БД и запуске:', error);
    process.exit(1);
  }
}

startServer();