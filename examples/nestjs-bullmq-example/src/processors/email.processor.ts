import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { ContextLogger } from 'nestjs-context-logger';
import { WithContext } from 'nestjs-context-logger';

interface EmailJobData {
  to: string;
  subject: string;
  body: string;
}

@Processor('email-queue')
export class EmailProcessor extends WorkerHost {
  private readonly logger = new ContextLogger(EmailProcessor.name);

  @WithContext((job: Job<EmailJobData>) => ({
    jobId: job.id,
    jobName: job.name,
    queueName: job.queueName,
    emailRecipient: job.data.to,
  }))
  async process(job: Job<EmailJobData>) {
    this.logger.log('Processing email job', {
      jobId: job.id,
      email: job.data.to,
    });

    // Simulate async email sending
    await new Promise(resolve => setTimeout(resolve, 100));

    this.logger.log('Email sent successfully', {
      jobId: job.id,
      email: job.data.to,
    });

    return { success: true };
  }
}

