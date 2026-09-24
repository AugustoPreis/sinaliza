import { HttpStatus, Injectable } from '@nestjs/common';

import { AppException } from '@shared/exceptions';

import { UserAccessResponseDTO } from '../dtos/user-access-response.dto';
import { EUserStatus } from '../enums/user-status.enum';
import { UsersRepository } from '../repositories/users.repository';

@Injectable()
export class RestoreUserAccessUseCase {
  constructor(private readonly usersRepository: UsersRepository) {}

  async execute(uuid: string): Promise<UserAccessResponseDTO> {
    const user = await this.usersRepository.findByUuid(uuid);

    if (!user) {
      throw AppException.from('users.errors.notFound', HttpStatus.NOT_FOUND);
    }

    const updated = await this.usersRepository.update(user.id, { status: EUserStatus.ACTIVE });

    return UserAccessResponseDTO.from(updated);
  }
}
