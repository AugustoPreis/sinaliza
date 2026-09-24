import {
  CreateBucketCommand,
  DeleteObjectCommand,
  HeadBucketCommand,
  NotFound,
  PutBucketPolicyCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { S3_CLIENT } from './storage.constants';

@Injectable()
export class StorageService implements OnModuleInit {
  private readonly logger = new Logger(StorageService.name);

  constructor(
    @Inject(S3_CLIENT) private readonly s3: S3Client,
    private readonly config: ConfigService,
  ) {}

  async onModuleInit(): Promise<void> {
    if (!this.config.get<boolean>('storage.autoConfigureBucket')) {
      return;
    }

    await this.ensureBucketExists();
  }

  async upload(key: string, body: Buffer, contentType: string): Promise<string> {
    await this.s3.send(
      new PutObjectCommand({
        Bucket: this.config.get<string>('storage.bucket'),
        Key: key,
        Body: body,
        ContentType: contentType,
      }),
    );

    return this.publicUrl(key);
  }

  async delete(key: string): Promise<void> {
    await this.s3.send(
      new DeleteObjectCommand({
        Bucket: this.config.get<string>('storage.bucket'),
        Key: key,
      }),
    );
  }

  publicUrl(key: string): string {
    const publicUrl = this.config.get<string>('storage.publicUrl');
    const bucket = this.config.get<string>('storage.bucket');

    return `${publicUrl}/${bucket}/${key}`;
  }

  // Only meant for dev (MinIO): in a real AWS S3 setup the bucket and its
  // policy are provisioned by infra/IaC, and the app's IAM role typically
  // doesn't have PutBucketPolicy permission, which is why this is gated by
  // `storage.autoConfigureBucket` (`S3_AUTO_CONFIGURE_BUCKET`), off by
  // default outside of what `.env.example` sets for local development.
  private async ensureBucketExists(): Promise<void> {
    const bucket = this.config.get<string>('storage.bucket');

    try {
      await this.s3.send(new HeadBucketCommand({ Bucket: bucket }));

      return;
    } catch (error) {
      if (!(error instanceof NotFound)) {
        throw error;
      }
    }

    await this.s3.send(new CreateBucketCommand({ Bucket: bucket }));

    await this.s3.send(
      new PutBucketPolicyCommand({
        Bucket: bucket,
        Policy: JSON.stringify({
          Version: '2012-10-17',
          Statement: [
            {
              Effect: 'Allow',
              Principal: '*',
              Action: 's3:GetObject',
              Resource: `arn:aws:s3:::${bucket}/*`,
            },
          ],
        }),
      }),
    );

    this.logger.log(`Bucket "${bucket}" created with public read policy`, StorageService.name);
  }
}
