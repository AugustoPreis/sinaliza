import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { RedisContainer, StartedRedisContainer } from '@testcontainers/redis';
import { GenericContainer, StartedTestContainer, Wait } from 'testcontainers';

export interface ITestContainers {
  postgres: StartedPostgreSqlContainer;
  redis: StartedRedisContainer;
  minio?: StartedTestContainer;
  mailhog?: StartedTestContainer;
}

export interface IStartContainersOptions {
  minio?: boolean;
  mailhog?: boolean;
}

export async function startContainers(
  opts: IStartContainersOptions = {},
): Promise<ITestContainers> {
  const [postgres, redis, minio, mailhog] = await Promise.all([
    new PostgreSqlContainer('postgres:18').start(),
    new RedisContainer('redis:7-alpine').start(),
    opts.minio
      ? new GenericContainer('minio/minio:RELEASE.2025-09-07T16-13-09Z')
          .withCommand(['server', '/data', '--console-address', ':9001'])
          .withEnvironment({
            MINIO_ROOT_USER: 'minioadmin',
            MINIO_ROOT_PASSWORD: 'minioadmin_test',
          })
          .withExposedPorts(9000)
          .withWaitStrategy(Wait.forHttp('/minio/health/live', 9000))
          .start()
      : undefined,
    opts.mailhog
      ? new GenericContainer('mailhog/mailhog:v1.0.1')
          .withExposedPorts(1025, 8025)
          .withWaitStrategy(Wait.forHttp('/api/v2/messages', 8025))
          .start()
      : undefined,
  ]);

  return { postgres, redis, minio, mailhog };
}

export async function stopContainers(containers: ITestContainers): Promise<void> {
  await Promise.all(
    [containers.mailhog, containers.minio, containers.redis, containers.postgres]
      .filter((container): container is StartedTestContainer => container !== undefined)
      .map((container) => container.stop()),
  );
}
