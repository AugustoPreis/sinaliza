import { validateConfig } from '../config.validation';

const LONG_SECRET = 'a'.repeat(32);
const SHORT_SECRET = 'a'.repeat(31);

function buildConfig(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    NODE_ENV: 'development',
    PORT: '3000',
    BCRYPT_ROUNDS: '12',
    DB_POOL_SIZE: '10',
    ...overrides,
  };
}

function buildProductionConfig(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return buildConfig({
    NODE_ENV: 'production',
    JWT_SECRET: LONG_SECRET,
    JWT_REFRESH_SECRET: LONG_SECRET,
    PASSWORD_RESET_SECRET: LONG_SECRET,
    COOKIE_SECURE: 'true',
    S3_ACCESS_KEY_ID: 'access-key',
    S3_SECRET_ACCESS_KEY: 'secret-key',
    S3_BUCKET: 'my-bucket',
    ...overrides,
  });
}

describe('validateConfig', () => {
  describe('success case', () => {
    it('returns the same config object when every rule passes', () => {
      const config = buildConfig();

      expect(validateConfig(config)).toBe(config);
    });

    it('returns the same config object when every production rule passes', () => {
      const config = buildProductionConfig();

      expect(validateConfig(config)).toBe(config);
    });
  });

  describe('PORT', () => {
    it.each([
      ['1023', 'below the minimum'],
      ['65536', 'above the maximum'],
      ['not-a-number', 'not numeric'],
    ])('throws when PORT is %s (%s)', (port) => {
      expect(() => validateConfig(buildConfig({ PORT: port }))).toThrow(
        'PORT must be a number between 1024 and 65535',
      );
    });

    it.each(['1024', '65535', '3000'])('accepts PORT %s within range', (port) => {
      expect(() => validateConfig(buildConfig({ PORT: port }))).not.toThrow();
    });

    it('defaults to 3000 when PORT is not set', () => {
      const config = buildConfig();
      delete config.PORT;

      expect(() => validateConfig(config)).not.toThrow();
    });
  });

  describe('production-only secret length rules', () => {
    it.each(['JWT_SECRET', 'JWT_REFRESH_SECRET', 'PASSWORD_RESET_SECRET'])(
      'throws when %s has fewer than 32 characters in production',
      (key) => {
        expect(() => validateConfig(buildProductionConfig({ [key]: SHORT_SECRET }))).toThrow(
          `${key} must have at least 32 characters in production`,
        );
      },
    );

    it.each(['JWT_SECRET', 'JWT_REFRESH_SECRET', 'PASSWORD_RESET_SECRET'])(
      'throws when %s is missing in production',
      (key) => {
        const config = buildProductionConfig();
        delete config[key];

        expect(() => validateConfig(config)).toThrow(
          `${key} must have at least 32 characters in production`,
        );
      },
    );

    it.each(['JWT_SECRET', 'JWT_REFRESH_SECRET', 'PASSWORD_RESET_SECRET'])(
      'does not enforce %s length outside production',
      (key) => {
        expect(() =>
          validateConfig(buildConfig({ NODE_ENV: 'development', [key]: SHORT_SECRET })),
        ).not.toThrow();
      },
    );
  });

  describe('COOKIE_SECURE', () => {
    it('throws when COOKIE_SECURE is not "true" in production', () => {
      expect(() => validateConfig(buildProductionConfig({ COOKIE_SECURE: 'false' }))).toThrow(
        'COOKIE_SECURE must be "true" in production (cookies require HTTPS)',
      );
    });

    it('throws when COOKIE_SECURE is missing in production', () => {
      const config = buildProductionConfig();
      delete config.COOKIE_SECURE;

      expect(() => validateConfig(config)).toThrow(
        'COOKIE_SECURE must be "true" in production (cookies require HTTPS)',
      );
    });

    it('does not enforce COOKIE_SECURE outside production', () => {
      expect(() =>
        validateConfig(buildConfig({ NODE_ENV: 'development', COOKIE_SECURE: 'false' })),
      ).not.toThrow();
    });
  });

  describe('S3 credentials required in production', () => {
    it.each(['S3_ACCESS_KEY_ID', 'S3_SECRET_ACCESS_KEY', 'S3_BUCKET'])(
      'throws when %s is missing in production',
      (key) => {
        const config = buildProductionConfig();
        delete config[key];

        expect(() => validateConfig(config)).toThrow(`${key} must be set in production`);
      },
    );

    it.each(['S3_ACCESS_KEY_ID', 'S3_SECRET_ACCESS_KEY', 'S3_BUCKET'])(
      'does not require %s outside production',
      (key) => {
        const config = buildConfig({ NODE_ENV: 'development' });
        delete config[key];

        expect(() => validateConfig(config)).not.toThrow();
      },
    );
  });

  describe('BCRYPT_ROUNDS', () => {
    it.each([
      ['9', 'below the minimum'],
      ['15', 'above the maximum'],
      ['not-a-number', 'not numeric'],
    ])('throws when BCRYPT_ROUNDS is %s (%s)', (rounds) => {
      expect(() => validateConfig(buildConfig({ BCRYPT_ROUNDS: rounds }))).toThrow(
        'BCRYPT_ROUNDS must be a number between 10 and 14',
      );
    });

    it.each(['10', '14', '12'])('accepts BCRYPT_ROUNDS %s within range', (rounds) => {
      expect(() => validateConfig(buildConfig({ BCRYPT_ROUNDS: rounds }))).not.toThrow();
    });

    it('defaults to 12 when BCRYPT_ROUNDS is not set', () => {
      const config = buildConfig();
      delete config.BCRYPT_ROUNDS;

      expect(() => validateConfig(config)).not.toThrow();
    });
  });

  describe('DB_POOL_SIZE', () => {
    it.each([
      ['1', 'below the minimum'],
      ['51', 'above the maximum'],
      ['not-a-number', 'not numeric'],
    ])('throws when DB_POOL_SIZE is %s (%s)', (poolSize) => {
      expect(() => validateConfig(buildConfig({ DB_POOL_SIZE: poolSize }))).toThrow(
        'DB_POOL_SIZE must be a number between 2 and 50',
      );
    });

    it.each(['2', '50', '10'])('accepts DB_POOL_SIZE %s within range', (poolSize) => {
      expect(() => validateConfig(buildConfig({ DB_POOL_SIZE: poolSize }))).not.toThrow();
    });

    it('defaults to 10 when DB_POOL_SIZE is not set', () => {
      const config = buildConfig();
      delete config.DB_POOL_SIZE;

      expect(() => validateConfig(config)).not.toThrow();
    });
  });

  it('aggregates every failing rule into a single error message', () => {
    const config = buildProductionConfig({
      PORT: '1',
      JWT_SECRET: SHORT_SECRET,
      BCRYPT_ROUNDS: '1',
      DB_POOL_SIZE: '1',
    });

    expect(() => validateConfig(config)).toThrow(
      /PORT must be a number.*JWT_SECRET must have at least 32 characters.*BCRYPT_ROUNDS must be a number.*DB_POOL_SIZE must be a number/s,
    );
  });
});
