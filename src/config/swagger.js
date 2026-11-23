const path = require('path');
const swaggerJsdoc = require('swagger-jsdoc');

module.exports = swaggerJsdoc({
  definition: {
    openapi: '3.0.3',
    info: { title: 'KT6 Task API', version: '1.0.0' },
    components: {
      securitySchemes: {
        bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      },
      schemas: {
        User: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            email: { type: 'string', format: 'email' },
            role: { type: 'string', enum: ['USER', 'ADMIN'] },
          },
        },
        AuthBody: {
          type: 'object',
          required: ['email', 'password'],
          properties: {
            email: { type: 'string', format: 'email' },
            password: { type: 'string', minLength: 8, maxLength: 128 },
          },
        },
        AuthResponse: {
          type: 'object',
          properties: {
            status: { type: 'string', example: 'success' },
            data: {
              type: 'object',
              properties: {
                user: { $ref: '#/components/schemas/User' },
                accessToken: { type: 'string' },
              },
            },
          },
        },
        Project: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            name: { type: 'string' },
            description: { type: 'string' },
            ownerId: { type: 'integer' },
          },
        },
        CreateProject: {
          type: 'object',
          required: ['name'],
          properties: {
            name: { type: 'string', minLength: 2, maxLength: 120 },
            description: { type: 'string', maxLength: 2000 },
          },
        },
        Task: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            title: { type: 'string' },
            status: { type: 'string', enum: ['TODO', 'IN_PROGRESS', 'DONE'] },
            projectId: { type: 'integer' },
            assigneeId: { type: 'integer', nullable: true },
          },
        },
        CreateTask: {
          type: 'object',
          required: ['title', 'projectId'],
          properties: {
            title: { type: 'string' },
            description: { type: 'string' },
            status: { type: 'string', enum: ['TODO', 'IN_PROGRESS', 'DONE'] },
            projectId: { type: 'integer' },
            assigneeId: { type: 'integer', nullable: true },
            dueAt: { type: 'string', format: 'date-time' },
          },
        },
        Error: {
          type: 'object',
          properties: {
            status: { type: 'string', example: 'error' },
            message: { type: 'string' },
          },
        },
      },
    },
  },
  apis: [path.join(__dirname, '../routes/*.js')],
});