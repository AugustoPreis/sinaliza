import { S3Client } from '@aws-sdk/client-s3';
import { INestApplication, ValidationPipe, VersioningType } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { mockDeep } from 'jest-mock-extended';

import { S3_CLIENT } from '@core/storage/storage.constants';

import { HttpExceptionFilter } from '@shared/filters/http-exception.filter';
import { i18nFieldValidationExceptionFactory } from '@shared/pipes';

import { AppModule } from '../../src/app.module';

export interface IBootstrapTestAppOptions {
  dbHost: string;
  dbPort: number;
  dbUsername: string;
  dbPassword: string;
  dbName: string;
  redisHost: string;
  redisPort: number;
}

// S3 is always mocked here: per the storage strategy (docs/testing.md), e2e
// specs prove the HTTP flow, not the S3 protocol — that's already covered by
// `storage.service.integration-spec.ts` against a real MinIO container.
export async function bootstrapTestApp(
  options: IBootstrapTestAppOptions,
): Promise<INestApplication> {
  process.env.DB_HOST = options.dbHost;
  process.env.DB_PORT = String(options.dbPort);
  process.env.DB_USERNAME = options.dbUsername;
  process.env.DB_PASSWORD = options.dbPassword;
  process.env.DB_NAME = options.dbName;
  process.env.DB_SCHEMA = 'public';
  process.env.REDIS_HOST = options.redisHost;
  process.env.REDIS_PORT = String(options.redisPort);
  process.env.REDIS_PASSWORD = '';

  const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(S3_CLIENT)
    .useValue(mockDeep<S3Client>())
    .compile();

  const app = moduleRef.createNestApplication();

  app.use(helmet());
  app.use(compression());
  app.use(cookieParser());

  app.enableCors({ origin: 'http://localhost:5173', credentials: true });

  app.setGlobalPrefix(process.env.API_PREFIX || 'api');
  app.enableVersioning({ type: VersioningType.URI });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
      exceptionFactory: i18nFieldValidationExceptionFactory,
    }),
  );

  app.useGlobalFilters(new HttpExceptionFilter());

  await app.init();

  return app;
}
