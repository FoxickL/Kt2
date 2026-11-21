const app = require('./index');
const http = require('http');
const attachChat = require('./realtime/chat');
const config = require('./config');
const server = http.createServer(app);
attachChat(server);
config.initDB().then(() => server.listen(config.port, () => console.log(`[SERVER] запущен на порту ${config.port}`))).catch(error => { console.error('[SERVER] Ошибка инициализации:', error.message); process.exit(1); });
