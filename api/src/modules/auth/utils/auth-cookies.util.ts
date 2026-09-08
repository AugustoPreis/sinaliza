import { ConfigService } from '@nestjs/config';
import { Response } from 'express';

import { XSRF_COOKIE_NAME } from '@shared/guards/csrf.guard';

import { ILoginResult } from '../interfaces/login-result.interface';

export const ACCESS_TOKEN_COOKIE = 'access_token';
export const REFRESH_TOKEN_COOKIE = 'refresh_token';

// Refresh cookie restricted to the refresh endpoint path, to reduce the risk of CSRF attacks.
// The access token cookie is available to all paths, but it is httpOnly and cannot be read by the frontend.
export function getRefreshCookiePath(config: ConfigService): string {
  const prefix = config.get<string>('app.prefix', 'api');

  return `/${prefix}/v1/auth/refresh`;
}

export function setAuthCookies(
  res: Response,
  config: ConfigService,
  result: ILoginResult,
  xsrfToken: string,
): void {
  const secure = config.get<boolean>('auth.cookieSecure', false);

  res.cookie(ACCESS_TOKEN_COOKIE, result.accessToken, {
    httpOnly: true,
    secure,
    sameSite: 'lax',
    path: '/',
    maxAge: result.accessExpiresInSeconds * 1000,
  });

  res.cookie(REFRESH_TOKEN_COOKIE, result.refreshToken, {
    httpOnly: true,
    secure,
    sameSite: 'lax',
    path: getRefreshCookiePath(config),
    maxAge: result.refreshExpiresInSeconds * 1000,
  });

  // Not httpOnly on purpose: the frontend reads this value to echo in the header
  // X-XSRF-TOKEN (double-submit). Never contains session information.
  res.cookie(XSRF_COOKIE_NAME, xsrfToken, {
    httpOnly: false,
    secure,
    sameSite: 'lax',
    path: '/',
    maxAge: result.refreshExpiresInSeconds * 1000,
  });
}

export function clearAuthCookies(res: Response, config: ConfigService): void {
  const secure = config.get<boolean>('auth.cookieSecure', false);

  res.clearCookie(ACCESS_TOKEN_COOKIE, { path: '/', httpOnly: true, secure, sameSite: 'lax' });
  res.clearCookie(REFRESH_TOKEN_COOKIE, {
    path: getRefreshCookiePath(config),
    httpOnly: true,
    secure,
    sameSite: 'lax',
  });
  res.clearCookie(XSRF_COOKIE_NAME, { path: '/', secure, sameSite: 'lax' });
}
