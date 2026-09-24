import { HttpStatus, Injectable } from '@nestjs/common';

import { AppException } from '@shared/exceptions';

import { UsersRepository } from '@modules/users/repositories/users.repository';

import { RemoveDeviceTokenDTO } from '../dtos/remove-device-token.dto';
import { DeviceTokensRepository } from '../repositories/device-tokens.repository';

@Injectable()
export class RemoveDeviceTokenUseCase {
  constructor(
    private readonly deviceTokensRepository: DeviceTokensRepository,
    private readonly usersRepository: UsersRepository,
  ) {}

  async execute(currentUserUuid: string, dto: RemoveDeviceTokenDTO): Promise<{ success: true }> {
    const user = await this.usersRepository.findByUuid(currentUserUuid);

    if (!user) {
      throw AppException.from('users.errors.notFound', HttpStatus.NOT_FOUND);
    }

    await this.deviceTokensRepository.remove(user.id, dto.token);

    return { success: true };
  }
}
