import { registerAs } from '@nestjs/config';

export default registerAs('auth', () => ({
  jwtSecret: process.env.JWT_SECRET || 'change-me-in-production',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '15m',
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET || 'refresh-change-me-in-production',
  jwtRefreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  passwordResetSecret:
    process.env.PASSWORD_RESET_SECRET || 'password-reset-change-me-in-production',
  passwordResetExpiresIn: process.env.PASSWORD_RESET_EXPIRES_IN || '30m',
  bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS || '12', 10),
  cookieSecure: process.env.COOKIE_SECURE === 'true',
}));
