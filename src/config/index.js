const dotenv = require('dotenv');
const path = require('path');

dotenv.config();

module.exports = {
  port: process.env.PORT || 3000,
  env: process.env.NODE_ENV || 'development',
  uploadDir: path.join(__dirname, '../../uploads/products')
};