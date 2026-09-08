import { registerAs } from '@nestjs/config';

export default registerAs('app', () => ({
  name: process.env.APP_NAME || 'Boilerplate',
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3000', 10),
  prefix: process.env.API_PREFIX || 'api',
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
  corsOrigin:
    process.env.CORS_ORIGIN === '*' || !process.env.CORS_ORIGIN
      ? '*'
      : process.env.CORS_ORIGIN.split(',').map((origin) => origin.trim()),
}));
