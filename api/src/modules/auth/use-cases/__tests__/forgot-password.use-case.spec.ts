import { createHash } from 'crypto';

import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import Redis from 'ioredis';
import { DeepMockProxy, mockDeep } from 'jest-mock-extended';
import { I18nService } from 'nestjs-i18n';

import { MailerService } from '@core/mail/mailer.service';

import { UserEntity } from '../../../users/entities/user.entity';
import { EUserStatus } from '../../../users/enums/user-status.enum';
import { UsersRepository } from '../../../users/repositories/users.repository';
import { getPasswordResetRedisKey } from '../../utils/redis-keys.util';
import { ForgotPasswordUseCase } from '../forgot-password.use-case';

describe('ForgotPasswordUseCase', () => {
  let useCase: ForgotPasswordUseCase;
  let usersRepository: DeepMockProxy<UsersRepository>;
  let mailerService: DeepMockProxy<MailerService>;
  let jwtService: DeepMockProxy<JwtService>;
  let config: DeepMockProxy<ConfigService>;
  let i18n: DeepMockProxy<I18nService>;
  let redis: DeepMockProxy<Redis>;

  const LOCALE = 'en';
  const EMAIL = 'user@example.com';

  const activeUser = {
    id: 1,
    uuid: 'user-uuid',
    email: EMAIL,
    name: 'Jane Doe',
    status: EUserStatus.ACTIVE,
  } as unknown as UserEntity;

  const configValues: Record<string, string> = {
    'auth.passwordResetExpiresIn': '30m',
    'auth.passwordResetSecret': 'reset-secret',
    'app.frontendUrl': 'https://app.example.com',
    'app.name': 'Boilerplate',
  };

  beforeEach(() => {
    usersRepository = mockDeep<UsersRepository>();
    mailerService = mockDeep<MailerService>();
    jwtService = mockDeep<JwtService>();
    config = mockDeep<ConfigService>();
    i18n = mockDeep<I18nService>();
    redis = mockDeep<Redis>();

    useCase = new ForgotPasswordUseCase(
      usersRepository,
      mailerService,
      jwtService,
      config,
      i18n,
      redis,
    );

    config.get.mockImplementation(
      (key: string, defaultValue?: unknown) => configValues[key] ?? defaultValue,
    );
    usersRepository.findByEmail.mockResolvedValue(activeUser);
    jwtService.sign.mockReturnValue('signed-reset-token');
    i18n.translate.mockReturnValue('translated');
  });

  it('does nothing when the e-mail is not registered, to avoid leaking which addresses exist', async () => {
    usersRepository.findByEmail.mockResolvedValue(null);

    await useCase.execute(EMAIL, LOCALE);

    expect(jwtService.sign).not.toHaveBeenCalled();
    expect(redis.set).not.toHaveBeenCalled();
    expect(mailerService.enqueue).not.toHaveBeenCalled();
  });

  it('does nothing when the user is not active', async () => {
    usersRepository.findByEmail.mockResolvedValue({
      ...activeUser,
      status: EUserStatus.INACTIVE,
    });

    await useCase.execute(EMAIL, LOCALE);

    expect(jwtService.sign).not.toHaveBeenCalled();
    expect(mailerService.enqueue).not.toHaveBeenCalled();
  });

  it('looks up the user by lowercased e-mail', async () => {
    await useCase.execute('User@Example.com', LOCALE);

    expect(usersRepository.findByEmail).toHaveBeenCalledWith(EMAIL);
  });

  it('signs a password-reset token scoped to its own secret and expiry', async () => {
    await useCase.execute(EMAIL, LOCALE);

    expect(jwtService.sign).toHaveBeenCalledWith(
      { sub: activeUser.uuid },
      { secret: 'reset-secret', expiresIn: 1800 },
    );
  });

  it('stores the sha256 hash of the token in redis under the password-reset key', async () => {
    await useCase.execute(EMAIL, LOCALE);

    const expectedHash = createHash('sha256').update('signed-reset-token').digest('hex');

    expect(redis.set).toHaveBeenCalledWith(
      getPasswordResetRedisKey(activeUser.uuid),
      expectedHash,
      'EX',
      1800,
    );
  });

  it('enqueues a password-reset e-mail with the reset URL and translated content', async () => {
    await useCase.execute(EMAIL, LOCALE);

    expect(mailerService.enqueue).toHaveBeenCalledWith(
      expect.objectContaining({
        to: activeUser.email,
        template: 'password-reset',
        context: expect.objectContaining({
          resetUrl: 'https://app.example.com/reset-password?token=signed-reset-token',
          locale: LOCALE,
        }),
      }),
    );
  });
});
