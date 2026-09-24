import { registerAs } from '@nestjs/config';

export default registerAs('storage', () => ({
  endpoint: process.env.S3_ENDPOINT || 'http://localhost:9000',
  publicUrl: process.env.S3_PUBLIC_URL || 'http://localhost:9000',
  region: process.env.S3_REGION || 'us-east-1',
  bucket: process.env.S3_BUCKET || 'sinaliza',
  accessKeyId: process.env.S3_ACCESS_KEY_ID || '',
  secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || '',
  forcePathStyle: process.env.S3_FORCE_PATH_STYLE !== 'false',
  autoConfigureBucket: process.env.S3_AUTO_CONFIGURE_BUCKET === 'true',
}));
