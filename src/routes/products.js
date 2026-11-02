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

  res.json({
    status: 'success',
    data: paginatedData,
    total,
    page,
    limit
  });
});

router.get('/:id', (req, res) => {
  const id = parseInt(req.params.id, 10);
  const product = products.find(p => p.id === id);
  
  if (!product) {
    return res.status(404).json({ status: 'error', message: 'Товар не найден' });
  }
  res.json({ status: 'success', data: product });
});

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

router.patch('/:id', validate(productPatchSchema), (req, res) => {
  const id = parseInt(req.params.id, 10);
  const index = products.findIndex(p => p.id === id);
  
  if (index === -1) {
    return res.status(404).json({ status: 'error', message: 'Товар не найден' });
  }

  products[index] = { ...products[index], ...req.body };
  res.json({ status: 'success', data: products[index] });
});

router.delete('/:id', (req, res) => {
  const id = parseInt(req.params.id, 10);
  const index = products.findIndex(p => p.id === id);
  
  if (index === -1) {
    return res.status(404).json({ status: 'error', message: 'Товар не найден' });
  }
  
  const deletedProduct = products.splice(index, 1);
  res.json({ status: 'success', message: 'Товар удален', data: deletedProduct[0] });
});

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

  res.json({ 
    status: 'success', 
    message: 'Изображение успешно загружено', 
    data: product 
  });
});

module.exports = router;
