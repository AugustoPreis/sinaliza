import { HttpStatus, Injectable } from '@nestjs/common';

import { AppException } from '@shared/exceptions';

import { UserResponseDTO } from '../dtos/user-response.dto';
import { UsersRepository } from '../repositories/users.repository';

@Injectable()
export class FindUserUseCase {
  constructor(private readonly usersRepository: UsersRepository) {}

  async execute(uuid: string): Promise<UserResponseDTO> {
    const user = await this.usersRepository.findByUuid(uuid);

    if (!user) {
      throw AppException.from('users.errors.notFound', HttpStatus.NOT_FOUND);
    }

    return UserResponseDTO.from(user);
  }
}
