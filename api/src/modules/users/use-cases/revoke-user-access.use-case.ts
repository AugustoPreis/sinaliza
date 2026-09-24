import { HttpStatus, Injectable } from '@nestjs/common';

import { AppException } from '@shared/exceptions';

import { RevokeUserAccessDTO } from '../dtos/revoke-user-access.dto';
import { UserAccessResponseDTO } from '../dtos/user-access-response.dto';
import { EUserStatus } from '../enums/user-status.enum';
import { UsersRepository } from '../repositories/users.repository';

// RB-13: revoking is never deletion - it only flips `status` to `INACTIVE`.
// The user row, its roles/sectors and any ticket history it's referenced
// from stay untouched.
@Injectable()
export class RevokeUserAccessUseCase {
  constructor(private readonly usersRepository: UsersRepository) {}

  async execute(uuid: string, dto: RevokeUserAccessDTO): Promise<UserAccessResponseDTO> {
    const user = await this.usersRepository.findByUuid(uuid);

    if (!user) {
      throw AppException.from('users.errors.notFound', HttpStatus.NOT_FOUND);
    }

    // `reason` is accepted for audit purposes only; there is no dedicated
    // column for it yet (see the module-level @Audit trail for the status
    // change itself).
    void dto.reason;

    const updated = await this.usersRepository.update(user.id, { status: EUserStatus.INACTIVE });

    return UserAccessResponseDTO.from(updated);
  }
}
