import { ConfigService } from '@nestjs/config';
import { DeepMockProxy, mockDeep } from 'jest-mock-extended';

import { IJwtPayload } from '../../interfaces/jwt-payload.interface';
import { JwtStrategy } from '../jwt.strategy';

describe('JwtStrategy', () => {
  let strategy: JwtStrategy;
  let config: DeepMockProxy<ConfigService>;

  beforeEach(() => {
    config = mockDeep<ConfigService>();
    config.get.mockReturnValue('access-secret');

    strategy = new JwtStrategy(config);
  });

  it('trusts the payload extracted from the already-verified access token cookie', () => {
    const payload: IJwtPayload = { sub: 'user-uuid', email: 'user@example.com' };

    const result = strategy.validate(payload);

    expect(result).toEqual({ sub: 'user-uuid', email: 'user@example.com', uuid: 'user-uuid' });
  });

  it('derives uuid from sub for any payload, without a database lookup', () => {
    const payload: IJwtPayload = { sub: 'another-uuid', email: 'other@example.com' };

    const result = strategy.validate(payload);

    expect(result.uuid).toBe(payload.sub);
  });
});
