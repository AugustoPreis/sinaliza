import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { SharedModule } from '@shared/shared.module';

import { UsersModule } from '@modules/users/users.module';

import { DevicesController } from './controllers/devices.controller';
import { NotificationsController } from './controllers/notifications.controller';
import { DeviceTokenEntity } from './entities/device-token.entity';
import { NotificationEntity } from './entities/notification.entity';
import { DeviceTokensRepository } from './repositories/device-tokens.repository';
import { NotificationsRepository } from './repositories/notifications.repository';
import { ListNotificationsUseCase } from './use-cases/list-notifications.use-case';
import { RegisterDeviceTokenUseCase } from './use-cases/register-device-token.use-case';
import { RemoveDeviceTokenUseCase } from './use-cases/remove-device-token.use-case';

// `NotificationsRepository` is exported so ticket status-change/reassign
// flows can call `create()` directly (RB-14), same as `SectorsModule`/
// `LocationsModule` exporting their repositories for cross-module reuse.
@Module({
  imports: [
    SharedModule,
    UsersModule,
    TypeOrmModule.forFeature([NotificationEntity, DeviceTokenEntity]),
  ],
  controllers: [NotificationsController, DevicesController],
  providers: [
    NotificationsRepository,
    DeviceTokensRepository,
    ListNotificationsUseCase,
    RegisterDeviceTokenUseCase,
    RemoveDeviceTokenUseCase,
  ],
  exports: [NotificationsRepository],
})
export class NotificationsModule {}
