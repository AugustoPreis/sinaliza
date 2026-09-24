import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { mockDeep } from 'jest-mock-extended';

import { IMailJob } from '../interfaces/mail-job.interface';
import { MailTemplateService } from '../mail-template.service';
import { MailProcessor } from '../mail.processor';
import { MailService } from '../mail.service';

describe('MailProcessor', () => {
  let mailService: ReturnType<typeof mockDeep<MailService>>;
  let templateService: ReturnType<typeof mockDeep<MailTemplateService>>;
  let processor: MailProcessor;

  beforeEach(() => {
    mailService = mockDeep<MailService>();
    templateService = mockDeep<MailTemplateService>();
    processor = new MailProcessor(mailService, templateService);
  });

  describe('process', () => {
    it('renders the template and then sends the mail, in that order', async () => {
      const callOrder: string[] = [];
      templateService.render.mockImplementation(() => {
        callOrder.push('render');
        return '<p>Hello</p>';
      });
      mailService.send.mockImplementation(() => {
        callOrder.push('send');
        return Promise.resolve();
      });

      const job = mockDeep<Job<IMailJob>>();
      job.data = {
        to: 'user@example.com',
        subject: 'Welcome',
        template: 'welcome',
        context: { name: 'User' },
      };

      await processor.process(job);

      expect(templateService.render).toHaveBeenCalledWith('welcome', { name: 'User' });
      expect(mailService.send).toHaveBeenCalledWith({
        to: 'user@example.com',
        subject: 'Welcome',
        html: '<p>Hello</p>',
      });
      expect(callOrder).toEqual(['render', 'send']);
    });
  });

  describe('onFailed', () => {
    it('logs the failure with the job details and error stack', () => {
      const errorSpy = jest.spyOn(Logger.prototype, 'error').mockImplementation();

      const job = mockDeep<Job<IMailJob>>();
      job.data = {
        to: 'user@example.com',
        subject: 'Welcome',
        template: 'welcome',
        context: {},
      };
      job.attemptsMade = 3;
      const error = new Error('SMTP timeout');

      processor.onFailed(job, error);

      expect(errorSpy).toHaveBeenCalledWith(
        'Failed to send "welcome" mail to user@example.com after 3 attempt(s)',
        error.stack,
      );

      errorSpy.mockRestore();
    });
  });
});
