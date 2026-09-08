import { StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { DataSource } from 'typeorm';

import { SnakeCaseNamingStrategy } from '@core/database/snake-naming-strategy';

export async function createTestDataSource(
  postgres: StartedPostgreSqlContainer,
): Promise<DataSource> {
  const dataSource = new DataSource({
    type: 'postgres',
    host: postgres.getHost(),
    port: postgres.getPort(),
    username: postgres.getUsername(),
    password: postgres.getPassword(),
    database: postgres.getDatabase(),
    schema: 'public',
    entities: [__dirname + '/../../src/modules/**/entities/*.entity{.ts,.js}'],
    migrations: [__dirname + '/../../src/core/database/migrations/*{.ts,.js}'],
    synchronize: false,
    logging: false,
    namingStrategy: new SnakeCaseNamingStrategy(),
  });

  await dataSource.initialize();
  await dataSource.runMigrations();

  return dataSource;
}
