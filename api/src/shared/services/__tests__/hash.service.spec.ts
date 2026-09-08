import { ConfigService } from '@nestjs/config';
import { mockDeep } from 'jest-mock-extended';

import { HashService } from '../hash.service';

describe('HashService', () => {
  let configService: ReturnType<typeof mockDeep<ConfigService>>;
  let service: HashService;

  beforeEach(() => {
    configService = mockDeep<ConfigService>();
    configService.get.mockReturnValue(4);
    service = new HashService(configService);
  });

  it('hashes a plain string into a bcrypt digest', async () => {
    const hashed = await service.hash('s3cr3t');

    expect(hashed).not.toBe('s3cr3t');
    expect(hashed).toMatch(/^\$2[aby]\$/);
  });

  it('round-trips: compare() succeeds for the original plaintext', async () => {
    const hashed = await service.hash('s3cr3t');

    await expect(service.compare('s3cr3t', hashed)).resolves.toBe(true);
  });

  it('round-trips: compare() fails for a wrong plaintext', async () => {
    const hashed = await service.hash('s3cr3t');

    await expect(service.compare('wrong-password', hashed)).resolves.toBe(false);
  });

  it('reads the salt rounds from auth.bcryptRounds with a default of 12', () => {
    expect(configService.get).toHaveBeenCalledWith('auth.bcryptRounds', 12);
  });
});
