const express = require('express');
const router = express.Router();
const Joi = require('joi');
const validate = require('../middleware/validate');
const upload = require('../middleware/upload');

let products = [
  { 
    id: 1, 
    name: "Ноутбук", 
    price: 75000, 
    category: "electronics", 
    stock: 10,
    description: "Мощный рабочий инструмент", 
    imageUrl: null,
    createdAt: new Date().toISOString()
  },
  { 
    id: 2, 
    name: "Футболка", 
    price: 1500, 
    category: "clothing", 
    stock: 50,
    description: "Хлопковая футболка", 
    imageUrl: null,
    createdAt: new Date().toISOString()
  }
];
let currentId = 3;

const ALLOWED_CATEGORIES = ['electronics', 'clothing', 'food', 'other'];

const productCreateSchema = Joi.object({
  name: Joi.string().min(2).max(100).required(),
  price: Joi.number().positive().required(),
  category: Joi.string().valid(...ALLOWED_CATEGORIES).required(),
  stock: Joi.number().integer().min(0).default(0),
  description: Joi.string().max(500).allow('', null)
});

const productPatchSchema = Joi.object({
  name: Joi.string().min(2).max(100),
  price: Joi.number().positive(),
  category: Joi.string().valid(...ALLOWED_CATEGORIES),
  stock: Joi.number().integer().min(0),
  description: Joi.string().max(500).allow('', null)
}).min(1);

/**
 * @openapi
 * components:
 *   schemas:
 *     Product:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *         name:
 *           type: string
 *         price:
 *           type: number
 *         category:
 *           type: string
 *           enum: [electronics, clothing, food, other]
 *         stock:
 *           type: integer
 *         description:
 *           type: string
 *         imageUrl:
 *           type: string
 *           nullable: true
 *         createdAt:
 *           type: string
 *           format: date-time
 *     ProductInput:
 *       type: object
 *       required:
 *         - name
 *         - price
 *         - category
 *       properties:
 *         name:
 *           type: string
 *         price:
 *           type: number
 *         category:
 *           type: string
 *           enum: [electronics, clothing, food, other]
 *         stock:
 *           type: integer
 *         description:
 *           type: string
 */

/**
 * @openapi
 * /api/products:
 *   get:
 *     summary: Список товаров с фильтрацией и пагинацией
 *     tags: [Products]
 *     parameters:
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *           enum: [electronics, clothing, food, other]
 *       - in: query
 *         name: minPrice
 *         schema:
 *           type: number
 *       - in: query
 *         name: maxPrice
 *         schema:
 *           type: number
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *     responses:
 *       200:
 *         description: Успех
 */
router.get('/', (req, res) => {
  let { category, minPrice, maxPrice, page, limit } = req.query;

  page = parseInt(page, 10) || 1;
  limit = parseInt(limit, 10) || 10;
  if (page < 1) page = 1;
  if (limit < 1) limit = 10;

  let filteredProducts = [...products];

  if (category) {
    filteredProducts = filteredProducts.filter(p => p.category === category);
  }

  if (minPrice) {
    const min = parseFloat(minPrice);
    if (!isNaN(min)) filteredProducts = filteredProducts.filter(p => p.price >= min);
  }

  if (maxPrice) {
    const max = parseFloat(maxPrice);
    if (!isNaN(max)) filteredProducts = filteredProducts.filter(p => p.price <= max);
  }

  const total = filteredProducts.length;
  const startIndex = (page - 1) * limit;
  const paginatedData = filteredProducts.slice(startIndex, startIndex + limit);

  res.json({ status: 'success', data: paginatedData, total, page, limit });
});

/**
 * @openapi
 * /api/products/{id}:
 *   get:
 *     summary: Получить один товар по ID
 *     tags: [Products]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Успех
 */
router.get('/:id', (req, res) => {
  const id = parseInt(req.params.id, 10);
  const product = products.find(p => p.id === id);
  
  if (!product) {
    return res.status(404).json({ status: 'error', message: 'Товар не найден' });
  }
  res.json({ status: 'success', data: product });
});

/**
 * @openapi
 * /api/products:
 *   post:
 *     summary: Создать новый товар
 *     tags: [Products]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ProductInput'
 *     responses:
 *       201:
 *         description: Создано
 */
router.post('/', validate(productCreateSchema), (req, res) => {
  const newProduct = {
    id: currentId++,
    ...req.body,
    imageUrl: null,
    createdAt: new Date().toISOString()
  };
  
  products.push(newProduct);
  res.status(201).json({ status: 'success', data: newProduct });
});

/**
 * @openapi
 * /api/products/{id}:
 *   put:
 *     summary: Заменить товар полностью (PUT)
 *     tags: [Products]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ProductInput'
 *     responses:
 *       200:
 *         description: Успех
 */
router.put('/:id', validate(productCreateSchema), (req, res) => {
  const id = parseInt(req.params.id, 10);
  const index = products.findIndex(p => p.id === id);
  
  if (index === -1) {
    return res.status(404).json({ status: 'error', message: 'Товар не найден' });
  }
  
  products[index] = {
    id: products[index].id,
    ...req.body,
    imageUrl: products[index].imageUrl,
    createdAt: products[index].createdAt
  };
  
  res.json({ status: 'success', data: products[index] });
});

/**
 * @openapi
 * /api/products/{id}:
 *   patch:
 *     summary: Обновить товар частично (PATCH)
 *     tags: [Products]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               price:
 *                 type: number
 *               category:
 *                 type: string
 *                 enum: [electronics, clothing, food, other]
 *               stock:
 *                 type: integer
 *               description:
 *                 type: string
 *     responses:
 *       200:
 *         description: Успех
 */
router.patch('/:id', validate(productPatchSchema), (req, res) => {
  const id = parseInt(req.params.id, 10);
  const index = products.findIndex(p => p.id === id);
  
  if (index === -1) {
    return res.status(404).json({ status: 'error', message: 'Товар не найден' });
  }
  
  products[index] = { ...products[index], ...req.body };
  res.json({ status: 'success', data: products[index] });
});

/**
 * @openapi
 * /api/products/{id}:
 *   delete:
 *     summary: Удалить товар по ID
 *     tags: [Products]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Удалено
 */
router.delete('/:id', (req, res) => {
  const id = parseInt(req.params.id, 10);
  const index = products.findIndex(p => p.id === id);
  
  if (index === -1) {
    return res.status(404).json({ status: 'error', message: 'Товар не найден' });
  }
  
  const deletedProduct = products.splice(index, 1);
  res.json({ status: 'success', message: 'Товар удален', data: deletedProduct });
});

/**
 * @openapi
 * /api/products/{id}/image:
 *   post:
 *     summary: Загрузить изображение товара
 *     tags: [Products]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               image:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Успех
 */
router.post('/:id/image', upload.single('image'), (req, res) => {
  const id = parseInt(req.params.id, 10);
  const product = products.find(p => p.id === id);
  
  if (!product) {
    return res.status(404).json({ status: 'error', message: 'Товар не найден' });
  }
  
  if (!req.file) {
    return res.status(400).json({ status: 'error', message: 'Файл изображения не загружен' });
  }

  product.imageUrl = `/uploads/products/${req.file.filename}`;

  res.json({ status: 'success', message: 'Изображение успешно загружено', data: product });
});

module.exports = router;
