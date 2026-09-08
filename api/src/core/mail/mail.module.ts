import { BullModule } from '@nestjs/bullmq';
import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createTransport, Transporter } from 'nodemailer';

import { MailTemplateService } from './mail-template.service';
import { MAIL_QUEUE_NAME, MAIL_TRANSPORTER } from './mail.constants';
import { MailProcessor } from './mail.processor';
import { MailService } from './mail.service';
import { MailerService } from './mailer.service';

const mailTransporterProvider = {
  provide: MAIL_TRANSPORTER,
  inject: [ConfigService],
  useFactory: (config: ConfigService): Transporter =>
    createTransport({
      host: config.get<string>('mail.host'),
      port: config.get<number>('mail.port'),
      secure: config.get<boolean>('mail.secure'),
      auth: config.get<string>('mail.user')
        ? { user: config.get<string>('mail.user'), pass: config.get<string>('mail.password') }
        : undefined,
    }),
};

@Global()
@Module({
  imports: [
    BullModule.registerQueue({
      name: MAIL_QUEUE_NAME,
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
        removeOnComplete: true,
        removeOnFail: 100,
      },
    }),
  ],
  providers: [
    mailTransporterProvider,
    MailService,
    MailTemplateService,
    MailerService,
    MailProcessor,
  ],
  exports: [MailerService],
})
export class MailModule {}
