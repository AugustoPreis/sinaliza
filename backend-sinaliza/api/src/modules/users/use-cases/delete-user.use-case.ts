import { HttpStatus, Injectable } from '@nestjs/common';

import { AppException } from '@shared/exceptions';

import { UsersRepository } from '../repositories/users.repository';

@Injectable()
export class DeleteUserUseCase {
  constructor(private readonly usersRepository: UsersRepository) {}

  async execute(uuid: string): Promise<void> {
    const user = await this.usersRepository.findByUuid(uuid);

    if (!user) {
      throw AppException.from('users.errors.notFound', HttpStatus.NOT_FOUND);
    }

    await this.usersRepository.softDelete(user.id);
  }
}
