import { Cache } from 'cache-manager';
import { mockDeep } from 'jest-mock-extended';

import { CacheService } from '../cache.service';

describe('CacheService', () => {
  let cacheManager: ReturnType<typeof mockDeep<Cache>>;
  let service: CacheService;

  beforeEach(() => {
    cacheManager = mockDeep<Cache>();
    service = new CacheService(cacheManager);
  });

  describe('get', () => {
    it('delegates to Cache.get with the given key and returns its value', async () => {
      cacheManager.get.mockResolvedValue('cached-value');

      const result = await service.get('user:1');

      expect(cacheManager.get).toHaveBeenCalledWith('user:1');
      expect(result).toBe('cached-value');
    });

    it('returns null when Cache.get resolves to undefined (miss)', async () => {
      cacheManager.get.mockResolvedValue(undefined);

      await expect(service.get('missing-key')).resolves.toBeNull();
    });

    it('returns null when Cache.get rejects', async () => {
      cacheManager.get.mockRejectedValue(new Error('redis down'));

      await expect(service.get('user:1')).resolves.toBeNull();
    });
  });

  describe('set', () => {
    it('delegates to Cache.set with the key, value and ttl', async () => {
      await service.set('user:1', { id: 1 }, 60);

      expect(cacheManager.set).toHaveBeenCalledWith('user:1', { id: 1 }, 60);
    });

    it('swallows errors thrown by Cache.set', async () => {
      cacheManager.set.mockRejectedValue(new Error('redis down'));

      await expect(service.set('user:1', { id: 1 })).resolves.toBeUndefined();
    });
  });

  describe('del', () => {
    it('delegates to Cache.del with the given key', async () => {
      await service.del('user:1');

      expect(cacheManager.del).toHaveBeenCalledWith('user:1');
    });

    it('swallows errors thrown by Cache.del', async () => {
      cacheManager.del.mockRejectedValue(new Error('redis down'));

      await expect(service.del('user:1')).resolves.toBeUndefined();
    });
  });
});
