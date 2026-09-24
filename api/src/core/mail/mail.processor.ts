import { OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';

import { IMailJob } from './interfaces/mail-job.interface';
import { MailTemplateService } from './mail-template.service';
import { MAIL_QUEUE_NAME } from './mail.constants';
import { MailService } from './mail.service';

@Processor(MAIL_QUEUE_NAME)
export class MailProcessor extends WorkerHost {
  private readonly logger = new Logger(MailProcessor.name);

  constructor(
    private readonly mailService: MailService,
    private readonly templateService: MailTemplateService,
  ) {
    super();
  }

  async process(job: Job<IMailJob>): Promise<void> {
    const html = this.templateService.render(job.data.template, job.data.context);

    await this.mailService.send({
      to: job.data.to,
      subject: job.data.subject,
      html,
    });

    this.logger.log(`Sent "${job.data.template}" mail to ${job.data.to}`);
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job<IMailJob>, error: Error): void {
    this.logger.error(
      `Failed to send "${job.data.template}" mail to ${job.data.to} after ${job.attemptsMade} attempt(s)`,
      error.stack,
    );
  }
}
