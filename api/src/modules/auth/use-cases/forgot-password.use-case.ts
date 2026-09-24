import { createHash } from 'crypto';

import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import Redis from 'ioredis';
import { I18nService } from 'nestjs-i18n';

import { MailerService } from '@core/mail/mailer.service';
import { REDIS_CLIENT } from '@core/redis/redis.constants';

import { TimeUnitHelper } from '@shared/helpers';

import { EUserStatus } from '../../users/enums/user-status.enum';
import { UsersRepository } from '../../users/repositories/users.repository';
import { getPasswordResetRedisKey } from '../utils/redis-keys.util';

@Injectable()
export class ForgotPasswordUseCase {
  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly mailerService: MailerService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
    private readonly i18n: I18nService,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
  ) {}

  async execute(email: string, locale: string): Promise<void> {
    const user = await this.usersRepository.findByEmail(email.toLowerCase());

    // Same response regardless of whether the e-mail is registered, so this
    // endpoint never reveals which addresses exist in the system.
    if (!user || user.status !== EUserStatus.ACTIVE) {
      return;
    }

    const expiresInSeconds = TimeUnitHelper.durationToSeconds(
      this.config.get<string>('auth.passwordResetExpiresIn', '30m'),
    );

    const token = this.jwtService.sign(
      { sub: user.uuid },
      {
        secret: this.config.get<string>('auth.passwordResetSecret'),
        expiresIn: expiresInSeconds,
      },
    );

    const hash = createHash('sha256').update(token).digest('hex');

    await this.redis.set(getPasswordResetRedisKey(user.uuid), hash, 'EX', expiresInSeconds);

    const resetUrl = `${this.config.get<string>('app.frontendUrl')}/reset-password?token=${token}`;

    await this.mailerService.enqueue({
      to: user.email,
      subject: this.i18n.translate('auth.mail.passwordReset.subject', { lang: locale }),
      template: 'password-reset',
      context: {
        appName: this.config.get<string>('app.name'),
        locale,
        greeting: this.i18n.translate('auth.mail.passwordReset.greeting', {
          lang: locale,
          args: { name: user.name },
        }),
        body: this.i18n.translate('auth.mail.passwordReset.body', { lang: locale }),
        resetUrl,
        buttonLabel: this.i18n.translate('auth.mail.passwordReset.button', { lang: locale }),
        linkFallback: this.i18n.translate('auth.mail.passwordReset.linkFallback', { lang: locale }),
        footer: this.i18n.translate('auth.mail.passwordReset.footer', { lang: locale }),
        disclaimer: this.i18n.translate('common.mail.disclaimer', { lang: locale }),
      },
    });
  }
}
