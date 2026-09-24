import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

import { SnakeCaseNamingStrategy } from './snake-naming-strategy';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get('database.host'),
        port: configService.get('database.port'),
        username: configService.get('database.username'),
        password: configService.get('database.password'),
        database: configService.get('database.name'),
        schema: configService.get('database.schema'),
        entities: [__dirname + '/../../modules/**/entities/*.entity{.ts,.js}'],
        migrations: [__dirname + '/migrations/*{.ts,.js}'],
        synchronize: false,
        logging: configService.get('database.logging'),
        ssl: configService.get('database.ssl') ? { rejectUnauthorized: false } : false,
        namingStrategy: new SnakeCaseNamingStrategy(),
        autoLoadEntities: true,
        extra: {
          max: configService.get<number>('database.poolSize'),
          idleTimeoutMillis: 30000,
        },
      }),
    }),
  ],
  exports: [TypeOrmModule],
})
export class TypeOrmConfigModule {}
