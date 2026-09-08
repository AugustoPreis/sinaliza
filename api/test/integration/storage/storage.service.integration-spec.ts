import {
  GetObjectCommand,
  HeadBucketCommand,
  ListBucketsCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { ConfigService } from '@nestjs/config';

import { StorageService } from '@core/storage/storage.service';

import { startContainers, stopContainers, ITestContainers } from '../../support/containers';

describe('StorageService (integration)', () => {
  let containers: ITestContainers;
  let s3: S3Client;
  let storageService: StorageService;
  const bucket = 'test-bucket';

  beforeAll(async () => {
    containers = await startContainers({ minio: true });

    const endpoint = `http://${containers.minio!.getHost()}:${containers.minio!.getMappedPort(9000)}`;

    s3 = new S3Client({
      endpoint,
      region: 'us-east-1',
      forcePathStyle: true,
      credentials: { accessKeyId: 'minioadmin', secretAccessKey: 'minioadmin_test' },
    });

    const configStub = {
      get: <T>(key: string, defaultValue?: T): T => {
        const values: Record<string, unknown> = {
          'storage.bucket': bucket,
          'storage.publicUrl': endpoint,
          'storage.autoConfigureBucket': true,
        };

        return (values[key] ?? defaultValue) as T;
      },
    } as ConfigService;

    storageService = new StorageService(s3, configStub);
  }, 60000);

  afterAll(async () => {
    s3.destroy();
    await stopContainers(containers);
  });

  describe('onModuleInit / ensureBucketExists', () => {
    it('creates the bucket when it does not exist yet', async () => {
      await storageService.onModuleInit();

      const { Buckets } = await s3.send(new ListBucketsCommand({}));

      expect(Buckets?.some((b) => b.Name === bucket)).toBe(true);
      await expect(s3.send(new HeadBucketCommand({ Bucket: bucket }))).resolves.toBeDefined();
    });

    it('is idempotent: calling it again does not throw or fail', async () => {
      await expect(storageService.onModuleInit()).resolves.toBeUndefined();
      await expect(storageService.onModuleInit()).resolves.toBeUndefined();
    });
  });

  describe('upload', () => {
    it('writes the object and it can be read back', async () => {
      await storageService.onModuleInit();

      const key = 'uploads/hello.txt';
      const content = Buffer.from('hello from integration test');

      const url = await storageService.upload(key, content, 'text/plain');

      expect(url).toBe(storageService.publicUrl(key));

      const object = await s3.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
      const body = await object.Body?.transformToString();

      expect(body).toBe(content.toString());
      expect(object.ContentType).toBe('text/plain');
    });
  });

  describe('publicUrl', () => {
    it('builds a URL that is publicly reachable after upload', async () => {
      await storageService.onModuleInit();

      const key = 'uploads/public-file.txt';
      const content = Buffer.from('public content');

      await storageService.upload(key, content, 'text/plain');

      const url = storageService.publicUrl(key);
      const response = await fetch(url);

      expect(response.status).toBe(200);
      expect(await response.text()).toBe(content.toString());
    });
  });

  describe('delete', () => {
    it('removes the object so it is no longer reachable', async () => {
      await storageService.onModuleInit();

      const key = 'uploads/to-delete.txt';
      await storageService.upload(key, Buffer.from('temporary'), 'text/plain');

      await storageService.delete(key);

      await expect(s3.send(new GetObjectCommand({ Bucket: bucket, Key: key }))).rejects.toThrow();

      const response = await fetch(storageService.publicUrl(key));
      expect(response.status).toBe(404);
    });
  });
});
