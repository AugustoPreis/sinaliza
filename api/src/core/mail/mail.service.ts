import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Transporter } from 'nodemailer';

import { MAIL_TRANSPORTER } from './mail.constants';

export interface ISendMailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

@Injectable()
export class MailService {
  constructor(
    @Inject(MAIL_TRANSPORTER) private readonly transporter: Transporter,
    private readonly config: ConfigService,
  ) {}

  async send(options: ISendMailOptions): Promise<void> {
    await this.transporter.sendMail({
      from: this.config.get<string>('mail.from'),
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text,
    });
  }
}
