import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Request } from 'express';
import Redis from 'ioredis';
import { Strategy } from 'passport-local';

import { REDIS_CLIENT } from '@core/redis/redis.constants';

import { LOCAL_STRATEGY } from '@shared/constants';
import { AppException } from '@shared/exceptions';
import { HashService } from '@shared/services/hash.service';

import { RoleSummaryDTO } from '../../users/dtos/role-summary.dto';
import { EUserStatus } from '../../users/enums/user-status.enum';
import { UsersRepository } from '../../users/repositories/users.repository';
import { getEffectivePermissions } from '../../users/utils/effective-permissions.util';
import { IAuthUser } from '../interfaces/auth-user.interface';

const MAX_ATTEMPTS = 5;
const BLOCK_TTL_SECONDS = 15 * 60;

@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy, LOCAL_STRATEGY) {
  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly hashService: HashService,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
  ) {
    super({ usernameField: 'identifier', passReqToCallback: true });
  }

  async validate(req: Request, identifier: string, password: string): Promise<IAuthUser> {
    const ip = this.getClientIp(req);

    await this.ensureIpIsNotBlocked(ip);

    const user = await this.usersRepository.findByIdentifierWithPassword(identifier.toLowerCase());
    const isValid = await this.validateCredentials(user, password);

    if (!user || !isValid) {
      await this.registerFailedAttempt(ip);

      throw AppException.from('auth.errors.invalidCredentials', HttpStatus.UNAUTHORIZED);
    }

    await this.clearAttempts(ip);

    return {
      id: user.id,
      uuid: user.uuid,
      email: user.email,
      name: user.name,
      institutionalLink: user.institutionalLink,
      status: user.status,
      roles: user.userRoles.map((ur) => RoleSummaryDTO.from(ur.role)),
      permissions: getEffectivePermissions(user.userRoles),
    };
  }

  private getClientIp(req: Request): string {
    return (req.ip ?? req.socket.remoteAddress ?? 'unknown').replace(/^::ffff:/, '');
  }

  private getRateLimitKey(ip: string): string {
    return `auth:login:attempts:${ip}`;
  }

  private async ensureIpIsNotBlocked(ip: string): Promise<void> {
    const attempts = await this.redis.get(this.getRateLimitKey(ip));

    if (attempts && Number(attempts) >= MAX_ATTEMPTS) {
      throw AppException.from('auth.errors.tooManyAttempts', HttpStatus.TOO_MANY_REQUESTS);
    }
  }

  private async registerFailedAttempt(ip: string): Promise<void> {
    const key = this.getRateLimitKey(ip);

    await this.redis.multi().incr(key).expire(key, BLOCK_TTL_SECONDS).exec();
  }

  private async clearAttempts(ip: string): Promise<void> {
    await this.redis.del(this.getRateLimitKey(ip));
  }

  private async validateCredentials(
    user: Awaited<ReturnType<UsersRepository['findByIdentifierWithPassword']>>,
    password: string,
  ): Promise<boolean> {
    if (!user) {
      return false;
    }

    const passwordMatch = await this.hashService.compare(password, user.passwordHash);

    return passwordMatch && user.status === EUserStatus.ACTIVE;
  }
}
