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

  console.log('[DATABASE] Подключение к SQLite успешно установлено');
  return dbInstance;
}

module.exports = {
  port: process.env.PORT || 3000,
  env: process.env.NODE_ENV || 'development',
  uploadDir: path.join(__dirname, '..', '..', 'uploads', 'products'),
  initDB
};