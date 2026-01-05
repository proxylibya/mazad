import swaggerJsdoc, { SwaggerOptions } from 'swagger-jsdoc';

const options: SwaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'سوق مزاد السيارات API',
      version: '1.0.0',
      description: 'توثيق شامل لجميع واجهات برمجة التطبيقات الخاصة بمنصة سوق مزاد السيارات',
      contact: {
        name: 'فريق التطوير',
        email: 'dev@sooq-mazad.ly',
      },
      license: {
        name: 'Proprietary',
      },
    },
    servers: [
      {
        url: 'http://localhost:3021',
        description: 'بيئة التطوير المحلية',
      },
      {
        url: 'https://staging.sooq-mazad.ly',
        description: 'بيئة الاختبار',
      },
      {
        url: 'https://api.sooq-mazad.ly',
        description: 'بيئة الإنتاج',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'أدخل رمز JWT الخاص بك',
        },
        cookieAuth: {
          type: 'apiKey',
          in: 'cookie',
          name: 'next-auth.session-token',
          description: 'Session cookie من NextAuth',
        },
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            error: {
              type: 'string',
              description: 'رسالة الخطأ',
            },
            message: {
              type: 'string',
              description: 'تفاصيل إضافية',
            },
            statusCode: {
              type: 'number',
              description: 'رمز حالة HTTP',
            },
          },
        },
        Auction: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            title: { type: 'string' },
            description: { type: 'string' },
            startPrice: { type: 'number' },
            currentPrice: { type: 'number' },
            status: {
              type: 'string',
              enum: ['PENDING', 'ACTIVE', 'COMPLETED', 'CANCELLED'],
            },
            startTime: { type: 'string', format: 'date-time' },
            endTime: { type: 'string', format: 'date-time' },
            carId: { type: 'string', format: 'uuid' },
            sellerId: { type: 'string', format: 'uuid' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        User: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            email: { type: 'string', format: 'email' },
            name: { type: 'string' },
            phone: { type: 'string' },
            role: {
              type: 'string',
              enum: ['USER', 'ADMIN', 'MODERATOR'],
            },
            userType: {
              type: 'string',
              enum: ['REGULAR_USER', 'TRANSPORT_OWNER', 'COMPANY', 'SHOWROOM'],
            },
            verified: { type: 'boolean' },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        Wallet: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            userId: { type: 'string', format: 'uuid' },
            type: {
              type: 'string',
              enum: ['LOCAL', 'GLOBAL', 'CRYPTO'],
            },
            balance: { type: 'number' },
            currency: { type: 'string' },
            status: { type: 'string', enum: ['ACTIVE', 'FROZEN', 'CLOSED'] },
          },
        },
      },
    },
    security: [
      {
        bearerAuth: [],
      },
      {
        cookieAuth: [],
      },
    ],
    tags: [
      { name: 'مصادقة', description: 'عمليات تسجيل الدخول والخروج' },
      { name: 'مزادات', description: 'إدارة المزادات' },
      { name: 'مركبات', description: 'إدارة المركبات' },
      { name: 'محافظ', description: 'المحافظ الرقمية والمدفوعات' },
      { name: 'مستخدمين', description: 'إدارة المستخدمين' },
      { name: 'إشعارات', description: 'نظام الإشعارات' },
      { name: 'إدارة', description: 'لوحة التحكم الإدارية' },
      { name: 'نقل', description: 'خدمات النقل' },
      { name: 'معارض', description: 'معارض السيارات' },
      { name: 'شركات', description: 'الشركات المسجلة' },
    ],
  },
  apis: ['./pages/api/**/*.ts', './pages/api/**/*.tsx', './pages/api/*.ts'],
};

export const swaggerSpec = swaggerJsdoc(options);
