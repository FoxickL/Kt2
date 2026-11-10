const express = require('express');
const router = express.Router();
const Joi = require('joi');
const validate = require('../middleware/validate');
const upload = require('../middleware/upload');
const { initDB } = require('../config');

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
router.get('/', async (req, res, next) => {
  try {
    const db = await initDB();
    let { category, minPrice, maxPrice, page, limit } = req.query;

    page = parseInt(page, 10) || 1;
    limit = parseInt(limit, 10) || 10;
    if (page < 1) page = 1;
    if (limit < 1) limit = 10;
    
    const offset = (page - 1) * limit;

    let query = 'SELECT * FROM products WHERE 1=1';
    let countQuery = 'SELECT COUNT(*) as total FROM products WHERE 1=1';
    const params = [];
    const countParams = [];

    if (category) {
      query += ' AND category = ?';
      countQuery += ' AND category = ?';
      params.push(category);
      countParams.push(category);
    }

    if (minPrice) {
      const min = parseFloat(minPrice);
      if (!isNaN(min)) {
        query += ' AND price >= ?';
        countQuery += ' AND price >= ?';
        params.push(min);
        countParams.push(min);
      }
    }

    if (maxPrice) {
      const max = parseFloat(maxPrice);
      if (!isNaN(max)) {
        query += ' AND price <= ?';
        countQuery += ' AND price <= ?';
        params.push(max);
        countParams.push(max);
      }
    }

    const countResult = await db.get(countQuery, countParams);
    const total = countResult.total;

    query += ' LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const data = await db.all(query, params);

    res.json({ status: 'success', data, total, page, limit });
  } catch (error) {
    next(error);
  }
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
router.get('/:id', async (req, res, next) => {
  try {
    const db = await initDB();
    const id = parseInt(req.params.id, 10);
    const product = await db.get('SELECT * FROM products WHERE id = ?', [id]);
    
    if (!product) {
      return res.status(404).json({ status: 'error', message: 'Товар не найден' });
    }
    res.json({ status: 'success', data: product });
  } catch (error) {
    next(error);
  }
});

/**
 * @openapi
 * /api/products:
 *   post:
 *     summary: Создать новый товар с фото
 *     tags: [Products]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               price:
 *                 type: number
 *               category:
 *                 type: string
 *               stock:
 *                 type: integer
 *               description:
 *                 type: string
 *               image:
 *                 type: string
 *                 format: binary
 *     responses:
 *       201:
 *         description: Создано
 */
router.post('/', upload.single('image'), validate(productCreateSchema), async (req, res, next) => {
  try {
    const db = await initDB();
    const { name, price, category, stock, description } = req.body;
    const createdAt = new Date().toISOString();
    
    // Если файл загружен, формируем относительный путь для сохранения в БД
    const imageUrl = req.file ? `/uploads/products/${req.file.filename}` : null;

    const result = await db.run(
      `INSERT INTO products (name, price, category, stock, description, imageUrl, createdAt)
       VALUES (?, ?, ?, ?, ?, ?, ?)` ,
      [name, price, category, stock, description, imageUrl, createdAt]
    );

    const newProduct = {
      id: result.lastID,
      name,
      price,
      category,
      stock,
      description,
      imageUrl,
      createdAt
    };
    
    res.status(201).json({ status: 'success', data: newProduct });
  } catch (error) {
    next(error);
  }
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
router.put('/:id', validate(productCreateSchema), async (req, res, next) => {
  try {
    const db = await initDB();
    const id = parseInt(req.params.id, 10);
    const { name, price, category, stock, description } = req.body;
    
    const product = await db.get('SELECT * FROM products WHERE id = ?', [id]);
    if (!product) {
      return res.status(404).json({ status: 'error', message: 'Товар не найден' });
    }
    
    await db.run(
      `UPDATE products 
       SET name = ?, price = ?, category = ?, stock = ?, description = ?
       WHERE id = ?` ,
      [name, price, category, stock, description, id]
    );

    const updatedProduct = {
      id,
      name,
      price,
      category,
      stock,
      description,
      imageUrl: product.imageUrl,
      createdAt: product.createdAt
    };
    
    res.json({ status: 'success', data: updatedProduct });
  } catch (error) {
    next(error);
  }
});

/**
 * @openapi
 * /api/products/{id}:
 *   patch:
 *     summary: Обновить данные или фото товара частично
 *     tags: [Products]
 */
router.patch('/:id', upload.single('image'), validate(productPatchSchema), async (req, res, next) => {
  try {
    const db = await initDB();
    const id = parseInt(req.params.id, 10);
    
    const product = await db.get('SELECT * FROM products WHERE id = ?', [id]);
    if (!product) {
      return res.status(404).json({ status: 'error', message: 'Товар не найден' });
    }

    // Собираем измененные текстовые поля
    const updateData = { ...req.body };

    // Если прислали новое фото, добавляем его в объект обновления
    if (req.file) {
      updateData.imageUrl = `/uploads/products/${req.file.filename}`;
    }

    const fields = Object.keys(updateData);
    if (fields.length === 0) {
      return res.json({ status: 'success', data: product });
    }

    const setClause = fields.map(field => `${field} = ?`).join(', ');
    const params = fields.map(field => updateData[field]);
    params.push(id);

    await db.run(`UPDATE products SET ${setClause} WHERE id = ?`, params);

    const updatedProduct = await db.get('SELECT * FROM products WHERE id = ?', [id]);
    res.json({ status: 'success', data: updatedProduct });
  } catch (error) {
    next(error);
  }
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
router.delete('/:id', async (req, res, next) => {
  try {
    const db = await initDB();
    const id = parseInt(req.params.id, 10);
    
    const product = await db.get('SELECT * FROM products WHERE id = ?', [id]);
    if (!product) {
      return res.status(404).json({ status: 'error', message: 'Товар не найден' });
    }
    
    await db.run('DELETE FROM products WHERE id = ?', [id]);
    res.json({ status: 'success', message: 'Товар удален', data: product });
  } 
  catch (error) {
    next(error);
  }
});
  module.exports = router;
