import { mockDeep } from 'jest-mock-extended';

import { UsersRepository } from '@modules/users/repositories/users.repository';

import { DeviceTokensRepository } from '../../repositories/device-tokens.repository';
import { RemoveDeviceTokenUseCase } from '../remove-device-token.use-case';

describe('RemoveDeviceTokenUseCase', () => {
  const deviceTokensRepository = mockDeep<DeviceTokensRepository>();
  const usersRepository = mockDeep<UsersRepository>();
  const useCase = new RemoveDeviceTokenUseCase(deviceTokensRepository, usersRepository);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('removes the token for the resolved user', async () => {
    usersRepository.findByUuid.mockResolvedValue({ id: 3, uuid: 'usr-1' } as never);

    const result = await useCase.execute('usr-1', { token: 'tok' });

    expect(deviceTokensRepository.remove).toHaveBeenCalledWith(3, 'tok');
    expect(result).toEqual({ success: true });
  });

  it('throws when the user cannot be resolved', async () => {
    usersRepository.findByUuid.mockResolvedValue(null);

    await expect(useCase.execute('missing', { token: 'tok' })).rejects.toMatchObject({
      i18nKey: 'users.errors.notFound',
    });
  });
});
