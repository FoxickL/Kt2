# KT6 — Task management API

Backend на Express 5, Prisma и PostgreSQL: пользователи, проекты и задачи. Доступ защищён JWT access/refresh токенами. USER управляет своими проектами и задачами; ADMIN имеет доступ к данным пользователей и ресурсам.

## Запуск в Docker

```powershell
Copy-Item .env.example .env
```

Замените секреты в `.env`, затем выполните:

```powershell
docker compose up --build
```

После старта API доступен на `http://localhost:3000`, Swagger — `/api/docs`, проверка — `/health`. PostgreSQL доступен на порту 5432. Миграции применяются командой `prisma migrate deploy` при старте контейнера.

Локальная разработка: `npm ci`, `npm run db:generate`, `npm run db:migrate`, `npm start`. Для тестов нужен PostgreSQL с применёнными миграциями; запуск: `npm test`.

## Аутентификация

- `POST /auth/register` — регистрация (`email`, `password`)
- `POST /auth/login` — вход, выдаёт access JWT и httpOnly refresh cookie
- `POST /auth/refresh` — обновление access token
- `POST /auth/logout` — очистка refresh cookie
- `GET /auth/me` — текущий пользователь

Для защищённых маршрутов передавайте `Authorization: Bearer <accessToken>`.

## Ресурсы

- `/api/projects`: GET list (фильтр `page`, `limit`), POST, GET/PATCH/PUT/DELETE `/:id`
- `/api/tasks`: GET list (фильтры `projectId`, `status`, `page`, `limit`), POST, GET/PATCH/PUT/DELETE `/:id`
- `GET /api/users` — список пользователей (ADMIN)

Списки возвращают `{ status, data, meta: { page, limit, total } }`. Чтение и изменение проекта/задачи проверяет владельца проекта; ADMIN может управлять всеми ресурсами.
