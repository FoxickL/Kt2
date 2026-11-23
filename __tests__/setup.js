process.env.NODE_ENV='test';
process.env.ACCESS_TOKEN_SECRET='test-access-secret-which-is-long-enough';
process.env.REFRESH_TOKEN_SECRET='test-refresh-secret-which-is-long-enough';
process.env.DATABASE_URL=process.env.TEST_DATABASE_URL||'postgresql://app:app_password@localhost:5432/task_api?schema=public';
