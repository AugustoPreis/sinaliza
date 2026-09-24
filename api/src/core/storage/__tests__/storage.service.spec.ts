import {
  CreateBucketCommand,
  DeleteObjectCommand,
  HeadBucketCommand,
  NotFound,
  PutBucketPolicyCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { ConfigService } from '@nestjs/config';
import { mockDeep } from 'jest-mock-extended';

import { StorageService } from '../storage.service';

const CONFIG_VALUES: Record<string, unknown> = {
  'storage.bucket': 'my-bucket',
  'storage.publicUrl': 'https://storage.example.com',
  'storage.autoConfigureBucket': false,
};

describe('StorageService', () => {
  let s3: ReturnType<typeof mockDeep<S3Client>>;
  let config: ReturnType<typeof mockDeep<ConfigService>>;
  let service: StorageService;

  beforeEach(() => {
    s3 = mockDeep<S3Client>();
    config = mockDeep<ConfigService>();
    config.get.mockImplementation((key: string) => CONFIG_VALUES[key]);
    service = new StorageService(s3, config);
  });

  describe('upload', () => {
    it('sends a PutObjectCommand with the bucket, key, body and content type', async () => {
      const body = Buffer.from('file contents');

      const url = await service.upload('avatars/user-1.png', body, 'image/png');

      expect(s3.send).toHaveBeenCalledTimes(1);
      const [command] = s3.send.mock.calls[0];
      expect(command).toBeInstanceOf(PutObjectCommand);
      expect((command as PutObjectCommand).input).toEqual({
        Bucket: 'my-bucket',
        Key: 'avatars/user-1.png',
        Body: body,
        ContentType: 'image/png',
      });
      expect(url).toBe('https://storage.example.com/my-bucket/avatars/user-1.png');
    });
  });

  describe('delete', () => {
    it('sends a DeleteObjectCommand with the bucket and key', async () => {
      await service.delete('avatars/user-1.png');

      expect(s3.send).toHaveBeenCalledTimes(1);
      const [command] = s3.send.mock.calls[0];
      expect(command).toBeInstanceOf(DeleteObjectCommand);
      expect((command as DeleteObjectCommand).input).toEqual({
        Bucket: 'my-bucket',
        Key: 'avatars/user-1.png',
      });
    });
  });

  describe('publicUrl', () => {
    it('builds the URL from the configured public URL and bucket', () => {
      expect(service.publicUrl('avatars/user-1.png')).toBe(
        'https://storage.example.com/my-bucket/avatars/user-1.png',
      );
    });
  });

  describe('onModuleInit', () => {
    it('does nothing when auto-configure-bucket is disabled', async () => {
      config.get.mockImplementation((key: string) =>
        key === 'storage.autoConfigureBucket' ? false : CONFIG_VALUES[key],
      );

      await service.onModuleInit();

      expect(s3.send).not.toHaveBeenCalled();
    });

    it('does not recreate the bucket when HeadBucketCommand resolves (bucket already exists)', async () => {
      config.get.mockImplementation((key: string) =>
        key === 'storage.autoConfigureBucket' ? true : CONFIG_VALUES[key],
      );
      s3.send.mockResolvedValueOnce({} as never);

      await service.onModuleInit();

      expect(s3.send).toHaveBeenCalledTimes(1);
      expect(s3.send.mock.calls[0][0]).toBeInstanceOf(HeadBucketCommand);
    });

    it('creates the bucket and applies a public-read policy when HeadBucketCommand rejects with NotFound', async () => {
      config.get.mockImplementation((key: string) =>
        key === 'storage.autoConfigureBucket' ? true : CONFIG_VALUES[key],
      );
      s3.send
        .mockRejectedValueOnce(new NotFound({ message: 'Not Found', $metadata: {} }) as never)
        .mockResolvedValueOnce({} as never)
        .mockResolvedValueOnce({} as never);

      await service.onModuleInit();

      expect(s3.send).toHaveBeenCalledTimes(3);
      expect(s3.send.mock.calls[0][0]).toBeInstanceOf(HeadBucketCommand);
      expect(s3.send.mock.calls[1][0]).toBeInstanceOf(CreateBucketCommand);
      expect((s3.send.mock.calls[1][0] as CreateBucketCommand).input).toEqual({
        Bucket: 'my-bucket',
      });
      const putPolicyCommand = s3.send.mock.calls[2][0] as PutBucketPolicyCommand;
      expect(putPolicyCommand).toBeInstanceOf(PutBucketPolicyCommand);
      expect(putPolicyCommand.input.Bucket).toBe('my-bucket');
      expect(JSON.parse(putPolicyCommand.input.Policy as string)).toEqual({
        Version: '2012-10-17',
        Statement: [
          {
            Effect: 'Allow',
            Principal: '*',
            Action: 's3:GetObject',
            Resource: 'arn:aws:s3:::my-bucket/*',
          },
        ],
      });
    });

    it('propagates the error when HeadBucketCommand rejects with something other than NotFound', async () => {
      config.get.mockImplementation((key: string) =>
        key === 'storage.autoConfigureBucket' ? true : CONFIG_VALUES[key],
      );
      const unexpectedError = new Error('network error');
      s3.send.mockRejectedValueOnce(unexpectedError as never);

      await expect(service.onModuleInit()).rejects.toThrow(unexpectedError);
      expect(s3.send).toHaveBeenCalledTimes(1);
    });
  });
});
