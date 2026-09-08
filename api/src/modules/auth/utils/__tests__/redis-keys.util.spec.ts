import { getPasswordResetRedisKey, getRefreshTokenRedisKey } from '../redis-keys.util';

describe('redis-keys.util', () => {
  describe('getRefreshTokenRedisKey', () => {
    it('namespaces the refresh-token session key by user uuid', () => {
      expect(getRefreshTokenRedisKey('user-uuid')).toBe('auth:refresh:user-uuid');
    });
  });

  describe('getPasswordResetRedisKey', () => {
    it('namespaces the password-reset key by user uuid', () => {
      expect(getPasswordResetRedisKey('user-uuid')).toBe('auth:password-reset:user-uuid');
    });
  });

  it('keeps the two namespaces distinct for the same user', () => {
    const uuid = 'same-uuid';

    expect(getRefreshTokenRedisKey(uuid)).not.toBe(getPasswordResetRedisKey(uuid));
  });
});
