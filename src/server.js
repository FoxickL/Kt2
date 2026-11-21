const app = require('./index');
const config = require('./config');
config.initDB().then(() => app.listen(config.port, () => console.log(`[SERVER] запущен на порту ${config.port}`))).catch(error => { console.error('[SERVER] Ошибка инициализации:', error.message); process.exit(1); });
