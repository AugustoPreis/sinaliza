import Redis from 'ioredis';
import { DeepMockProxy, mockDeep } from 'jest-mock-extended';

import { getRefreshTokenRedisKey } from '../../utils/redis-keys.util';
import { LogoutUseCase } from '../logout.use-case';

describe('LogoutUseCase', () => {
  let useCase: LogoutUseCase;
  let redis: DeepMockProxy<Redis>;

  beforeEach(() => {
    redis = mockDeep<Redis>();
    useCase = new LogoutUseCase(redis);
  });

  it('revokes the session by deleting the stored refresh-token hash for that user', async () => {
    const result = await useCase.execute('user-uuid');

    expect(redis.del).toHaveBeenCalledWith(getRefreshTokenRedisKey('user-uuid'));
    expect(redis.del).toHaveBeenCalledTimes(1);
    expect(result).toBeUndefined();
  });

  it('scopes the deletion to the given user only', async () => {
    await useCase.execute('another-user-uuid');

    expect(redis.del).toHaveBeenCalledWith('auth:refresh:another-user-uuid');
  });
});
