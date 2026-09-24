import { Queue } from 'bullmq';
import { mockDeep } from 'jest-mock-extended';

import { IMailJob } from '../interfaces/mail-job.interface';
import { MailerService } from '../mailer.service';

describe('MailerService', () => {
  let queue: ReturnType<typeof mockDeep<Queue<IMailJob>>>;
  let service: MailerService;

  beforeEach(() => {
    queue = mockDeep<Queue<IMailJob>>();
    service = new MailerService(queue);
  });

  describe('enqueue', () => {
    it('adds a "send" job to the mail queue with the given payload', async () => {
      const job: IMailJob = {
        to: 'user@example.com',
        subject: 'Welcome',
        template: 'welcome',
        context: { name: 'User' },
      };

      await service.enqueue(job);

      expect(queue.add).toHaveBeenCalledWith('send', job);
    });
  });
});
