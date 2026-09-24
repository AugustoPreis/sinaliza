import { HttpStatus, Injectable } from '@nestjs/common';

import { AppException } from '@shared/exceptions';

import { RoleSummaryDTO } from '../../users/dtos/role-summary.dto';
import { UsersRepository } from '../../users/repositories/users.repository';
import { getEffectivePermissions } from '../../users/utils/effective-permissions.util';
import { MeResponseDTO } from '../dtos/me-response.dto';

@Injectable()
export class GetMeUseCase {
  constructor(private readonly usersRepository: UsersRepository) {}

  async execute(uuid: string): Promise<MeResponseDTO> {
    const user = await this.usersRepository.findByUuid(uuid);

    if (!user) {
      throw AppException.from('users.errors.notFound', HttpStatus.NOT_FOUND);
    }

    return {
      uuid: user.uuid,
      email: user.email,
      name: user.name,
      institutionalLink: user.institutionalLink,
      status: user.status,
      roles: user.userRoles?.map((ur) => RoleSummaryDTO.from(ur.role)) ?? [],
      permissions: getEffectivePermissions(user.userRoles ?? []),
    };
  }
}
