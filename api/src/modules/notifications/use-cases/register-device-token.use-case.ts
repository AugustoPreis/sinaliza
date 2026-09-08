import { HttpStatus, Injectable } from '@nestjs/common';

import { AppException } from '@shared/exceptions';

import { UsersRepository } from '@modules/users/repositories/users.repository';

import { RegisterDeviceTokenDTO } from '../dtos/register-device-token.dto';
import { DeviceTokensRepository } from '../repositories/device-tokens.repository';

// `POST /devices/push-token` (endpoints-sinaliza.md §4.1).
@Injectable()
export class RegisterDeviceTokenUseCase {
  constructor(
    private readonly deviceTokensRepository: DeviceTokensRepository,
    private readonly usersRepository: UsersRepository,
  ) {}

  async execute(currentUserUuid: string, dto: RegisterDeviceTokenDTO): Promise<{ success: true }> {
    const user = await this.usersRepository.findByUuid(currentUserUuid);

    if (!user) {
      throw AppException.from('users.errors.notFound', HttpStatus.NOT_FOUND);
    }

    await this.deviceTokensRepository.upsert(user.id, dto.token, dto.platform);

    return { success: true };
  }
}
