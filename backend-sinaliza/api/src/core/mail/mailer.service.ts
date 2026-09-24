import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { Queue } from 'bullmq';

import { IMailJob } from './interfaces/mail-job.interface';
import { MAIL_QUEUE_NAME } from './mail.constants';

@Injectable()
export class MailerService {
  constructor(@InjectQueue(MAIL_QUEUE_NAME) private readonly queue: Queue<IMailJob>) {}

  async enqueue(job: IMailJob): Promise<void> {
    await this.queue.add('send', job);
  }
}
