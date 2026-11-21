const dotenv = require('dotenv');
const path = require('path');
const { open } = require('sqlite');
const sqlite3 = require('sqlite3');

dotenv.config();


const dbPath = path.join(__dirname, '..', '..', 'database.sqlite');

let dbInstance = null;


async function initDB() {
  if (dbInstance) return dbInstance;

  dbInstance = await open({
    filename: dbPath,
    driver: sqlite3.Database
  });


  await dbInstance.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL UNIQUE,
      passwordHash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'USER' CHECK(role IN ('USER','MODERATOR','ADMIN'))
    );
    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      price REAL NOT NULL,
      category TEXT NOT NULL,
      stock INTEGER DEFAULT 0,
      description TEXT,
      imageUrl TEXT,
      createdAt TEXT NOT NULL
    );
  `);
  const columns = await dbInstance.all('PRAGMA table_info(products)');
  if (!columns.some(column => column.name === 'ownerId')) await dbInstance.exec('ALTER TABLE products ADD COLUMN ownerId INTEGER REFERENCES users(id)');

  console.log('[DATABASE] Подключение к SQLite успешно установлено');
  return dbInstance;
}

module.exports = {
  port: process.env.PORT || 3000,
  env: process.env.NODE_ENV || 'development',
  accessSecret: process.env.ACCESS_TOKEN_SECRET || 'development-access-secret-change-me',
  refreshSecret: process.env.REFRESH_TOKEN_SECRET || 'development-refresh-secret-change-me',
  uploadDir: path.join(__dirname, '..', '..', 'uploads', 'products'),
  initDB
};
