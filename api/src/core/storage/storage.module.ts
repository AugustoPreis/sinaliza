import { S3Client } from '@aws-sdk/client-s3';
import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { S3_CLIENT } from './storage.constants';
import { StorageService } from './storage.service';

const s3ClientProvider = {
  provide: S3_CLIENT,
  inject: [ConfigService],
  useFactory: (config: ConfigService): S3Client =>
    new S3Client({
      endpoint: config.get<string>('storage.endpoint'),
      region: config.get<string>('storage.region'),
      forcePathStyle: config.get<boolean>('storage.forcePathStyle'),
      credentials: {
        accessKeyId: config.get<string>('storage.accessKeyId', ''),
        secretAccessKey: config.get<string>('storage.secretAccessKey', ''),
      },
    }),
};

@Global()
@Module({
  providers: [s3ClientProvider, StorageService],
  exports: [StorageService],
})
export class StorageModule {}
