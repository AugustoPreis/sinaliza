import * as path from 'path';

import * as dotenv from 'dotenv';
import { DataSource, DataSourceOptions } from 'typeorm';

import { SnakeCaseNamingStrategy } from './snake-naming-strategy';

dotenv.config({
  path: [path.resolve(process.cwd(), '.env.local'), path.resolve(process.cwd(), '.env')],
});

export const dataSourceOptions: DataSourceOptions = {
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'sinaliza',
  schema: process.env.DB_SCHEMA || 'public',
  entities: [path.join(__dirname, '../../modules/**/entities/*.entity{.ts,.js}')],
  migrations: [path.join(__dirname, './migrations/*{.ts,.js}')],
  synchronize: false,
  logging: process.env.DB_LOGGING === 'true',
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
  namingStrategy: new SnakeCaseNamingStrategy(),
  extra: {
    max: parseInt(process.env.DB_POOL_SIZE || '10', 10),
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
  },
};

export const AppDataSource = new DataSource(dataSourceOptions);
