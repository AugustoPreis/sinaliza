import { createHash } from 'crypto';

import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import Redis from 'ioredis';

import { REDIS_CLIENT } from '@core/redis/redis.constants';

import { AppException } from '@shared/exceptions';
import { HashService } from '@shared/services/hash.service';

import { UsersRepository } from '../../users/repositories/users.repository';
import { ResetPasswordDTO } from '../dtos/reset-password.dto';
import { getPasswordResetRedisKey, getRefreshTokenRedisKey } from '../utils/redis-keys.util';

@Injectable()
export class ResetPasswordUseCase {
  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly hashService: HashService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
  ) {}

  async execute(dto: ResetPasswordDTO): Promise<void> {
    this.ensurePasswordsMatch(dto);

    const payload = this.verifyToken(dto.token);
    const storedHash = await this.getStoredHash(payload.sub);

    this.validateTokenHash(dto.token, storedHash);

    const user = await this.usersRepository.findByUuid(payload.sub);

    if (!user) {
      throw AppException.from('users.errors.notFound', HttpStatus.NOT_FOUND);
    }

    await this.usersRepository.update(user.id, {
      passwordHash: await this.hashService.hash(dto.newPassword),
    });

    // The reset token is single-use, and any session that predates the
    // reset is revoked too: the whole point of resetting is that it may
    // have been someone else who was logged in.
    await this.redis.del(getPasswordResetRedisKey(payload.sub));
    await this.redis.del(getRefreshTokenRedisKey(payload.sub));
  }

  private ensurePasswordsMatch(dto: ResetPasswordDTO): void {
    if (dto.newPassword !== dto.confirmNewPassword) {
      throw AppException.from('users.errors.passwordsMustMatch', HttpStatus.BAD_REQUEST);
    }
  }

  private verifyToken(token: string): { sub: string } {
    try {
      return this.jwtService.verify<{ sub: string }>(token, {
        secret: this.config.get<string>('auth.passwordResetSecret'),
      });
    } catch {
      throw AppException.from('auth.errors.passwordResetTokenInvalid', HttpStatus.UNAUTHORIZED);
    }
  }

  private async getStoredHash(sub: string): Promise<string> {
    const storedHash = await this.redis.get(getPasswordResetRedisKey(sub));

    if (!storedHash) {
      throw AppException.from('auth.errors.passwordResetTokenInvalid', HttpStatus.UNAUTHORIZED);
    }

    return storedHash;
  }

  private validateTokenHash(token: string, storedHash: string): void {
    const incomingHash = createHash('sha256').update(token).digest('hex');

    if (storedHash !== incomingHash) {
      throw AppException.from('auth.errors.passwordResetTokenInvalid', HttpStatus.UNAUTHORIZED);
    }
  }
}
