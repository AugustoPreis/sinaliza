import { ConfigService } from '@nestjs/config';
import { mockDeep } from 'jest-mock-extended';
import { Transporter } from 'nodemailer';

import { MailService } from '../mail.service';

describe('MailService', () => {
  let transporter: ReturnType<typeof mockDeep<Transporter>>;
  let config: ReturnType<typeof mockDeep<ConfigService>>;
  let service: MailService;

  beforeEach(() => {
    transporter = mockDeep<Transporter>();
    config = mockDeep<ConfigService>();
    service = new MailService(transporter, config);
  });

  describe('send', () => {
    it('sends the mail with the "from" address resolved from config', async () => {
      config.get.mockReturnValue('no-reply@example.com');

      await service.send({
        to: 'user@example.com',
        subject: 'Welcome',
        html: '<p>Hi</p>',
        text: 'Hi',
      });

      expect(config.get).toHaveBeenCalledWith('mail.from');
      expect(transporter.sendMail).toHaveBeenCalledWith({
        from: 'no-reply@example.com',
        to: 'user@example.com',
        subject: 'Welcome',
        html: '<p>Hi</p>',
        text: 'Hi',
      });
    });

    it('sends the mail without a text part when none is provided', async () => {
      config.get.mockReturnValue('no-reply@example.com');

      await service.send({
        to: 'user@example.com',
        subject: 'Welcome',
        html: '<p>Hi</p>',
      });

      expect(transporter.sendMail).toHaveBeenCalledWith({
        from: 'no-reply@example.com',
        to: 'user@example.com',
        subject: 'Welcome',
        html: '<p>Hi</p>',
        text: undefined,
      });
    });
  });
});
