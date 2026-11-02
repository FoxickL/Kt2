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

// Конфигурация swagger-jsdoc
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
  // Указываем, где искать JSDoc-комментарии (в папке routes)
  apis: [path.join(__dirname, './routes/*.js')], 
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);

// Подключаем UI документации
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Статика для картинок
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Подключение роутов
app.use('/api/products', productRoutes);

app.use((req, res, next) => {
  const error = new Error('Ресурс не найден');
  error.status = 404;
  next(error);
});

app.use(errorHandler);

app.listen(config.port, () => {
  console.log(`[SERVER] запущен на порту ${config.port}`);
  console.log(`[SWAGGER] Документация доступна по адресу: http://localhost:${config.port}/api-docs`);
});
