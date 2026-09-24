import { ConfigService } from '@nestjs/config';
import { Response } from 'express';
import { DeepMockProxy, mockDeep } from 'jest-mock-extended';

import { XSRF_COOKIE_NAME } from '@shared/guards/csrf.guard';

import { ILoginResult } from '../../interfaces/login-result.interface';
import {
  ACCESS_TOKEN_COOKIE,
  clearAuthCookies,
  getRefreshCookiePath,
  REFRESH_TOKEN_COOKIE,
  setAuthCookies,
} from '../auth-cookies.util';

describe('auth-cookies.util', () => {
  let res: DeepMockProxy<Response>;
  let config: DeepMockProxy<ConfigService>;

  const loginResult = {
    accessToken: 'access-token-value',
    refreshToken: 'refresh-token-value',
    accessExpiresInSeconds: 900,
    refreshExpiresInSeconds: 604800,
  } as unknown as ILoginResult;

  const XSRF_TOKEN = 'xsrf-token-value';

  function stubConfig(values: Record<string, boolean | string> = {}): void {
    config.get.mockImplementation(
      (key: string, defaultValue?: unknown) => values[key] ?? defaultValue,
    );
  }

  beforeEach(() => {
    res = mockDeep<Response>();
    config = mockDeep<ConfigService>();
    stubConfig();
  });

  describe('getRefreshCookiePath', () => {
    it('scopes the refresh cookie to the versioned refresh endpoint under the default prefix', () => {
      expect(getRefreshCookiePath(config)).toBe('/api/v1/auth/refresh');
    });

    it('honours a custom api prefix', () => {
      stubConfig({ 'app.prefix': 'backend' });

      expect(getRefreshCookiePath(config)).toBe('/backend/v1/auth/refresh');
    });
  });

  describe('setAuthCookies', () => {
    it('sets the access token as httpOnly, site-wide, expiring with the access token', () => {
      setAuthCookies(res, config, loginResult, XSRF_TOKEN);

      expect(res.cookie).toHaveBeenCalledWith(ACCESS_TOKEN_COOKIE, loginResult.accessToken, {
        httpOnly: true,
        secure: false,
        sameSite: 'lax',
        path: '/',
        maxAge: loginResult.accessExpiresInSeconds * 1000,
      });
    });

    it('sets the refresh token as httpOnly, restricted to the refresh endpoint path, expiring with the refresh token', () => {
      setAuthCookies(res, config, loginResult, XSRF_TOKEN);

      expect(res.cookie).toHaveBeenCalledWith(REFRESH_TOKEN_COOKIE, loginResult.refreshToken, {
        httpOnly: true,
        secure: false,
        sameSite: 'lax',
        path: '/api/v1/auth/refresh',
        maxAge: loginResult.refreshExpiresInSeconds * 1000,
      });
    });

    it('sets the XSRF cookie as readable by the frontend (not httpOnly), site-wide', () => {
      setAuthCookies(res, config, loginResult, XSRF_TOKEN);

      expect(res.cookie).toHaveBeenCalledWith(XSRF_COOKIE_NAME, XSRF_TOKEN, {
        httpOnly: false,
        secure: false,
        sameSite: 'lax',
        path: '/',
        maxAge: loginResult.refreshExpiresInSeconds * 1000,
      });
    });

    it('marks every cookie secure when the config enables it', () => {
      stubConfig({ 'auth.cookieSecure': true });

      setAuthCookies(res, config, loginResult, XSRF_TOKEN);

      // `res.cookie` is overloaded (name, val) | (name, val, options); the mock's inferred
      // tuple type collapses to the narrowest overload, so it's widened here to read the
      // options argument every call in this suite actually passes.
      const calls = res.cookie.mock.calls as unknown as Array<
        [string, string, Record<string, unknown>]
      >;

      expect(calls).toHaveLength(3);
      for (const [, , options] of calls) {
        expect(options).toMatchObject({ secure: true });
      }
    });
  });

  describe('clearAuthCookies', () => {
    it('clears the access token cookie with matching attributes but no maxAge', () => {
      clearAuthCookies(res, config);

      expect(res.clearCookie).toHaveBeenCalledWith(ACCESS_TOKEN_COOKIE, {
        path: '/',
        httpOnly: true,
        secure: false,
        sameSite: 'lax',
      });
    });

    it('clears the refresh token cookie using the same restricted path it was set with', () => {
      clearAuthCookies(res, config);

      expect(res.clearCookie).toHaveBeenCalledWith(REFRESH_TOKEN_COOKIE, {
        path: '/api/v1/auth/refresh',
        httpOnly: true,
        secure: false,
        sameSite: 'lax',
      });
    });

    it('clears the XSRF cookie (not httpOnly), site-wide', () => {
      clearAuthCookies(res, config);

      expect(res.clearCookie).toHaveBeenCalledWith(XSRF_COOKIE_NAME, {
        path: '/',
        secure: false,
        sameSite: 'lax',
      });
    });

    it('honours the secure config flag when clearing', () => {
      stubConfig({ 'auth.cookieSecure': true });

      clearAuthCookies(res, config);

      const calls = res.clearCookie.mock.calls;

      expect(calls).toHaveLength(3);
      for (const [, options] of calls) {
        expect(options).toMatchObject({ secure: true });
      }
    });
  });
});
