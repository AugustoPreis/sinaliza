import { mockDeep } from 'jest-mock-extended';

import { UsersRepository } from '@modules/users/repositories/users.repository';

import { EDevicePlatform } from '../../enums/device-platform.enum';
import { DeviceTokensRepository } from '../../repositories/device-tokens.repository';
import { RegisterDeviceTokenUseCase } from '../register-device-token.use-case';

describe('RegisterDeviceTokenUseCase', () => {
  const deviceTokensRepository = mockDeep<DeviceTokensRepository>();
  const usersRepository = mockDeep<UsersRepository>();
  const useCase = new RegisterDeviceTokenUseCase(deviceTokensRepository, usersRepository);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('upserts the token for the resolved user', async () => {
    usersRepository.findByUuid.mockResolvedValue({ id: 3, uuid: 'usr-1' } as never);

    const result = await useCase.execute('usr-1', {
      token: 'tok',
      platform: EDevicePlatform.ANDROID,
    });

    expect(deviceTokensRepository.upsert).toHaveBeenCalledWith(3, 'tok', EDevicePlatform.ANDROID);
    expect(result).toEqual({ success: true });
  });

  it('throws when the user cannot be resolved', async () => {
    usersRepository.findByUuid.mockResolvedValue(null);

    await expect(
      useCase.execute('missing', { token: 'tok', platform: EDevicePlatform.IOS }),
    ).rejects.toMatchObject({ i18nKey: 'users.errors.notFound' });
  });
});
